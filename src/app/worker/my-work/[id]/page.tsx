
import * as React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Issue, UserProfile, WorkUpdate } from '@/lib/types';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
    MapPin,
    Calendar,
    Wrench,
    MessageSquare,
    CheckCircle
} from 'lucide-react'
import AddUpdateForm from './add-update-form';
import CompleteWorkForm from './complete-work-form';

const statusColors: Record<string, string> = {
  'In Progress': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  'Work Complete': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  Resolved: 'bg-green-500/20 text-green-700 border-green-500/30',
};

type FullIssue = Issue & { reporterName: string | null };

async function getIssueDetails(issueId: string): Promise<FullIssue | null> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Step 1: Fetch the issue itself.
    const { data: issueData, error: issueError } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .maybeSingle();

    if (issueError || !issueData) {
        console.error("Failed to fetch issue details", issueError);
        return null;
    }

    // Step 2: Fetch the reporter's profile separately.
    let reporterName: string | null = 'Anonymous';
    if (issueData.reportedBy) {
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', issueData.reportedBy)
            .single();

        if (profileError) {
             console.error("Could not fetch reporter profile", profileError);
        } else {
            reporterName = profileData?.full_name || 'Anonymous';
        }
    }

    return { ...issueData, reporterName } as FullIssue;
}

export default async function MyWorkDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  const issue = await getIssueDetails(params.id);

  if (!issue || issue.assigned_worker_id !== user?.id) {
    notFound();
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-5 grid auto-rows-max gap-4">
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                            <CardTitle className="text-2xl">{issue.title}</CardTitle>
                            <CardDescription>
                                Reported on {format(new Date(issue.reportedAt), 'PPP')}
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className={statusColors[issue.status]}>{issue.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Carousel className="w-full">
                        <CarouselContent>
                            {issue.imageUrls?.map((url, index) => (
                            <CarouselItem key={index}>
                                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-secondary">
                                <Image
                                    src={url}
                                    alt={`${issue.title} - photo ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    data-ai-hint="issue photo"
                                />
                                </div>
                            </CarouselItem>
                            ))}
                        </CarouselContent>
                        {issue.imageUrls?.length > 1 && (
                            <>
                                <CarouselPrevious className="left-2" />
                                <CarouselNext className="right-2" />
                            </>
                        )}
                    </Carousel>
                     <div>
                        <h3 className="font-semibold mb-2">Full Description</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{issue.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">Location</p>
                                <p className="text-muted-foreground">{issue.address}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">Reported By</p>
                                <p className="text-muted-foreground">{issue.reporterName}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Work Progress</CardTitle>
                    <CardDescription>Updates you have posted for this job.</CardDescription>
                </CardHeader>
                <CardContent>
                    {issue.work_updates && issue.work_updates.length > 0 ? (
                        <div className="space-y-4">
                             {issue.work_updates.map((update: WorkUpdate, index) => (
                                <div key={index} className="flex gap-3">
                                    <Wrench className="h-5 w-5 text-primary mt-1 shrink-0" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{update.update}</p>
                                        <p className="text-xs text-muted-foreground/80">{format(new Date(update.timestamp), 'PPp')}</p>
                                    </div>
                                </div>
                             ))}
                        </div>
                    ) : (
                         <div className="p-4 rounded-lg bg-muted text-center">
                            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">No work updates have been posted yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
        <div className="lg:col-span-2 grid auto-rows-max gap-4">
             {issue.status === 'In Progress' && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Progress Update</CardTitle>
                            <CardDescription>
                                Let the reporter and admin know how the work is going.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <AddUpdateForm issueId={issue.id} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Complete Work</CardTitle>
                            <CardDescription>
                                Finished the job? Upload a photo as proof of completion.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CompleteWorkForm issueId={issue.id} />
                        </CardContent>
                    </Card>
                </>
             )}
             {issue.status !== 'In Progress' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Work Status</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-3 text-lg font-semibold text-primary">
                        <CheckCircle className="h-6 w-6" />
                        <p>{issue.status}</p>
                    </CardContent>
                 </Card>
             )}
        </div>
    </div>
  );
}
