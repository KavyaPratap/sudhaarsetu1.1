
import * as React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Issue, Quote, Rating, UserProfile, WorkUpdate } from '@/lib/types';
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
    MapPin,
    Building,
    User,
    Gavel,
    CheckCircle,
    Star,
    MessageSquare,
    Wrench
} from 'lucide-react'
import UpdateStatusForm from './update-status-form';
import ApproveQuoteButton from './approve-quote-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import RatingForm from '@/components/RatingForm';


const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  'In Progress': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  'Work Complete': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  Resolved: 'bg-green-500/20 text-green-700 border-green-500/30',
  Rejected: 'bg-red-500/20 text-red-700 border-red-500/30',
  Redirected: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
};

type ExtendedIssue = Issue & {
    assigned_worker: UserProfile | null;
    reporter: UserProfile | null;
    quotes: (Quote & { profiles: { full_name: string; avatar_url: string; average_rating: number | null; }})[];
    ratings: (Rating & { profiles: Pick<UserProfile, 'full_name' | 'role' | 'avatar_url'>})[];
}

async function getIssueDetails(issueId: string): Promise<ExtendedIssue | null> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Step 1: Fetch the main issue data, including quotes and ratings in separate queries
    const issuePromise = supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .single();
        
    const quotesPromise = supabase
        .from('quotes')
        .select('*, profiles(full_name, avatar_url, average_rating)')
        .eq('issue_id', issueId);
        
    const ratingsPromise = supabase
        .from('ratings')
        .select('*, profiles:rated_by_user_id(full_name, role, avatar_url)')
        .eq('issue_id', issueId);

    const [
        { data: issueData, error: issueError },
        { data: quotesData, error: quotesError },
        { data: ratingsData, error: ratingsError }
    ] = await Promise.all([issuePromise, quotesPromise, ratingsPromise]);

    if (issueError) {
        console.error("Failed to fetch issue details", issueError);
        return null;
    }
    if (quotesError) console.error("Failed to fetch quotes", quotesError);
    if (ratingsError) console.error("Failed to fetch ratings", ratingsError);

    // Step 2 & 3: Fetch reporter and worker profiles separately
    const reporterId = issueData.reportedBy;
    const workerId = issueData.assigned_worker_id;

    const [reporterResult, workerResult] = await Promise.all([
        reporterId ? supabase.from('profiles').select('*').eq('id', reporterId).single() : Promise.resolve({ data: null }),
        workerId ? supabase.from('profiles').select('*').eq('id', workerId).single() : Promise.resolve({ data: null })
    ]);

    // Step 4: Combine the data
    return {
        ...issueData,
        quotes: quotesData || [],
        ratings: ratingsData || [],
        reporter: reporterResult.data,
        assigned_worker: workerResult.data
    } as ExtendedIssue;
}

export default async function AdminIssueDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  const issue = await getIssueDetails(params.id);

  if (!issue) {
    notFound();
  }
  
  const { assigned_worker, reporter, quotes, ratings } = issue;

  const adminHasRated = ratings.some(r => r.rater_role === 'admin');

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

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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

            {issue.status === 'Work Complete' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Work Completion Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-sm">Completion Note from Worker</h4>
                            <p className="text-muted-foreground text-sm mt-1 p-3 bg-secondary rounded-md">{issue.completion_notes || "No notes provided."}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold text-sm">Proof of Completion</h4>
                            <div className="mt-2 relative w-full aspect-video rounded-lg overflow-hidden border">
                                <Image src={issue.completion_photo_url!} alt="Completion Photo" fill className="object-cover" data-ai-hint="completed work" />
                            </div>
                        </div>
                        <Separator />
                        {!adminHasRated ? (
                            <RatingForm issue={issue} user={user!} />
                        ) : (
                             <div className="p-4 rounded-lg bg-green-500/10 text-green-700 flex items-center gap-3">
                                <CheckCircle className="h-6 w-6" />
                                <div>
                                    <p className="font-semibold">You have rated this work.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
            
            {issue.assigned_worker_id ? (
                 <Card>
                    <CardHeader>
                        <CardTitle>Assigned Worker</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={assigned_worker?.avatar_url} />
                            <AvatarFallback>{assigned_worker?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{assigned_worker?.full_name}</p>
                            <p className="text-sm text-muted-foreground">Rating: {assigned_worker?.average_rating?.toFixed(1) || 'N/A'} <Star className="h-3 w-3 inline-block text-yellow-500 fill-yellow-500" /></p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Quotes from Workers</CardTitle>
                        <CardDescription>Review and approve bids to resolve this issue.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {quotes.length > 0 ? (
                            <div className="space-y-4">
                                {quotes.map(quote => (
                                    <div key={quote.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex items-start gap-3">
                                            <Avatar>
                                                <AvatarImage src={quote.profiles?.avatar_url} />
                                                <AvatarFallback>{quote.profiles?.full_name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{quote.profiles?.full_name}</p>
                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500"/> {quote.profiles.average_rating?.toFixed(1) || 'No rating'}
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-1">{quote.comment || "No comment provided."}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                                            <div className="text-center">
                                                <p className="font-bold text-lg">₹{quote.price}</p>
                                                <p className="text-xs text-muted-foreground">{quote.estimated_days} days</p>
                                            </div>
                                            <ApproveQuoteButton issueId={issue.id} quote={quote} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg bg-muted text-center">
                                <Gavel className="mx-auto h-8 w-8 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">No quotes have been submitted yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Work Progress</CardTitle>
                    <CardDescription>Updates posted by the assigned worker.</CardDescription>
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

            <Card>
                 <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                    <CardDescription>History of status changes for this issue.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="space-y-6">
                         {(issue.timeline || []).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((event, index) => (
                            <div key={index} className="relative pl-8">
                               {index !== (issue.timeline || []).length - 1 && <div className="absolute left-[7px] top-5 h-full w-0.5 bg-border" />}
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
                    <Avatar>
                        <AvatarImage src={reporter?.avatar_url} />
                        <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{reporter?.full_name || 'Anonymous'}</p>
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

    
    