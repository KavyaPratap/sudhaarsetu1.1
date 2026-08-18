'use client';

import * as React from 'react';
import type { Issue, Rating, UserProfile } from '@/lib/types';
import { Loader2, Inbox, ArrowRight, CheckCircle2, Building, Star } from 'lucide-react';
import Header from '@/components/Header';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import BottomNavBar from '@/components/BottomNavBar';
import { useI18n } from '@/context/i18n-context';
import RatingForm from '@/components/RatingForm';

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  'In Progress': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  'Work Complete': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  Resolved: 'bg-green-500/20 text-green-700 border-green-500/30',
  Rejected: 'bg-red-500/20 text-red-700 border-red-500/30',
  Redirected: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
};

const TimelineEvent = ({ event, isLast }: { event: { status: string; date: string; notes?: string }, isLast: boolean }) => (
  <div className="relative pl-8">
    {!isLast && <div className="absolute left-[11px] top-5 h-full w-0.5 bg-border" />}
    <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
       <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
    </div>
    <div className="flex flex-col">
      <span className="font-semibold">{event.status}</span>
      <span className="text-xs text-muted-foreground">
        {format(new Date(event.date || Date.now()), 'PPp')}
      </span>
      {event.notes && <p className="mt-1 text-sm text-muted-foreground">{event.notes}</p>}
    </div>
  </div>
);

function IssueTracker({ issue, userId }: { issue: Issue; userId: string }) {
  const timeline = issue.timeline?.length
    ? issue.timeline
    : [{ status: 'Pending', date: new Date(issue.reportedAt || Date.now()).toISOString(), notes: "Issue reported by citizen." }];

  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const userHasRated = (issue.ratings || []).some(r => r.rated_by_user_id === userId);
  const showRatingForm = issue.status === 'Work Complete' && !userHasRated;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start gap-2 flex-wrap">
            <div>
                 <CardTitle className="text-lg leading-tight">{issue.title}</CardTitle>
                 <CardDescription className="mt-1">
                    Reported {formatDistanceToNow(new Date(issue.reportedAt || Date.now()), { addSuffix: true })}
                 </CardDescription>
            </div>
            <Badge variant="outline" className={cn("whitespace-nowrap", statusColors[issue.status])}>{issue.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {timeline.map((event, index) => (
            <TimelineEvent key={index} event={event} isLast={index === timeline.length - 1} />
          ))}
        </div>
        {showRatingForm && (
            <div className="mt-6 border-t pt-4">
                <h3 className="text-md font-semibold mb-2">Rate the Completed Work</h3>
                <RatingForm issue={issue} user={{ id: userId }} />
            </div>
        )}
        {(issue.ratings || []).length > 0 && (
          <div className="mt-4 border-t pt-4">
             <h3 className="text-md font-semibold mb-2">Ratings</h3>
             {(issue.ratings as (Rating & {profiles?: {full_name: string}})[])
             .map(rating => (
              <div key={rating.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-semibold">{rating.profiles?.full_name || 'Citizen'}:</span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("h-4 w-4", i < rating.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground")}/>
                    ))}
                  </div>
              </div>
             ))}
          </div>
        )}
      </CardContent>
       <CardFooter className="bg-muted/50 px-6 py-3">
         <div className="w-full flex justify-end">
            <Button asChild variant="ghost" size="sm">
                <Link href={`/?issue=${issue.id}`}>
                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function MyReportsClient({
  issues,
  profile,
  userId,
}: {
  issues: Issue[];
  profile: UserProfile;
  userId: string;
}) {
  const { t } = useI18n();

  const groupedByDept = issues.reduce((acc, issue) => {
    const dept = issue.department || 'Unassigned';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(issue);
    return acc;
  }, {} as Record<string, Issue[]>);

  const totalIssues = issues.length;

  return (
    <>
      <Header user={profile} t={t} />
      <main className="container mx-auto px-4 py-8 mb-20 md:mb-0">
        <h1 className="text-3xl font-bold tracking-tight mb-6">{t('My Reports')}</h1>
        {totalIssues > 0 ? (
          <Accordion type="multiple" defaultValue={Object.keys(groupedByDept)} className="w-full space-y-4">
            {Object.entries(groupedByDept).map(([dept, deptIssues]) => (
              <AccordionItem key={dept} value={dept} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="bg-muted/50 hover:no-underline px-4 py-3">
                  <div className="flex items-center gap-3">
                     <Building className="h-5 w-5 text-primary" />
                     <h2 className="text-lg font-semibold">{dept}</h2>
                     <Badge variant="secondary">{deptIssues.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 space-y-4">
                   {deptIssues.map(issue => (
                     <IssueTracker key={issue.id} issue={issue} userId={userId} />
                   ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
             <Inbox className="h-16 w-16 text-muted-foreground" />
             <h2 className="mt-4 text-xl font-semibold">{t('No Reports Found')}</h2>
             <p className="mt-2 text-sm text-muted-foreground">{t("You haven't reported any issues yet.")}</p>
             <Button asChild className="mt-6">
                <Link href="/?view=report">{t('Report an Issue')}</Link>
             </Button>
          </Card>
        )}
      </main>
      <BottomNavBar activeView="my-reports" />
    </>
  );
}
