
import * as React from 'react';
import type { Issue } from '@/lib/types';
import IssueCard from './IssueCard';

interface IssueListProps {
  issues: Issue[];
  onValidate: (issueId: string, newCounts: { upvotes: number, downvotes: number }) => void;
  onSelectIssue: (issueId: string) => void;
}

export default function IssueList({ issues, onValidate, onSelectIssue }: IssueListProps) {
  return (
    <div className="space-y-4">
      {issues.map(issue => (
        <IssueCard key={issue.id} issue={issue} onValidate={onValidate} onSelectIssue={onSelectIssue} />
      ))}
    </div>
  );
}
