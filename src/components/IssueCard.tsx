
'use client';

import * as React from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  MapPin,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';

import type { Issue } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { updateVote } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import CommentSheet from './CommentSheet';
import { useI18n } from '@/context/i18n-context';
import { translateText } from '@/ai/flows/translate-text';

interface IssueCardProps {
  issue: Issue;
  onValidate: (issueId: string, newCounts: { upvotes: number, downvotes: number }) => void;
  onSelectIssue: (issueId: string) => void;
}

const statusColors = {
  Pending: 'bg-yellow-500',
  'In Progress': 'bg-blue-500',
  Resolved: 'bg-green-500',
  Rejected: 'bg-red-500',
  Redirected: 'bg-purple-500',
};

export default function IssueCard({ issue, onValidate, onSelectIssue }: IssueCardProps) {
  const [isCommentsOpen, setIsCommentsOpen] = React.useState(false);
  const [isVoting, setIsVoting] = React.useState<'upvote' | 'downvote' | null>(null);
  const { toast } = useToast();
  const { t, language } = useI18n();

  const [translatedSummary, setTranslatedSummary] = React.useState<string | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);

  const textToTranslate = issue.summary || issue.description;

  React.useEffect(() => {
    setTranslatedSummary(null);
    
    const doTranslate = async () => {
      if (language === 'en' || !textToTranslate) {
        return;
      }
      setIsTranslating(true);
      try {
        const result = await translateText({
          issueId: issue.id,
          text: textToTranslate,
          targetLanguage: language,
        });
        setTranslatedSummary(result.translatedText);
      } catch (error) {
        console.error('Translation failed:', error);
      } finally {
        setIsTranslating(false);
      }
    };

    doTranslate();
  }, [language, issue.id, textToTranslate]);


  const handleVote = async (type: 'upvote' | 'downvote') => {
    if (isVoting) return;
    setIsVoting(type);
    
    const originalUpvotes = issue.upvotes;
    const originalDownvotes = issue.downvotes;

    const result = await updateVote(issue.id, type);

    if (result.success && result.data) {
        onValidate(issue.id, { upvotes: result.data.new_upvotes, downvotes: result.data.new_downvotes });
    } else {
        toast({
            variant: 'destructive',
            title: 'Vote Failed',
            description: result.error || "An unknown error occurred",
        });
    }
    setIsVoting(null);
  };
  
  const displaySummary = translatedSummary || textToTranslate;
  const issueTitle = t(issue.category + " Issue");

  return (
    <>
      <Card className="w-full overflow-hidden transition-shadow hover:shadow-lg cursor-pointer" onClick={() => onSelectIssue(issue.id)}>
        <div className="grid md:grid-cols-3">
          <div className="md:col-span-1 relative h-48 md:h-full w-full">
            {issue.imageUrls && issue.imageUrls.length > 0 && (
              <Image
                src={issue.imageUrls[0]}
                alt={issue.title}
                fill
                style={{ objectFit: 'cover' }}
                data-ai-hint="issue photo"
                className="bg-secondary"
              />
            )}
          </div>
          <div className="md:col-span-2 flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl mb-2">{issueTitle}</CardTitle>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="whitespace-nowrap">
                    <div
                        className={cn(
                        'w-2 h-2 rounded-full mr-2',
                        statusColors[issue.status]
                        )}
                    ></div>
                    {t(issue.status)}
                    </Badge>
                </div>
              </div>
              <div className="flex items-center text-xs text-muted-foreground gap-4">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {issue.address}
                </span>
                <span>
                  {formatDistanceToNow(issue.reportedAt, { addSuffix: true })}
                </span>
              </div>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {isTranslating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('Translating...')}</span>
                    </div>
                  ) : (
                    <>
                      {displaySummary}
                      {translatedSummary && language !== 'en' && (
                        <Badge variant="outline" className="ml-2 text-xs align-middle">{t('Translated')}</Badge>
                      )}
                    </>
                  )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center mt-auto">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleVote('upvote'); }}
                  disabled={!!isVoting}
                  className="group"
                >
                  {isVoting === 'upvote' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-2 text-green-600 transition-transform group-hover:scale-110" /> }
                  {issue.upvotes}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleVote('downvote'); }}
                  disabled={!!isVoting}
                  className="group"
                >
                  {isVoting === 'downvote' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ThumbsDown className="h-4 w-4 mr-2 text-red-600 transition-transform group-hover:scale-110" />}
                  {issue.downvotes}
                </Button>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}
                  className="flex items-center gap-2 text-sm text-muted-foreground pl-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{issue.comment_count ?? 0}</span>
                </button>
              </div>
               <div onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => onSelectIssue(issue.id)}>
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        {t('Details')}
                    </Button>
               </div>
            </CardFooter>
          </div>
        </div>
      </Card>
      <CommentSheet issue={issue} open={isCommentsOpen} onOpenChange={setIsCommentsOpen} />
    </>
  );
}
