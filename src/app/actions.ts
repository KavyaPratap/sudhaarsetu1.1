'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import { filterFalseComplaints } from '@/ai/flows/filter-false-complaints';
import { calculateUrgencyScore } from '@/ai/flows/calculate-urgency-score';
import { analyzeIssue } from '@/ai/flows/analyze-issue';
import type { Issue } from '@/lib/types';

const issueSchema = z.object({
  title: z.string().min(5, { message: 'Title is too short.' }),
  description: z.string().min(10, { message: 'Description is too short.' }),
  category: z.string({
    required_error: "Please select a category.",
  }).min(1, { message: "Please select a category." }),
  photos: z.any(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  summary: z.string().optional(),
  reportAnyway: z.string().optional().nullable(),
});

type ActionResponse =
  | { success: true; issue: Issue; isDuplicate?: boolean }
  | { success: false; error: string; nearbyIssues?: { id: string; title: string; status: string }[] };

const categoryToDept: Record<string, string> = {
  Water: 'Nagar Nigam',
  Electricity: 'JBVNL',
  Roads: 'PWD',
  Waste: 'Nagar Nigam',
  Other: 'Nagar Nigam',
};

async function fileToDataUri(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = file.type.startsWith('image/') ? file.type : 'image/png';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function findNearbyIssues(lat: number, lng: number, radiusMeters: number = 100) {
  try {
    const snapshot = await adminDb.collection('issues').get();
    const nearby: { id: string; title: string; status: string }[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number') {
        const dist = getDistanceMeters(lat, lng, data.location.lat, data.location.lng);
        if (dist <= radiusMeters) {
          nearby.push({
            id: doc.id,
            title: data.title || 'Untitled Issue',
            status: data.status || 'Pending',
          });
        }
      }
    });
    return nearby;
  } catch (error) {
    console.error('Error finding nearby issues:', error);
    return [];
  }
}

export async function submitIssue(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to submit an issue.' };
  }

  const photoFiles = formData.getAll('photos').filter((p) => p instanceof File && p.size > 0) as File[];

  if (photoFiles.length === 0) {
    return { success: false, error: 'At least one photo is required.' };
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description'),
    category: formData.get('category'),
    photos: photoFiles,
    latitude: formData.get('latitude'),
    longitude: formData.get('longitude'),
    summary: formData.get('summary'),
    reportAnyway: formData.get('reportAnyway'),
  };

  const parseResult = issueSchema.safeParse(rawData);

  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0]?.message || 'Invalid data provided. Please check the form.';
    return { success: false, error: firstError };
  }

  const { title, description, category, photos, latitude, longitude, summary, reportAnyway } = parseResult.data;

  try {
    // Step 1: AI validation
    const photosDataUriForValidation = await Promise.all(photos.map(fileToDataUri));
    const aiValidationResult = await filterFalseComplaints({
      photosDataUri: photosDataUriForValidation,
      description,
      historicalData: 'No historical data available for this area.',
    });

    if (!aiValidationResult.isValidComplaint) {
      return {
        success: false,
        error: `AI rejected complaint: ${aiValidationResult.reason}`,
      };
    }

    // Step 2: Duplicate check
    if (!reportAnyway) {
      const nearbyIssues = await findNearbyIssues(latitude, longitude, 100);
      if (nearbyIssues.length > 0) {
        return {
          success: false,
          error: 'A similar issue has already been reported nearby.',
          nearbyIssues,
        };
      }
    }

    // Step 3: Upload images to Firebase Storage
    const imageUrls: string[] = [];
    const bucket = adminStorage.bucket();

    for (const photo of photos) {
      const fileName = `issues/${user.id}/${Date.now()}-${photo.name}`;
      const fileBuffer = Buffer.from(await photo.arrayBuffer());
      const fileRef = bucket.file(fileName);

      await fileRef.save(fileBuffer, {
        contentType: photo.type || 'image/jpeg',
        metadata: { firebaseStorageDownloadTokens: Date.now().toString() },
      });

      // Construct public download URL
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
      imageUrls.push(publicUrl);
    }

    // Step 4: Calculate urgency score
    const urgencyResult = await calculateUrgencyScore({
      description,
      photosDataUri: photosDataUriForValidation,
      upvotes: 1,
      downvotes: 0,
      userFrustration: 3,
      userUrgency: 3,
    });

    const reportedAt = new Date();
    const issueRef = adminDb.collection('issues').doc();

    const newIssueData = {
      id: issueRef.id,
      title,
      summary: summary || description.substring(0, 150),
      description,
      category,
      status: 'Pending',
      upvotes: 1,
      downvotes: 0,
      urgency_score: urgencyResult.urgencyScore,
      location: { lat: latitude, lng: longitude },
      address: `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      imageUrls,
      reportedBy: user.id,
      reportedAt: reportedAt.toISOString(),
      department: categoryToDept[category] || 'Nagar Nigam',
      timeline: [{ status: 'Pending', date: reportedAt.toISOString(), notes: 'Issue reported by citizen.' }],
    };

    await issueRef.set(newIssueData);

    // Initial upvote record
    await adminDb.collection('issues').doc(issueRef.id).collection('votes').doc(user.id).set({
      user_id: user.id,
      vote_type: 'upvote',
      timestamp: new Date().toISOString(),
    });

    revalidatePath('/', 'layout');
    revalidatePath('/my-reports');

    const finalIssue = {
      ...newIssueData,
      comments: [],
      ratings: [],
      reportedAt,
    };

    return { success: true, issue: finalIssue as unknown as Issue };
  } catch (error) {
    console.error('Error submitting issue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    return { success: false, error: errorMessage };
  }
}

export async function upvoteExistingIssue(issueId: string): Promise<{ success: boolean; error?: string; issue?: Issue }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to vote.' };
  }

  await updateVote(issueId, 'upvote');
  const doc = await adminDb.collection('issues').doc(issueId).get();

  if (!doc.exists) {
    return { success: false, error: 'Could not retrieve the existing issue after upvoting.' };
  }

  const existingIssue = doc.data()!;
  revalidatePath('/', 'layout');

  return {
    success: true,
    issue: {
      ...existingIssue,
      reportedAt: new Date(existingIssue.reportedAt),
    } as unknown as Issue,
  };
}

export async function addComment(issueId: string, content: string): Promise<{ success: boolean; error?: string; comment?: any }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to comment.' };
  }

  if (!content || content.trim().length === 0) {
    return { success: false, error: 'Comment cannot be empty.' };
  }

  const userDoc = await adminDb.collection('users').doc(user.id).get();
  const profile = userDoc.exists ? userDoc.data() : null;

  const commentRef = adminDb.collection('issues').doc(issueId).collection('comments').doc();
  const now = new Date();

  const commentData = {
    id: commentRef.id,
    issue_id: issueId,
    user_id: user.id,
    content: content.trim(),
    created_at: now.toISOString(),
  };

  await commentRef.set(commentData);

  const formattedComment = {
    id: commentRef.id,
    author: profile?.full_name || user.full_name || 'Anonymous',
    avatar: profile?.avatar_url || '',
    text: commentData.content,
    timestamp: now,
    user_id: commentData.user_id,
  };

  return { success: true, comment: formattedComment };
}

export async function updateVote(
  issueId: string,
  type: 'upvote' | 'downvote'
): Promise<{ success: boolean; data?: { new_upvotes: number; new_downvotes: number }; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to vote.' };
  }

  try {
    const issueRef = adminDb.collection('issues').doc(issueId);
    const voteRef = issueRef.collection('votes').doc(user.id);

    const result = await adminDb.runTransaction(async (transaction) => {
      const issueDoc = await transaction.get(issueRef);
      if (!issueDoc.exists) throw new Error('Issue not found.');

      const voteDoc = await transaction.get(voteRef);
      const data = issueDoc.data()!;
      let upvotes = data.upvotes || 0;
      let downvotes = data.downvotes || 0;

      if (voteDoc.exists) {
        const existingVote = voteDoc.data()!.vote_type;
        if (existingVote === type) {
          throw new Error('You have already voted on this issue.');
        }
        if (existingVote === 'upvote' && type === 'downvote') {
          upvotes = Math.max(0, upvotes - 1);
          downvotes += 1;
        } else if (existingVote === 'downvote' && type === 'upvote') {
          downvotes = Math.max(0, downvotes - 1);
          upvotes += 1;
        }
      } else {
        if (type === 'upvote') upvotes += 1;
        if (type === 'downvote') downvotes += 1;
      }

      transaction.update(issueRef, { upvotes, downvotes });
      transaction.set(voteRef, { user_id: user.id, vote_type: type, updated_at: new Date().toISOString() });

      return { new_upvotes: upvotes, new_downvotes: downvotes };
    });

    revalidatePath('/', 'layout');
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record vote.';
    return { success: false, error: message };
  }
}

export async function deleteIssue(issueId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to delete issues.' };
  }

  const docRef = adminDb.collection('issues').doc(issueId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return { success: false, error: 'Could not find the issue to delete.' };
  }

  const issue = doc.data()!;
  if (issue.reportedBy !== user.id) {
    return { success: false, error: 'You are not authorized to delete this issue.' };
  }

  await docRef.delete();

  revalidatePath('/', 'layout');
  revalidatePath('/my-reports');

  return { success: true };
}

export async function markNotificationAsRead(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Authentication error' };
  }

  await adminDb.collection('notifications').doc(notificationId).update({ is_read: true });

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function checkForNearbyIssues(
  latitude: number,
  longitude: number
): Promise<{ nearbyIssues: { id: string; title: string; status: string }[] | null; error?: string }> {
  try {
    const nearbyIssues = await findNearbyIssues(latitude, longitude, 100);
    return { nearbyIssues };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred.';
    return { nearbyIssues: null, error: errorMessage };
  }
}

export async function runIssueAnalysis(
  language: string,
  spokenDescription?: string,
  photoDataUri?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const result = await analyzeIssue({ spokenDescription, language, photoDataUri });
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error running AI analysis:', error);
    let message = error instanceof Error ? error.message : 'An unknown error occurred during analysis.';
    if (message.includes('Unable to authenticate your request') || message.includes('GoogleAuthError')) {
      message = 'Vertex AI authentication required. Please set FIREBASE_PRIVATE_KEY or GCP_PRIVATE_KEY in your Vercel Environment Variables.';
    }
    return { success: false, error: message };
  }
}

const ratingSchema = z.object({
  comment: z.string().optional(),
});

export async function submitRating(
  issueId: string,
  workerId: string,
  rating: number,
  prevState: { success: boolean; error: string | null },
  formData: FormData
): Promise<{ success: boolean; error: string | null }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to rate.' };
  }

  if (rating === 0) {
    return { success: false, error: 'Please select a star rating.' };
  }

  const userDoc = await adminDb.collection('users').doc(user.id).get();
  if (!userDoc.exists) {
    return { success: false, error: 'Could not find your profile.' };
  }
  const profile = userDoc.data()!;

  const parseResult = ratingSchema.safeParse(Object.fromEntries(formData));
  if (!parseResult.success) {
    return { success: false, error: 'Invalid comment format.' };
  }
  const { comment } = parseResult.data;

  const ratingRef = adminDb.collection('ratings').doc(`${issueId}_${user.id}`);
  const existingRating = await ratingRef.get();
  if (existingRating.exists) {
    return { success: false, error: 'You have already rated this work.' };
  }

  await ratingRef.set({
    id: ratingRef.id,
    issue_id: issueId,
    worker_id: workerId,
    rated_by_user_id: user.id,
    rating,
    comment: comment || '',
    rater_role: profile.role || 'citizen',
    created_at: new Date().toISOString(),
  });

  revalidatePath(`/admin/issue/${issueId}`);
  revalidatePath(`/my-reports`);

  return { success: true, error: null };
}