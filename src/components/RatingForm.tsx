
'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Issue } from '@/lib/types';
import { submitRating } from '@/app/actions';
import { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Submit Rating
    </Button>
  );
}

interface RatingFormProps {
  issue: Issue;
  user: User;
}

export default function RatingForm({ issue, user }: RatingFormProps) {
  const { toast } = useToast();
  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);

  const initialState = { success: false, error: null };
  const submitRatingWithParams = submitRating.bind(null, issue.id, issue.assigned_worker_id!, rating);
  const [state, formAction] = useActionState(submitRatingWithParams, initialState);


  React.useEffect(() => {
    if (state.success) {
      toast({ title: 'Success', description: 'Thank you for your feedback!' });
    } else if (state.error) {
      toast({ variant: 'destructive', title: 'Error', description: state.error });
    }
  }, [state, toast]);

  if (!issue.assigned_worker_id) return null;

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <div>
        <Label>Rating</Label>
        <div className="flex items-center gap-1 mt-2">
          {[...Array(5)].map((_, index) => {
            const starValue = index + 1;
            return (
              <Star
                key={starValue}
                className={cn(
                  'h-8 w-8 cursor-pointer transition-colors',
                  starValue <= (hoverRating || rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-muted-foreground/50'
                )}
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
              />
            );
          })}
        </div>
      </div>
      <div>
        <Label htmlFor="comment">Comment (Optional)</Label>
        <Textarea
          id="comment"
          name="comment"
          placeholder="Add any comments about the quality of the work..."
        />
      </div>
      <SubmitButton />
    </form>
  );
}
