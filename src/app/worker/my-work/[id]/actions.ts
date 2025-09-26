
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

type ActionResponse = { success: boolean; error?: string };

const updateWorkSchema = z.object({
  updateText: z.string().min(10, "Update must be at least 10 characters."),
  issueId: z.string().uuid(),
});

export async function addWorkUpdate(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  const parseResult = updateWorkSchema.safeParse(Object.fromEntries(formData));
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors[0].message };
  }
  const { issueId, updateText } = parseResult.data;

  const { error } = await supabase.rpc('add_work_update_as_worker', {
    p_issue_id: issueId,
    p_worker_id: user.id,
    p_update_text: updateText,
  });


  if (error) {
    console.error('Error in RPC add_work_update_as_worker:', error);
    return { success: false, error: `Failed to save work update: ${error.message}` };
  }

  revalidatePath(`/worker/my-work/${issueId}`);
  revalidatePath(`/admin/issue/${issueId}`);
  revalidatePath('/my-reports');

  return { success: true };
}


const completeWorkSchema = z.object({
    completionNotes: z.string().optional(),
    completionPhoto: z.any()
        .refine((file) => file?.size > 0, "A completion photo is required."),
    issueId: z.string().uuid(),
});

export async function markWorkAsComplete(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required.' };

    const parseResult = completeWorkSchema.safeParse({
        completionNotes: formData.get('completionNotes'),
        completionPhoto: formData.get('completionPhoto'),
        issueId: formData.get('issueId'),
    });

    if (!parseResult.success) {
        return { success: false, error: parseResult.error.errors[0].message };
    }

    const { issueId, completionPhoto, completionNotes } = parseResult.data;
    
    // Upload photo to storage first
    const filePath = `${user.id}/completion/${issueId}-${completionPhoto.name}`;
    const { error: uploadError } = await supabase.storage
        .from('issues')
        .upload(filePath, completionPhoto, { upsert: true });
    
    if (uploadError) {
        console.error('Completion photo upload error:', uploadError);
        return { success: false, error: 'Failed to upload completion photo.' };
    }
    
    const { data: urlData } = supabase.storage.from('issues').getPublicUrl(filePath);

    // Call the RPC to update the database
    const { error: rpcError } = await supabase.rpc('complete_work_as_worker', {
        p_issue_id: issueId,
        p_worker_id: user.id,
        p_completion_notes: completionNotes,
        p_completion_photo_url: urlData.publicUrl,
    });
    
    if (rpcError) {
        console.error('Error in RPC complete_work_as_worker:', rpcError);
        // Attempt to delete the just-uploaded photo if the DB update fails, to prevent orphaned files
        await supabase.storage.from('issues').remove([filePath]);
        return { success: false, error: `Failed to update issue status: ${rpcError.message}` };
    }

    revalidatePath(`/worker/my-work/${issueId}`);
    revalidatePath(`/admin/issue/${issueId}`);
    revalidatePath('/my-reports');

    return { success: true };
}
