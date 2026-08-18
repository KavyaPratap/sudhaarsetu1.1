'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import type { TimelineEvent } from '@/lib/types';

type ActionResponse = { success: boolean; error?: string };

const updateWorkSchema = z.object({
  updateText: z.string().min(10, "Update must be at least 10 characters."),
  issueId: z.string(),
});

export async function addWorkUpdate(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'worker') {
    return { success: false, error: 'Authentication required.' };
  }

  const parseResult = updateWorkSchema.safeParse(Object.fromEntries(formData));
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors[0].message };
  }
  const { issueId, updateText } = parseResult.data;

  try {
    const issueRef = adminDb.collection('issues').doc(issueId);
    const issueDoc = await issueRef.get();

    if (!issueDoc.exists) {
      return { success: false, error: 'Issue not found.' };
    }

    const issueData = issueDoc.data()!;
    const currentUpdates = issueData.work_updates || [];

    const newUpdate = {
      update: updateText,
      timestamp: new Date().toISOString(),
    };

    await issueRef.update({
      work_updates: [...currentUpdates, newUpdate],
    });

    revalidatePath(`/worker/my-work/${issueId}`);
    revalidatePath(`/admin/issue/${issueId}`);
    revalidatePath('/my-reports');

    return { success: true };
  } catch (error: any) {
    console.error('Error adding work update:', error);
    return { success: false, error: `Failed to save work update: ${error.message}` };
  }
}

const completeWorkSchema = z.object({
  completionNotes: z.string().optional(),
  completionPhoto: z.any().refine((file) => file?.size > 0, "A completion photo is required."),
  issueId: z.string(),
});

export async function markWorkAsComplete(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'worker') {
    return { success: false, error: 'Authentication required.' };
  }

  const parseResult = completeWorkSchema.safeParse({
    completionNotes: formData.get('completionNotes'),
    completionPhoto: formData.get('completionPhoto'),
    issueId: formData.get('issueId'),
  });

  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors[0].message };
  }

  const { issueId, completionPhoto, completionNotes } = parseResult.data;

  try {
    const bucket = adminStorage.bucket();
    const fileName = `issues/${user.id}/completion/${issueId}-${completionPhoto.name}`;
    const fileBuffer = Buffer.from(await completionPhoto.arrayBuffer());
    const fileRef = bucket.file(fileName);

    await fileRef.save(fileBuffer, {
      contentType: completionPhoto.type || 'image/jpeg',
      metadata: { firebaseStorageDownloadTokens: Date.now().toString() },
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

    const issueRef = adminDb.collection('issues').doc(issueId);
    const issueDoc = await issueRef.get();
    const currentTimeline: TimelineEvent[] = issueDoc.data()?.timeline || [];

    const newTimelineEvent: TimelineEvent = {
      status: 'Work Complete',
      date: new Date().toISOString(),
      notes: completionNotes || 'Work marked as complete by worker.',
    };

    await issueRef.update({
      status: 'Work Complete',
      completion_photo_url: publicUrl,
      completion_notes: completionNotes || '',
      timeline: [...currentTimeline, newTimelineEvent],
    });

    revalidatePath(`/worker/my-work/${issueId}`);
    revalidatePath(`/admin/issue/${issueId}`);
    revalidatePath('/my-reports');

    return { success: true };
  } catch (error: any) {
    console.error('Error completing work:', error);
    return { success: false, error: `Failed to update issue status: ${error.message}` };
  }
}
