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
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
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
  const { toast } = useToast();

  React.useEffect(() => {
    if (!open || !issue.id) return;

    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const commentsRef = collection(db, 'issues', issue.id, 'comments');
        const q = query(commentsRef, orderBy('created_at', 'asc'));
        const snapshot = await getDocs(q);

        const fetched: Comment[] = [];
        for (const commentDoc of snapshot.docs) {
          const data = commentDoc.data();
          let author = 'Anonymous';
          let avatar = '';

          if (data.user_id) {
            try {
              const uDoc = await getDoc(doc(db, 'users', data.user_id));
              if (uDoc.exists()) {
                author = uDoc.data()?.full_name || 'Anonymous';
                avatar = uDoc.data()?.avatar_url || '';
              }
            } catch {}
          }

          fetched.push({
            id: commentDoc.id,
            author,
            avatar,
            text: data.content || '',
            timestamp: new Date(data.created_at),
            user_id: data.user_id,
          });
        }
        setComments(fetched);
      } catch (error) {
        console.error('Error fetching comments:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load comments.',
        });
      } finally {
        setLoadingComments(false);
      }
    };

    fetchComments();
  }, [issue.id, toast, open]);

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
