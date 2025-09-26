
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const submitQuoteSchema = z.object({
  price: z.coerce.number().positive("Price must be a positive number."),
  estimated_days: z.coerce.number().int().positive("Estimated days must be a positive whole number."),
  comment: z.string().optional(),
  issueId: z.string().uuid(),
});

export async function submitQuote(
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
    
    if (profile?.role !== 'worker') {
        return { success: false, error: 'You are not authorized to perform this action.' };
    }

    const parseResult = submitQuoteSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parseResult.success) {
        const firstError = parseResult.error.errors[0]?.message || 'Invalid data provided.';
        return { success: false, error: firstError};
    }

    const { price, estimated_days, comment, issueId } = parseResult.data;

    const { error } = await supabase
        .from('quotes')
        .insert({
            issue_id: issueId,
            worker_id: user.id,
            price,
            estimated_days,
            comment,
            status: 'pending'
        })
    
    if (error) {
        console.error("Error submitting quote:", error);
        if (error.code === '23505') { // unique constraint violation
            return { success: false, error: 'You have already submitted a quote for this issue.' };
        }
        return { success: false, error: `Failed to submit quote: ${error.message}` };
    }

    revalidatePath(`/admin/issue/${issueId}`);
    
    return { success: true };
}

