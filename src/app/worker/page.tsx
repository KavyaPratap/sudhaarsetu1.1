import * as React from 'react';

export const dynamic = 'force-dynamic';
import { adminDb } from '@/lib/firebase/admin';
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
import Image from 'next/image';
import { MapPin, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
};

async function getUnassignedIssues(): Promise<Issue[]> {
  try {
    const snapshot = await adminDb
      .collection('issues')
      .where('status', '==', 'Pending')
      .get();

    const issues: Issue[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.assigned_worker_id) {
        issues.push({
          ...data,
          id: doc.id,
          reportedAt: new Date(data.reportedAt || Date.now()),
        } as unknown as Issue);
      }
    });

    issues.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
    return issues;
  } catch (error) {
    console.error("Error fetching worker issue feed:", error);
    return [];
  }
}

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{issue.title}</CardTitle>
            <CardDescription className="flex items-center text-xs text-muted-foreground gap-1 mt-1">
              <MapPin className="h-3 w-3" /> {issue.address}
            </CardDescription>
          </div>
          <Badge variant="outline" className={statusColors[issue.status] || 'bg-secondary'}>{issue.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative h-40 w-full rounded-lg overflow-hidden bg-secondary">
          {issue.imageUrls?.[0] && <Image src={issue.imageUrls[0]} alt={issue.title} fill className="object-cover" />}
        </div>
        <div className="md:col-span-2 space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-3">{issue.description}</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="font-semibold">Urgency: {issue.urgency_score}/100</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(issue.reportedAt || Date.now()), { addSuffix: true })}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button asChild>
          <Link href={`/worker/issue/${issue.id}`}>
            View and Quote <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default async function WorkerDashboard() {
  const issues = await getUnassignedIssues();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Issue Feed</h1>
        <p className="text-muted-foreground">Find new work opportunities. These are issues that need a quote.</p>
      </div>

      <div className="space-y-4">
        {issues.length > 0 ? (
          issues.map(issue => <IssueCard key={issue.id} issue={issue} />)
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <CardTitle>All Clear!</CardTitle>
            <CardDescription className="mt-2">There are no pending issues that need a quote right now. Check back later.</CardDescription>
          </Card>
        )}
      </div>
    </div>
  );
}
