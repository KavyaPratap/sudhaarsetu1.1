'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server-auth';

const submitQuoteSchema = z.object({
  price: z.coerce.number().positive("Price must be a positive number."),
  estimated_days: z.coerce.number().int().positive("Estimated days must be a positive whole number."),
  comment: z.string().optional(),
  issueId: z.string(),
});

export async function submitQuote(
  prevState: { success: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'worker') {
    return { success: false, error: 'You are not authorized to perform this action.' };
  }

  const parseResult = submitQuoteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0]?.message || 'Invalid data provided.';
    return { success: false, error: firstError };
  }

  const { price, estimated_days, comment, issueId } = parseResult.data;

  try {
    const quoteRef = adminDb.collection('quotes').doc(`${issueId}_${user.id}`);
    const existingQuote = await quoteRef.get();

    if (existingQuote.exists) {
      return { success: false, error: 'You have already submitted a quote for this issue.' };
    }

    await quoteRef.set({
      id: quoteRef.id,
      issue_id: issueId,
      worker_id: user.id,
      price,
      estimated_days,
      comment: comment || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    revalidatePath(`/admin/issue/${issueId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting quote:", error);
    return { success: false, error: `Failed to submit quote: ${error.message}` };
  }
}
