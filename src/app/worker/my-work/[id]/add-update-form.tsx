
'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addWorkUpdate } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Post Update
    </Button>
  );
}

type FormState = { success: boolean; error?: string } | null;

export default function AddUpdateForm({ issueId }: { issueId: string }) {
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [state, setState] = React.useState<FormState>(null);

  const handleFormAction = async (formData: FormData) => {
    const result = await addWorkUpdate(null, formData);
    setState(result);

    if (result.success) {
      toast({ title: 'Success', description: 'Your progress update has been posted.' });
      formRef.current?.reset();
    } else if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  };

  return (
    <form ref={formRef} action={handleFormAction} className="space-y-4">
      {state?.error && (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Update Failed</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="issueId" value={issueId} />
      <div className="space-y-2">
        <Label htmlFor="updateText">Update Details</Label>
        <Textarea
          id="updateText"
          name="updateText"
          placeholder="e.g., Materials have been procured. Starting work tomorrow morning."
          required
          rows={3}
        />
      </div>
      <SubmitButton />
    </form>
  );
}
