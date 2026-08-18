
import * as React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import type { Issue } from '@/lib/types';
import { MapPin, Building, Calendar, ThumbsUp, ThumbsDown, Loader2, Trash } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import dynamic from 'next/dynamic';
import { Button } from './ui/button';
import { deleteIssue } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

const IssueLocationMap = dynamic(() => import('./IssueLocationMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><Loader2 className="animate-spin"/></div>
});

interface IssueDetailProps {
  issue: Issue;
  onOpenChange: (open: boolean) => void;
  onDelete: (issueId: string) => void;
}

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  'In Progress': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  Resolved: 'bg-green-500/20 text-green-700 border-green-500/30',
  Rejected: 'bg-red-500/20 text-red-700 border-red-500/30',
  Redirected: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
};

function DeleteConfirmationDialog({ open, onOpenChange, onDelete }: { open: boolean, onOpenChange: (open: boolean) => void, onDelete: () => void }) {
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        await onDelete();
        setIsDeleting(false);
    }
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this issue and remove its images from the servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function IssueDetail({ issue, onOpenChange, onDelete }: IssueDetailProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUserId(user?.uid || null);
        });
        return () => unsubscribe();
    }, []);
    
    const isOwner = issue.reportedBy === currentUserId;

    const handleDelete = async () => {
        if (!isOwner) return;
        const result = await deleteIssue(issue.id);
        if (result.success) {
            toast({ title: 'Success', description: 'Issue has been deleted.' });
            onDelete(issue.id);
            onOpenChange(false); // Close the main dialog
            setShowDeleteConfirm(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
            setShowDeleteConfirm(false);
        }
    };

  return (
    <>
    <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold">{issue.title}</DialogTitle>
        <div className="flex items-center gap-4 pt-1 flex-wrap text-sm text-muted-foreground">
            <Badge variant="outline" className={statusColors[issue.status]}>
                {issue.status}
            </Badge>
            <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                {issue.address}
            </span>
             <span className="flex items-center gap-1.5 font-semibold">
                Urgency: {issue.urgency_score}/100
            </span>
        </div>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto pr-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
             {issue.location && (
                <div className="w-full h-full min-h-[200px] rounded-lg overflow-hidden border">
                    <IssueLocationMap key={`${issue.id}-${issue.location.lat}`} location={issue.location} />
                </div>
            )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Full Description</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{issue.description}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                    <p className="font-semibold">Reported</p>
                    <p className="text-muted-foreground">{format(issue.reportedAt, 'PPP')}</p>
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
                <ThumbsUp className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                    <p className="font-semibold">Upvotes</p>
                    <p className="text-muted-foreground">{issue.upvotes}</p>
                </div>
            </div>
             <div className="flex items-start gap-3">
                <ThumbsDown className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                    <p className="font-semibold">Downvotes</p>
                    <p className="text-muted-foreground">{issue.downvotes}</p>
                </div>
            </div>
        </div>
        
      </div>
      <DialogFooter className="!justify-between sm:!justify-between border-t pt-4">
        <div>
            {isOwner && (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                </Button>
            )}
        </div>
        <DialogClose asChild>
            <Button variant="outline">Close</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
     <DeleteConfirmationDialog 
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onDelete={handleDelete}
    />
    </>
  );
}
