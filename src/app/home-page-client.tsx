'use client';

import * as React from 'react';
import type { Issue, UserProfile } from '@/lib/types';
import Header from '@/components/Header';
import ReportIssueForm from '@/components/ReportIssueForm';
import FeedView from '@/components/FeedView';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase/config';
import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import BottomNavBar from '@/components/BottomNavBar';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import IssueDetail from '@/components/IssueDetail';
import { Dialog } from '@/components/ui/dialog';
import { useI18n } from '@/context/i18n-context';

type View = 'feed' | 'report' | 'my-reports';

function parsePoint(point: any): { lat: number; lng: number } | null {
  if (!point) return null;
  if (typeof point === 'object' && 'lat' in point && 'lng' in point) return point;
  return null;
}

export default function HomePageClient() {
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [activeView, setActiveView] = React.useState<View>('feed');
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();

  const [selectedIssueId, setSelectedIssueId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'report') {
      setActiveView('report');
    } else {
      setActiveView('feed');
    }
  }, [searchParams]);

  React.useEffect(() => {
    const issueIdFromUrl = searchParams.get('issue');
    if (issueIdFromUrl) {
      setSelectedIssueId(issueIdFromUrl);
    }
  }, [searchParams]);

  const selectedIssue = React.useMemo(() => {
    if (!selectedIssueId) return null;
    return issues.find(issue => issue.id === selectedIssueId);
  }, [selectedIssueId, issues]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          }
        } catch (e) {
          console.error('Error fetching profile:', e);
        }
      } else {
        setProfile(null);
      }
    });

    const fetchIssues = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'issues'), orderBy('reportedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedIssues: Issue[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetchedIssues.push({
            ...data,
            id: docSnap.id,
            location: parsePoint(data.location),
            reportedAt: new Date(data.reportedAt),
            comments: [],
            comment_count: data.comment_count || 0,
          } as unknown as Issue);
        });

        setIssues(fetchedIssues);
      } catch (error) {
        console.error('Error fetching issues from Firestore:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
    return () => unsubscribe();
  }, [toast]);

  const handleSetView = (view: View) => {
    if (view === 'my-reports') {
      router.push('/my-reports');
    } else {
      setActiveView(view);
      router.push(`/?view=${view}`, { scroll: false });
    }
  };

  const handleIssueSubmitted = (result: { issue: Issue; isDuplicate?: boolean }) => {
    const { issue, isDuplicate } = result;

    if (isDuplicate) {
      setIssues(prevIssues =>
        prevIssues.map(i =>
          i.id === issue.id ? { ...i, upvotes: issue.upvotes } : i
        )
      );
      toast({
        title: 'Report Added!',
        description: 'Your report was added as an upvote to a similar existing issue.',
      });
    } else {
      const newIssue = {
        ...issue,
        location: parsePoint(issue.location),
        reportedAt: new Date(issue.reportedAt),
        comments: [],
        comment_count: 0
      };
      setIssues(prevIssues => [newIssue, ...prevIssues]);
      if (profile) {
        setProfile(prevProfile =>
          prevProfile ? { ...prevProfile, points: (prevProfile.points || 0) + 10 } : null
        );
      }
      toast({
        title: 'Issue Reported!',
        description: 'Thank you for your contribution. You earned 10 points!',
      });
    }
    handleSetView('feed');
  };

  const handleValidation = (
    issueId: string,
    newCounts: { upvotes: number; downvotes: number }
  ) => {
    setIssues(prevIssues =>
      prevIssues.map(issue => {
        if (issue.id === issueId) {
          return { ...issue, upvotes: newCounts.upvotes, downvotes: newCounts.downvotes };
        }
        return issue;
      })
    );
  };

  const handleIssueDeleted = (issueId: string) => {
    setIssues(prevIssues => prevIssues.filter(issue => issue.id !== issueId));
  };

  const handleDetailOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedIssueId(null);
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.delete('issue');
      const search = current.toString();
      const queryStr = search ? `?${search}` : "";
      router.push(`/${queryStr}`, { scroll: false });
    }
  };

  const renderContent = () => {
    if (loading && activeView === 'feed') {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    switch (activeView) {
      case 'feed':
        return <FeedView issues={issues} onValidate={handleValidation} onSelectIssue={setSelectedIssueId} />;
      case 'report':
        return <ReportIssueForm onIssueSubmitted={handleIssueSubmitted} />;
      default:
        return <FeedView issues={issues} onValidate={handleValidation} onSelectIssue={setSelectedIssueId} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={profile} t={t} />
      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 mb-20 md:mb-0">
        {renderContent()}
      </main>
      <BottomNavBar activeView={activeView} setActiveView={handleSetView} />

      <Dialog open={!!selectedIssue} onOpenChange={handleDetailOpenChange}>
        {selectedIssue && <IssueDetail issue={selectedIssue} onDelete={handleIssueDeleted} onOpenChange={handleDetailOpenChange} />}
      </Dialog>
    </div>
  );
}
