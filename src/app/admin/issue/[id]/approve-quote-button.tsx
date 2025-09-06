
'use client'

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { approveQuote } from './actions';
import type { Quote } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ApproveQuoteButton({ issueId, quote }: { issueId: string, quote: Quote }) {
    const { toast } = useToast();
    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleApprove = async () => {
        setIsSubmitting(true);
        const result = await approveQuote(issueId, quote.id, quote.worker_id);

        if (result.success) {
            toast({ title: 'Success!', description: 'Work has been assigned to the worker.' });
            setIsConfirmOpen(false);
        } else if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    };

    return (
        <>
            <Button onClick={() => setIsConfirmOpen(true)} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve
            </Button>
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Assign work to {quote.profiles.full_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will assign the issue to this worker for ₹{quote.price} to be completed in {quote.estimated_days} days. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleApprove} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm & Assign
                            </AlertDialogAction>
                        </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
