
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { IssueStatus, TimelineEvent } from '@/lib/types';
import { z } from 'zod';

const statusUpdateSchema = z.object({
  status: z.enum(["Pending", "In Progress", "Redirected", "Resolved", "Rejected"]),
  notes: z.string().optional(),
  issueId: z.string().uuid(),
  timeline: z.string(),
});

export async function updateIssueStatus(
    prevState: { success: boolean; error?: string } | null,
    formData: FormData
): Promise<{ success: boolean; error?: string }> {
        
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'You are not authenticated.' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (profile?.role !== 'admin') {
        return { success: false, error: 'You are not authorized to perform this action.' };
    }

    const parseResult = statusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parseResult.success) {
        return { success: false, error: "Invalid form data provided."};
    }

    const { status: newStatus, notes, issueId, timeline: currentTimelineString } = parseResult.data;

    const { data: issueToUpdate } = await supabase
        .from('issues')
        .select('timeline, reportedBy')
        .eq('id', issueId)
        .single();
    
    if (!issueToUpdate) {
        return { success: false, error: "Issue not found." };
    }

    const newTimelineEvent: TimelineEvent = {
        status: newStatus,
        date: new Date().toISOString(),
        notes: notes?.trim() ? notes.trim() : `Status updated to ${newStatus}.`,
    };

    const updatedTimeline = [...(issueToUpdate.timeline || []), newTimelineEvent];

    const { data: issueData, error: updateError } = await supabase
        .from('issues')
        .update({
            status: newStatus,
            timeline: updatedTimeline,
        })
        .eq('id', issueId)
        .select('title, reportedBy')
        .single();

    if (updateError) {
        console.error("Error updating issue status:", updateError);
        return { success: false, error: `Failed to update the issue status in the database: ${updateError.message}` };
    }

     // Create a notification for the user who reported the issue
    if (issueData) {
        const { error: notificationError } = await supabase.from('notifications').insert({
            user_id: issueData.reportedBy,
            title: `Your report status has been updated to "${newStatus}"`,
            description: `Report: ${issueData.title}`,
            link: `/my-reports`,
        });

        if (notificationError) {
            console.error("Error creating notification:", notificationError);
        }
    }

    // Revalidate the paths to ensure the UI updates with the new data.
    revalidatePath(`/admin/issue/${issueId}`);
    revalidatePath('/admin');
    revalidatePath('/my-reports'); // Revalidate user's report page too

    return { success: true };
}

const approveQuoteSchema = z.object({
  issueId: z.string().uuid(),
  quoteId: z.string().uuid(),
  workerId: z.string().uuid(),
});


export async function approveQuote(
    issueId: string,
    quoteId: string,
    workerId: string
): Promise<{ success: boolean; error?: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'You are not authenticated.' };
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return { success: false, error: 'You are not authorized.' };

    const parseResult = approveQuoteSchema.safeParse({ issueId, quoteId, workerId });
    if (!parseResult.success) return { success: false, error: "Invalid data provided." };

    try {
        const { error: transactionError } = await supabase.rpc('approve_quote_and_assign_issue', {
            p_quote_id: quoteId,
            p_issue_id: issueId,
            p_worker_id: workerId,
            p_admin_id: user.id // Pass the admin's ID
        });

        if (transactionError) {
            console.error('Error in approve_quote RPC:', transactionError);
            throw new Error('Failed to approve quote. The database operation failed.');
        }

    } catch (error: any) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/admin/issue/${issueId}`);
    revalidatePath('/admin');
    revalidatePath(`/worker/my-work`);
    
    return { success: true };
}
