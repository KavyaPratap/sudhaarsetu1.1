'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitQuote } from './actions';
import { useRouter } from 'next/navigation';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Submit Quote
    </Button>
  );
}

export default function SubmitQuoteForm({ issueId }: { issueId: string }) {
  const { toast } = useToast();
  const router = useRouter();

  const [state, formAction] = useActionState(submitQuote, null);

  React.useEffect(() => {
    if (state?.success) {
      toast({ title: 'Success', description: 'Your quote has been submitted and is pending approval.' });
      router.push('/worker');
    } else if (state?.error) {
      toast({ variant: 'destructive', title: 'Error', description: state.error });
    }
  }, [state, toast, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="issueId" value={issueId} />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Your Price (₹)</Label>
          <Input id="price" name="price" type="number" placeholder="e.g., 5000" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimated_days">Est. Days</Label>
          <Input id="estimated_days" name="estimated_days" type="number" placeholder="e.g., 3" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="comment">Comment (Optional)</Label>
        <Textarea
          id="comment"
          name="comment"
          placeholder="Add any additional details about your quote..."
        />
      </div>
      <SubmitButton disabled={false} />
    </form>
  );
}
