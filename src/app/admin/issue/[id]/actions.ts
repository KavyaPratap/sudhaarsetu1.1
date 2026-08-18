'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import type { TimelineEvent } from '@/lib/types';

const statusUpdateSchema = z.object({
  status: z.enum(["Pending", "In Progress", "Redirected", "Resolved", "Rejected"]),
  notes: z.string().optional(),
  issueId: z.string(),
  timeline: z.string().optional(),
});

export async function updateIssueStatus(
  prevState: { success: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return { success: false, error: 'You are not authorized to perform this action.' };
  }

  const parseResult = statusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parseResult.success) {
    return { success: false, error: "Invalid form data provided." };
  }

  const { status: newStatus, notes, issueId } = parseResult.data;

  try {
    const issueRef = adminDb.collection('issues').doc(issueId);
    const issueDoc = await issueRef.get();

    if (!issueDoc.exists) {
      return { success: false, error: "Issue not found." };
    }

    const issueData = issueDoc.data()!;
    const currentTimeline: TimelineEvent[] = issueData.timeline || [];

    const newTimelineEvent: TimelineEvent = {
      status: newStatus,
      date: new Date().toISOString(),
      notes: notes?.trim() ? notes.trim() : `Status updated to ${newStatus}.`,
    };

    const updatedTimeline = [...currentTimeline, newTimelineEvent];

    await issueRef.update({
      status: newStatus,
      timeline: updatedTimeline,
    });

    if (issueData.reportedBy) {
      const notificationRef = adminDb.collection('notifications').doc();
      await notificationRef.set({
        id: notificationRef.id,
        user_id: issueData.reportedBy,
        title: `Your report status has been updated to "${newStatus}"`,
        description: `Report: ${issueData.title}`,
        link: `/my-reports`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    revalidatePath(`/admin/issue/${issueId}`);
    revalidatePath('/admin');
    revalidatePath('/my-reports');

    return { success: true };
  } catch (error: any) {
    console.error("Error updating issue status:", error);
    return { success: false, error: `Failed to update issue status: ${error.message}` };
  }
}

const approveQuoteSchema = z.object({
  issueId: z.string(),
  quoteId: z.string(),
  workerId: z.string(),
});

export async function approveQuote(
  issueId: string,
  quoteId: string,
  workerId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return { success: false, error: 'You are not authorized.' };
  }

  const parseResult = approveQuoteSchema.safeParse({ issueId, quoteId, workerId });
  if (!parseResult.success) return { success: false, error: "Invalid data provided." };

  try {
    await adminDb.runTransaction(async (transaction) => {
      const issueRef = adminDb.collection('issues').doc(issueId);
      const quoteRef = adminDb.collection('quotes').doc(quoteId);

      // All READS must be performed BEFORE any WRITES in a Firestore transaction
      const issueDoc = await transaction.get(issueRef);

      const otherQuotesSnapshot = await adminDb
        .collection('quotes')
        .where('issue_id', '==', issueId)
        .get();

      // All WRITES performed after reads
      transaction.update(quoteRef, { status: 'approved' });

      otherQuotesSnapshot.forEach((doc) => {
        if (doc.id !== quoteId) {
          transaction.update(doc.ref, { status: 'rejected' });
        }
      });

      const currentTimeline: TimelineEvent[] = issueDoc.data()?.timeline || [];
      const newTimelineEvent: TimelineEvent = {
        status: 'In Progress',
        date: new Date().toISOString(),
        notes: 'Quote approved. Work assigned to worker.',
      };

      transaction.update(issueRef, {
        status: 'In Progress',
        assigned_worker_id: workerId,
        winning_quote_id: quoteId,
        timeline: [...currentTimeline, newTimelineEvent],
      });
    });

    revalidatePath(`/admin/issue/${issueId}`);
    revalidatePath('/admin');
    revalidatePath('/worker/my-work');

    return { success: true };
  } catch (error: any) {
    console.error('Error approving quote:', error);
    return { success: false, error: error.message };
  }
}
