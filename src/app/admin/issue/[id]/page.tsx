
import * as React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Issue } from '@/lib/types';
import { format } from 'date-fns';
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
    Calendar,
    MapPin,
    Building,
    User,
    MessageSquare,
} from 'lucide-react'
import UpdateStatusForm from './update-status-form';

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  'In Progress': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  Resolved: 'bg-green-500/20 text-green-700 border-green-500/30',
  Rejected: 'bg-red-500/20 text-red-700 border-red-500/30',
  Redirected: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
};

async function getIssueDetails(supabase: ReturnType<typeof createClient>, issueId: string) {
    const { data: issueData, error: issueError } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .single();
    
    if (issueError || !issueData) {
        console.error("Failed to fetch issue details", issueError);
        return null;
    }
    
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', issueData.reportedBy)
        .single();

    if (profileError) {
        console.error("Failed to fetch profile details", profileError);
        // We can still proceed without profile data, but we'll use defaults.
    }

    return {
        ...issueData,
        profiles: profileData || { full_name: 'Anonymous', avatar_url: ''}
    } as unknown as (Issue & { profiles: { full_name: string, avatar_url: string }});
}

export default async function AdminIssueDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const issue = await getIssueDetails(supabase, params.id);

  if (!issue) {
    notFound();
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-5 grid auto-rows-max gap-4">
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">{issue.title}</CardTitle>
                            <CardDescription>
                                Reported on {format(new Date(issue.reportedAt), 'PPP')}
                            </CardDescription>
                        </div>
                        <Badge className={statusColors[issue.status]}>{issue.status}</Badge>
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

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">Location</p>
                                <p className="text-muted-foreground">{issue.address}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Building className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">Department</p>
                                <p className="text-muted-foreground">{issue.department}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="font-semibold text-primary text-lg">{issue.urgency_score}/100</div>
                            <div>
                                <p className="font-semibold">Urgency Score</p>
                                <p className="text-muted-foreground">AI Calculated</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                    <CardDescription>History of status changes for this issue.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="space-y-6">
                         {issue.timeline?.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((event, index) => (
                            <div key={index} className="relative pl-8">
                               {index !== issue.timeline.length - 1 && <div className="absolute left-[7px] top-5 h-full w-0.5 bg-border" />}
                                <div className="absolute left-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                                <div className="flex flex-col">
                                <span className="font-semibold">{event.status}</span>
                                <span className="text-xs text-muted-foreground">
                                    {format(new Date(event.date), 'PPp')}
                                </span>
                                {event.notes && <p className="mt-1 text-sm text-muted-foreground">{event.notes}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

        </div>
        <div className="lg:col-span-2 grid auto-rows-max gap-4">
             <Card>
                <CardHeader>
                    <CardTitle>Reported By</CardTitle>
                </CardHeader>
                <CardContent className="flex items-start gap-4">
                    <User className="w-10 h-10 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">{issue.profiles.full_name || 'Anonymous'}</p>
                        <p className="text-sm text-muted-foreground">{ 'No email provided'}</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Update Status</CardTitle>
                    <CardDescription>
                        Change the status of the issue and add notes for the timeline.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UpdateStatusForm issue={issue} />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
