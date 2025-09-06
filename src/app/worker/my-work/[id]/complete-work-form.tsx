
'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { markWorkAsComplete } from './actions';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Mark as Complete
    </Button>
  );
}

type FormState = { success: boolean; error?: string } | null;

export default function CompleteWorkForm({ issueId }: { issueId: string }) {
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [state, setState] = React.useState<FormState>(null);

  const handleFormAction = async (formData: FormData) => {
    const result = await markWorkAsComplete(null, formData);
    setState(result);

    if (result.success) {
      toast({ title: 'Success!', description: 'Work marked as complete. Awaiting review.' });
      formRef.current?.reset();
      setPhotoPreview(null);
    } else if (result.error) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: result.error });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
        setPhotoPreview(null);
    }
  };

  return (
    <form ref={formRef} action={handleFormAction} className="space-y-4">
      {state?.error && (
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Submission Failed</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="issueId" value={issueId} />
      
      <div className="space-y-2">
        <Label htmlFor="completionPhoto">Completion Photo</Label>
        <Input
          id="completionPhoto"
          name="completionPhoto"
          type="file"
          accept="image/*"
          required
          onChange={handlePhotoChange}
        />
        {photoPreview && (
            <div className="mt-2 relative w-full aspect-video rounded-md overflow-hidden border">
                <Image src={photoPreview} alt="Completion preview" fill className="object-cover" data-ai-hint="completed work" />
            </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="completionNotes">Notes (Optional)</Label>
        <Textarea
          id="completionNotes"
          name="completionNotes"
          placeholder="Add any final notes about the completed work."
          rows={3}
        />
      </div>
      <SubmitButton />
    </form>
  );
}
