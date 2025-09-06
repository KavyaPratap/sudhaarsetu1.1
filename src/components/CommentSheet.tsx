
'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { Issue, Comment } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { addComment } from '@/app/actions';

interface CommentSheetProps {
  issue: Issue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CommentForm({
  issueId,
  onCommentAdded,
}: {
  issueId: string;
  onCommentAdded: (comment: Comment) => void;
}) {
  const [content, setContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    const result = await addComment(issueId, content);
    setIsSubmitting(false);

    if (result.success && result.comment) {
      onCommentAdded(result.comment);
      setContent('');
      toast({ title: 'Success', description: 'Your comment has been posted.' });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Failed to post comment.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3 mt-4 p-4 border-t">
      <Textarea
        placeholder="Add a public comment..."
        value={content}
        onChange={e => setContent(e.target.value)}
        disabled={isSubmitting}
        rows={2}
      />
      <Button type="submit" size="icon" disabled={isSubmitting || !content.trim()}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}


export default function CommentSheet({ issue, open, onOpenChange }: CommentSheetProps) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = React.useState(true);
  const supabase = createClient();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!open || !issue.id) return;

    const fetchComments = async () => {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          id,
          content,
          created_at,
          user_id,
          profiles (
            full_name,
            avatar_url
          )
        `
        )
        .eq('issue_id', issue.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load comments.',
        });
      } else {
        const formattedComments = data.map((comment: any) => ({
          id: comment.id,
          author: comment.profiles.full_name || 'Anonymous',
          avatar: comment.profiles.avatar_url || '',
          text: comment.content,
          timestamp: new Date(comment.created_at),
          user_id: comment.user_id,
        }));
        setComments(formattedComments);
      }
      setLoadingComments(false);
    };

    fetchComments();
  }, [issue.id, supabase, toast, open]);

  const handleCommentAdded = (newComment: Comment) => {
    setComments(prevComments => [...prevComments, newComment]);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Discussion</SheetTitle>
          <SheetDescription>
            Community conversation for: {issue.title}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingComments ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : comments.length > 0 ? (
            comments.map(comment => (
              <div key={comment.id} className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src={comment.avatar} />
                  <AvatarFallback>{comment.author.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="bg-secondary rounded-lg p-3 w-full">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-sm">{comment.author}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(comment.timestamp), 'Pp')}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {comment.text}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Be the first to add your voice!
            </p>
          )}
        </div>
        <CommentForm issueId={issue.id} onCommentAdded={handleCommentAdded} />
      </SheetContent>
    </Sheet>
  );
}
