import * as React from 'react';

export const dynamic = 'force-dynamic';
import { adminDb } from '@/lib/firebase/admin';
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
  MapPin,
  Building,
  User,
} from 'lucide-react';
import SubmitQuoteForm from './submit-quote-form';

async function getIssueDetails(issueId: string) {
  try {
    const docSnap = await adminDb.collection('issues').doc(issueId).get();
    if (!docSnap.exists) return null;

    const issueData = { id: docSnap.id, ...docSnap.data() } as any;
    let reporterName = 'Anonymous Citizen';

    if (issueData.reportedBy) {
      const uDoc = await adminDb.collection('users').doc(issueData.reportedBy).get();
      if (uDoc.exists) reporterName = uDoc.data()?.full_name || 'Anonymous Citizen';
    }

    return {
      issue: {
        ...issueData,
        reportedAt: new Date(issueData.reportedAt || Date.now()),
      } as Issue,
      reporterName,
    };
  } catch (error) {
    console.error("Failed to fetch issue details:", error);
    return null;
  }
}

export default async function WorkerIssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const data = await getIssueDetails(resolvedParams.id);

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
                  Reported on {format(new Date(issue.reportedAt || Date.now()), 'PPP')}
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
