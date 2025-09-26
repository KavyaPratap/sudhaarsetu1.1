
'use client';

import * as React from 'react';
import { useFormState } from 'react-dom';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateIssueStatus } from './actions';
import type { Issue, IssueStatus } from '@/lib/types';

function SubmitButton({disabled}: {disabled: boolean}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Update Status
    </Button>
  );
}

export default function UpdateStatusForm({ issue }: { issue: Issue }) {
  const { toast } = useToast();
  const [newStatus, setNewStatus] = React.useState<IssueStatus>(issue.status);

  const [state, formAction] = useFormState(updateIssueStatus, null);

  React.useEffect(() => {
    if (state?.success) {
      toast({ title: 'Success', description: 'Issue status has been updated.' });
    } else if (state?.error) {
      toast({ variant: 'destructive', title: 'Error', description: state.error });
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="issueId" value={issue.id} />
      <input type="hidden" name="timeline" value={JSON.stringify(issue.timeline || [])} />
      <div>
        <Label htmlFor="status">New Status</Label>
        <Select name="status" value={newStatus} onValueChange={(value) => setNewStatus(value as IssueStatus)}>
          <SelectTrigger id="status">
            <SelectValue placeholder="Select a status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Work Complete">Work Complete</SelectItem>
            <SelectItem value="Redirected">Redirected</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="e.g., Team dispatched to location. Expected resolution in 24 hours."
        />
      </div>
      <SubmitButton disabled={newStatus === issue.status} />
    </form>
  );
}
