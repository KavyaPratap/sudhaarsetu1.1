
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
} from 'lucide-react'
import SubmitQuoteForm from './submit-quote-form';

async function getIssueDetails(supabase: ReturnType<typeof createClient>, issueId: string) {
    const { data: issueData, error: issueError } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .maybeSingle();
    
    if (issueError || !issueData) {
        console.error("Failed to fetch issue details", issueError);
        return null;
    }

    const { data: reporterData, error: reporterError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', issueData.reportedBy)
        .single();
    
    if (reporterError) {
         console.error("Failed to fetch reporter", reporterError);
    }

    return {
        issue: issueData,
        reporterName: reporterData?.full_name || 'Anonymous Citizen'
    } as { issue: Issue, reporterName: string }
}

export default async function WorkerIssueDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const data = await getIssueDetails(supabase, params.id);

  if (!data) {
    notFound();
  }
  
  const { issue, reporterName } = data;

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
                        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">{issue.status}</Badge>
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
                            <User className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">Reported By</p>
                                <p className="text-muted-foreground">{reporterName}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
        <div className="lg:col-span-2 grid auto-rows-max gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Submit Your Quote</CardTitle>
                    <CardDescription>
                        Place your bid to resolve this issue. Your quote will be reviewed by an admin.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SubmitQuoteForm issueId={issue.id} />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

