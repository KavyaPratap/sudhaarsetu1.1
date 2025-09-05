
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { IssueStatus, TimelineEvent } from '@/lib/types';

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

    const newStatus = formData.get('status') as IssueStatus;
    const notes = formData.get('notes') as string | null;
    const issueId = formData.get('issueId') as string;
    const currentTimelineString = formData.get('timeline') as string;

    if (!newStatus || !issueId || !currentTimelineString) {
        return { success: false, error: "Missing required form data."};
    }
    
    let currentTimeline: TimelineEvent[] = [];
    try {
        currentTimeline = JSON.parse(currentTimelineString);
        if (!Array.isArray(currentTimeline)) {
            currentTimeline = [];
        }
    } catch (e) {
        console.error("Error parsing timeline, starting fresh.", e);
        currentTimeline = [];
    }

    const newTimelineEvent: TimelineEvent = {
        status: newStatus,
        date: new Date().toISOString(),
        notes: notes?.trim() ? notes.trim() : `Status updated to ${newStatus}.`,
    };

    const updatedTimeline = [...currentTimeline, newTimelineEvent];

    const { data: issueData, error: updateError } = await supabase
        .from('issues')
        .update({
            status: newStatus,
            timeline: updatedTimeline,
        })
        .eq('id', issueId)
        .select()
        .single();

    if (updateError) {
        console.error("Error updating issue status:", updateError);
        return { success: false, error: `Failed to update the issue status in the database: ${updateError.message}` };
    }

     // Create a notification for the user who reported the issue
    if (issueData) {
        await supabase.from('notifications').insert({
            user_id: issueData.reportedBy,
            title: `Your report status has been updated to "${newStatus}"`,
            description: issueData.title,
            link: `/my-reports`,
        });
    }

    // Revalidate the paths to ensure the UI updates with the new data.
    revalidatePath(`/admin/issue/${issueId}`);
    revalidatePath('/admin');
    revalidatePath('/my-reports'); // Revalidate user's report page too

    return { success: true };
}
