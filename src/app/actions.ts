
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { filterFalseComplaints } from '@/ai/flows/filter-false-complaints';
import { calculateUrgencyScore } from '@/ai/flows/calculate-urgency-score';
import type { Issue } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { analyzeIssue } from '@/ai/flows/analyze-issue';

const issueSchema = z.object({
  title: z.string().min(5, { message: 'Title is too short.' }),
  description: z.string().min(10, { message: 'Description is too short.' }),
  category: z.enum(['Water', 'Electricity', 'Roads', 'Waste', 'Other']),
  photos: z.any(), // Validation will be handled separately
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  summary: z.string().optional(),
});


type ActionResponse =
  | { success: true; issue: Issue, isDuplicate?: boolean }
  | { success: false; error: string };

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

export async function submitIssue(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to submit an issue.' };
  }
  
  const photoFiles = formData.getAll('photos').filter(p => p instanceof File && p.size > 0) as File[];

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
    userFrustration: formData.get('userFrustration'),
    userUrgency: formData.get('userUrgency'),
    peopleAffected: formData.get('peopleAffected'),
    duration: formData.get('duration'),
    userFeedback: formData.get('userFeedback'),
  };

  const parseResult = issueSchema.safeParse(rawData);

  if (!parseResult.success) {
    console.error('Validation Errors:', parseResult.error.flatten().fieldErrors);
    const firstError = parseResult.error.errors[0]?.message || 'Invalid data provided. Please check the form.';
    return { success: false, error: firstError };
  }

  const { title, description, category, photos, latitude, longitude, summary } = parseResult.data;

  try {
     // Check for nearby issues again right before submission
    const { data: nearbyIssues } = await supabase
        .rpc('find_nearby_issues', { lat: latitude, lng: longitude, radius_meters: 100 });
        
    if (nearbyIssues && nearbyIssues.length > 0) {
        // This is a duplicate submission. Instead of creating a new issue, upvote the most recent existing one.
        const mostRecentIssueId = nearbyIssues[0].id;
        await updateVote(mostRecentIssueId, 'upvote');
        
        const { data: existingIssue, error: fetchError } = await supabase
            .from('issues')
            .select('*')
            .eq('id', mostRecentIssueId)
            .single();

        if (fetchError || !existingIssue) {
             return { success: false, error: "Could not retrieve the existing issue after upvoting." };
        }
        
        revalidatePath('/', 'layout');

        return {
            success: true,
            issue: {
                ...existingIssue,
                location: { lat: latitude, lng: longitude },
                reportedAt: new Date(existingIssue.reportedAt),
                comments: [],
                ratings: [],
            } as Issue,
            isDuplicate: true,
        };
    }
    
    // 1. AI Validation (using all photos)
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
    
    // 2. Upload images to Supabase Storage
    const imageUrls: string[] = [];
    for (const photo of photos) {
        const fileName = `${user.id}/${Date.now()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
            .from('issues')
            .upload(fileName, photo);

        if (uploadError) {
            console.error('Storage Upload Error:', uploadError);
            throw new Error('Could not upload issue image.');
        }

        const { data: urlData } = supabase.storage
            .from('issues')
            .getPublicUrl(fileName);
            
        imageUrls.push(urlData.publicUrl);
    }
    
    // 3. Calculate initial urgency score
    const photosDataUriForUrgency = await Promise.all(photos.map(fileToDataUri));
    const urgencyResult = await calculateUrgencyScore({
        description,
        photosDataUri: photosDataUriForUrgency,
        upvotes: 1, // Start with 1 for the reporter
        downvotes: 0,
        userFrustration: 3,
        userUrgency: 3,
    });

    const reportedAt = new Date();

    // 4. Create the new issue object
    const newIssueData = {
      title,
      summary: summary || description.substring(0, 150), // Fallback summary
      description,
      category,
      status: 'Pending',
      upvotes: 1, // Start with one upvote from the reporter
      urgency_score: urgencyResult.urgencyScore,
      location: `POINT(${longitude} ${latitude})`,
      address: `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      imageUrls: imageUrls,
      reportedBy: user.id, 
      reportedAt: reportedAt.toISOString(),
      department: categoryToDept[category],
      timeline: [{ status: 'Pending', date: reportedAt.toISOString(), notes: "Issue reported by citizen." }],
    };

    // 5. Insert the new issue into the database
    const { data: insertedIssue, error: insertError } = await supabase
        .from('issues')
        .insert(newIssueData)
        .select()
        .single();

    if (insertError) {
        console.error('Database Insert Error:', insertError);
        throw new Error(`Could not save the issue to the database: ${insertError.message}`);
    }

    // 6. Record the initial upvote from the reporter
    await supabase.from('votes').insert({
      issue_id: insertedIssue.id,
      user_id: user.id,
      vote_type: 'upvote',
    });

    revalidatePath('/', 'layout');
    revalidatePath('/my-reports');

    const finalIssue = {
        ...insertedIssue,
        location: { lat: latitude, lng: longitude },
        comments: [],
        ratings: [],
        upvotes: 1,
        downvotes: 0,
        reportedAt: new Date(insertedIssue.reportedAt),
    }

    return { success: true, issue: finalIssue as Issue};

  } catch (error) {
    console.error('Error submitting issue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    return { success: false, error: errorMessage };
  }
}


export async function addComment(issueId: string, content: string): Promise<{ success: boolean, error?: string, comment?: any }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'You must be logged in to comment.' };
    }

    if (!content || content.trim().length === 0) {
        return { success: false, error: 'Comment cannot be empty.' };
    }

    const { data: commentData, error } = await supabase
        .from('comments')
        .insert({
            issue_id: issueId,
            user_id: user.id,
            content: content.trim(),
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding comment:', error);
        return { success: false, error: 'Failed to add comment.' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
    
    const formattedComment = {
        id: commentData.id,
        author: profile?.full_name || 'Anonymous',
        avatar: profile?.avatar_url || '',
        text: commentData.content,
        timestamp: new Date(commentData.created_at),
        user_id: commentData.user_id,
    };


    return { success: true, comment: formattedComment };
}


export async function updateVote(issueId: string, type: 'upvote' | 'downvote'): Promise<{ success: boolean, data?: { new_upvotes: number, new_downvotes: number}, error?: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'You must be logged in to vote.' };
    }
    
    const { data, error } = await supabase.rpc('handle_vote', {
        issue_id_param: issueId,
        user_id_param: user.id,
        vote_type_param: type
    }).single();


    if (error) {
        console.error('Error updating vote:', error);
        if (error.message.includes('unique_user_issue_vote')) {
            return { success: false, error: 'You have already voted on this issue.' };
        }
        return { success: false, error: 'Failed to record vote.' };
    }
    
    revalidatePath('/', 'layout');

    return { success: true, data };
}


export async function deleteIssue(issueId: string): Promise<{ success: boolean; error?: string }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to delete issues.' };
  }

  const { data: issue, error: fetchError } = await supabase
    .from('issues')
    .select('reportedBy, imageUrls')
    .eq('id', issueId)
    .single();

  if (fetchError || !issue) {
    return { success: false, error: 'Could not find the issue to delete.' };
  }

  if (issue.reportedBy !== user.id) {
    return { success: false, error: 'You are not authorized to delete this issue.' };
  }

  if (issue.imageUrls && issue.imageUrls.length > 0) {
    const filePaths = issue.imageUrls.map(url => {
      const parts = url.split('/');
      return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    });
    
    const { error: storageError } = await supabase.storage.from('issues').remove(filePaths);
    
    if (storageError) {
      console.error('Error deleting issue images from storage:', storageError);
    }
  }


  const { error: deleteError } = await supabase.from('issues').delete().eq('id', issueId);

  if (deleteError) {
    console.error('Error deleting issue:', deleteError);
    return { success: false, error: 'Failed to delete the issue.' };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/my-reports');

  return { success: true };
}

export async function markNotificationAsRead(notificationId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Authentication error' };
    }

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);
    
    if (error) {
        return { success: false, error: 'Database error' };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}


// New action to check for nearby issues
export async function checkForNearbyIssues(latitude: number, longitude: number): Promise<{ nearbyIssues: {id: string, title: string, status: string }[] | null, error?: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    try {
        const { data, error } = await supabase
            .rpc('find_nearby_issues', { lat: latitude, lng: longitude, radius_meters: 100 });

        if (error) {
            console.error('Error checking for nearby issues:', error);
            return { nearbyIssues: null, error: "Could not check for duplicates." };
        }

        return { nearbyIssues: data };
    } catch(e) {
        console.error('RPC Error:', e);
        const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred.';
        return { nearbyIssues: null, error: errorMessage };
    }
}


export async function runIssueAnalysis(
  spokenDescription: string,
  language: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const result = await analyzeIssue({ spokenDescription, language });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error running AI analysis:', error);
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred during analysis.';
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
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to rate.' };
  }
  
  if (rating === 0) {
      return { success: false, error: 'Please select a star rating.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile) {
    return { success: false, error: 'Could not find your profile.' };
  }

  const parseResult = ratingSchema.safeParse(Object.fromEntries(formData));
  if (!parseResult.success) {
      return { success: false, error: 'Invalid comment format.' };
  }
  const { comment } = parseResult.data;

  const { error } = await supabase.from('ratings').insert({
    issue_id: issueId,
    worker_id: workerId,
    rated_by_user_id: user.id,
    rating,
    comment,
    rater_role: profile.role,
  });

  if (error) {
      console.error('Error submitting rating:', error);
      if (error.code === '23505') { // unique constraint violation
        return { success: false, error: 'You have already rated this work.' };
      }
      return { success: false, error: `Database error: ${error.message}` };
  }

  revalidatePath(`/admin/issue/${issueId}`);
  revalidatePath(`/my-reports`);
  
  return { success: true, error: null };
}
