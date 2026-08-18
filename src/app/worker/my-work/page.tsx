import * as React from 'react';

export const dynamic = 'force-dynamic';
import { adminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import type { Issue } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  'In Progress': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  'Work Complete': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  Resolved: 'bg-green-500/20 text-green-700 border-green-500/30',
};

async function getAssignedIssues(userId: string) {
  try {
    const snapshot = await adminDb
      .collection('issues')
      .where('assigned_worker_id', '==', userId)
      .get();

    const issues: any[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      let winningQuote = null;
      if (data.winning_quote_id) {
        const qDoc = await adminDb.collection('quotes').doc(data.winning_quote_id).get();
        if (qDoc.exists) winningQuote = qDoc.data();
      }

      issues.push({
        ...data,
        id: docSnap.id,
        quotes: winningQuote,
        reportedAt: new Date(data.reportedAt || Date.now()),
      });
    }

    issues.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
    return issues;
  } catch (error) {
    console.error("Error fetching assigned issues:", error);
    return [];
  }
}

function AssignedIssueCard({ issue }: { issue: any }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <CardTitle>{issue.title}</CardTitle>
            <CardDescription className="flex items-center text-xs text-muted-foreground gap-1 mt-1">
              <MapPin className="h-3 w-3" /> {issue.address}
            </CardDescription>
          </div>
          <Badge variant="outline" className={statusColors[issue.status] || 'bg-secondary'}>{issue.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {issue.quotes && (
          <div className="flex justify-between items-center text-sm font-semibold p-3 bg-secondary rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600"/>
              <span>Your Quote: ₹{issue.quotes.price}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600"/>
              <span>Est. {issue.quotes.estimated_days} days</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href={`/worker/my-work/${issue.id}`}>
            Update Status <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default async function MyWorkPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const issues = await getAssignedIssues(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Work</h1>
        <p className="text-muted-foreground">A list of all issues assigned to you.</p>
      </div>

      <div className="space-y-4">
        {issues.length > 0 ? (
          issues.map(issue => <AssignedIssueCard key={issue.id} issue={issue} />)
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <CardTitle>No Assigned Work</CardTitle>
            <CardDescription className="mt-2">You have not been assigned any issues yet. Go to the feed to quote on new jobs.</CardDescription>
            <Button asChild className="mt-4">
              <Link href="/worker">Find Work</Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
