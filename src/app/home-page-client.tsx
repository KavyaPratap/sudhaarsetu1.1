
'use client';

import * as React from 'react';
import type { Issue, UserProfile } from '@/lib/types';
import Header from '@/components/Header';
import ReportIssueForm from '@/components/ReportIssueForm';
import FeedView from '@/components/FeedView';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import BottomNavBar from '@/components/BottomNavBar';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import IssueDetail from '@/components/IssueDetail';
import { Dialog } from '@/components/ui/dialog';
import { useI18n } from '@/context/i18n-context';

type View = 'feed' | 'report';

function parsePoint(point: any): { lat: number; lng: number } | null {
  if (!point) return null;

  // Case 1: It's already a valid object { lat, lng }
  if (typeof point === 'object' && 'lat' in point && 'lng' in point) {
    return point;
  }
  
  // Case 2: It's the new format from Supabase RPC with PostGIS: { type: 'Point', coordinates: [lng, lat] }
  if (typeof point === 'object' && point.type === 'Point' && Array.isArray(point.coordinates)) {
    const [lng, lat] = point.coordinates;
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // Case 3: It's a string from a raw query 'POINT(lng lat)'
  if (typeof point === 'string') {
    const match = point.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }
  
  console.warn("Could not parse point:", point);
  return null;
}


export default function HomePageClient() {
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [activeView, setActiveView] = React.useState<View>('feed');
  const { toast } = useToast();
  const supabase = createClient();
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
    const fetchUserAndProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error && !data) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setProfile(data);
        }
      }
    };
    
    const fetchIssues = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('issues')
        .select(`*, comments(count)`)
        .order('reportedAt', { ascending: false });

      if (error) {
        console.error('Error fetching issues:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch issues.',
        });
      } else {
         const formattedIssues: Issue[] = data.map(issue => {
           const { comments, location, ...rest } = issue;
           const commentCount = (Array.isArray(comments) && comments.length > 0) ? comments[0].count : 0;
           return {
             ...rest,
             location: parsePoint(location),
             reportedAt: new Date(issue.reportedAt),
             comments: [], // Comments will be loaded in detail view
             comment_count: commentCount,
           }
         });
        setIssues(formattedIssues);
      }
      setLoading(false);
    }

    fetchUserAndProfile();
    fetchIssues();

  }, [supabase, toast]);

  const handleSetView = (view: View) => {
    setActiveView(view);
    router.push(`/?view=${view}`, { scroll: false });
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
                prevProfile ? { ...prevProfile, points: prevProfile.points + 10 } : null
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
    newCounts: { upvotes: number, downvotes: number }
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
      // Clean the URL
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.delete('issue');
      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.push(`/${query}`, { scroll: false });
    }
  };

  const renderContent = () => {
    if (loading && activeView === 'feed') {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
    }

    switch (activeView) {
      case 'feed':
        return <FeedView issues={issues} onValidate={handleValidation} onSelectIssue={setSelectedIssueId} />;
      case 'report':
        return <ReportIssueForm onIssueSubmitted={handleIssueSubmitted} />;
      default:
        return <FeedView issues={issues} onValidate={handleValidation} onSelectIssue={setSelectedIssueId} />;
    }
  }

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
