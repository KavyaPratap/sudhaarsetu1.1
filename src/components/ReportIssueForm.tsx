
'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Camera,
  Loader2,
  Droplets,
  Zap,
  Construction,
  Trash2,
  AlertCircle,
  ArrowRight,
  Star,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { submitIssue, checkForNearbyIssues, runIssueAnalysis } from '@/app/actions';
import type { Issue } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import dynamic from 'next/dynamic';
import { useI18n } from '@/context/i18n-context';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const IssueLocationMap = dynamic(() => import('./IssueLocationMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><Loader2 className="animate-spin"/></div>
});

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  description: z.string().min(10, 'Please provide a detailed description.'),
  category: z.enum(['Water', 'Electricity', 'Roads', 'Waste', 'Other']),
  photos: z.any()
    .refine((files) => files?.length > 0 && files?.[0]?.size > 0, 'At least one photo is required.')
    .refine((files) => files?.length <= 5, 'You can upload a maximum of 5 photos.'),
  latitude: z.number({ required_error: "Please select a location on the map." }),
  longitude: z.number({ required_error: "Please select a location on the map." }),
  summary: z.string().optional(),
  userFrustration: z.coerce.number().min(1).max(5).default(3),
  userUrgency: z.coerce.number().min(1).max(5).default(3),
  peopleAffected: z.string().default('A few people'),
  duration: z.string().default('A few days'),
  userFeedback: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type NearbyIssue = {id: string, title: string, status: string };

interface ReportIssueFormProps {
  onIssueSubmitted: (result: { issue: Issue; isDuplicate?: boolean }) => void;
}

const StarRating = ({ name, value, onChange }: { name: string; value: number; onChange: (value: number) => void }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          onClick={() => onChange(star)}
          className={cn(
            'w-8 h-8 cursor-pointer transition-colors',
            star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'
          )}
        />
      ))}
    </div>
  );
};

function FeedbackModal({
  open,
  onOpenChange,
  onFeedbackSubmit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFeedbackSubmit: (feedback: Omit<FormValues, 'photos' | 'latitude' | 'longitude' | 'title' | 'description' | 'category' | 'summary'>) => void;
}) {
  const [feedback, setFeedback] = React.useState({
    userFrustration: 3,
    userUrgency: 3,
    peopleAffected: 'A few people',
    duration: 'A few days',
    userFeedback: '',
  });

  const handleSubmit = () => {
    onFeedbackSubmit(feedback);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How does this issue affect you?</DialogTitle>
          <DialogDescription>
            Your feedback helps us understand the problem's impact and prioritize it correctly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-2">
                <Label>How frustrated are you by this issue?</Label>
                <StarRating name="userFrustration" value={feedback.userFrustration} onChange={(val) => setFeedback(f => ({...f, userFrustration: val}))} />
            </div>
            <div className="flex flex-col items-center gap-2">
                <Label>How urgently does this need to be fixed?</Label>
                <StarRating name="userUrgency" value={feedback.userUrgency} onChange={(val) => setFeedback(f => ({...f, userUrgency: val}))} />
            </div>
            <div className="space-y-2">
              <Label>How many people does this affect?</Label>
              <Select value={feedback.peopleAffected} onValueChange={(val) => setFeedback(f => ({...f, peopleAffected: val}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Just me">Just me</SelectItem>
                  <SelectItem value="A few people">A few people</SelectItem>
                  <SelectItem value="A neighborhood">A neighborhood</SelectItem>
                  <SelectItem value="A whole community">A whole community</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>How long has this been an issue?</Label>
              <Select value={feedback.duration} onValueChange={(val) => setFeedback(f => ({...f, duration: val}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A few days">A few days</SelectItem>
                  <SelectItem value="A week">A week</SelectItem>
                  <SelectItem value="A month">A month</SelectItem>
                  <SelectItem value="Longer than a month">Longer than a month</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
                <Label>Any other comments? (Optional)</Label>
                <Textarea placeholder="e.g., This is a recurring problem..." value={feedback.userFeedback} onChange={(e) => setFeedback(f => ({...f, userFeedback: e.target.value}))}/>
             </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


export default function ReportIssueForm({
  onIssueSubmitted,
}: ReportIssueFormProps) {
  const [location, setLocation] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [photoPreviews, setPhotoPreviews] = React.useState<string[]>([]);
  const [isClient, setIsClient] = React.useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [nearbyIssues, setNearbyIssues] = React.useState<NearbyIssue[] | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const { t } = useI18n();

  const { toast } = useToast();
  const router = useRouter();

  const [state, formAction] = useActionState(submitIssue, null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      category: undefined,
      photos: undefined,
      summary: '',
      userFrustration: 3,
      userUrgency: 3,
      peopleAffected: 'A few people',
      duration: 'A few days',
      userFeedback: '',
    },
  });
  
  const photoRef = form.register("photos");

  React.useEffect(() => {
    setIsClient(true);
    const defaultLocation = { lat: 23.3441, lng: 85.3096 }; // Default to Ranchi
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          const newLocation = { lat: latitude, lng: longitude };
          setLocation(newLocation);
          form.setValue('latitude', latitude);
          form.setValue('longitude', longitude);
        },
        () => {
          setLocation(defaultLocation);
          form.setValue('latitude', defaultLocation.lat);
          form.setValue('longitude', defaultLocation.lng);
        }
      );
    } else {
       setLocation(defaultLocation);
       form.setValue('latitude', defaultLocation.lat);
       form.setValue('longitude', defaultLocation.lng);
    }
  }, [form]);

  React.useEffect(() => {
    if (state?.success && state.issue) {
       if (state.isDuplicate) {
         onIssueSubmitted({ issue: state.issue, isDuplicate: true });
       } else {
         onIssueSubmitted({ issue: state.issue });
       }
      form.reset();
      setPhotoPreviews([]);
    }
  }, [state, onIssueSubmitted, form, toast]);

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsCheckingDuplicates(true);
    const { latitude, longitude } = form.getValues();
    const result = await checkForNearbyIssues(latitude, longitude);
    setIsCheckingDuplicates(false);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
      formRef.current?.requestSubmit();
    } else if (result.nearbyIssues && result.nearbyIssues.length > 0) {
      setNearbyIssues(result.nearbyIssues);
    } else {
      formRef.current?.requestSubmit();
    }
  };
  
  const handleLocationChange = React.useCallback((newLoc: { lat: number, lng: number}) => {
      setLocation(newLoc);
      form.setValue('latitude', newLoc.lat, { shouldValidate: true });
      form.setValue('longitude', newLoc.lng, { shouldValidate: true });
  }, [form]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
      const newPreviews = Array.from(files).map(file => URL.createObjectURL(file));
      setPhotoPreviews(newPreviews);
      
      setShowFeedbackModal(true);
    }
  };
  
  const handleFeedbackSubmit = async (feedback: any) => {
    const photos = form.getValues('photos');
    if (!photos || photos.length === 0) return;

    setIsAnalyzing(true);
    try {
      const file = photos[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async (event) => {
        const dataUri = event.target?.result as string;
        
        const result = await runIssueAnalysis(dataUri, feedback);

        if (result.success && result.data) {
          const { title, description, category, summary } = result.data;
          form.setValue('title', title, { shouldValidate: true });
          form.setValue('description', description, { shouldValidate: true });
          form.setValue('category', category, { shouldValidate: true });
          form.setValue('summary', summary, { shouldValidate: true });
          
          form.setValue('userFrustration', feedback.userFrustration);
          form.setValue('userUrgency', feedback.userUrgency);
          form.setValue('peopleAffected', feedback.peopleAffected);
          form.setValue('duration', feedback.duration);
          form.setValue('userFeedback', feedback.userFeedback);

          toast({ title: 'Analysis Complete', description: 'The form has been auto-filled. Please review and submit.' });
        } else {
          toast({ variant: 'destructive', title: 'Analysis Failed', description: result.error });
        }
        setIsAnalyzing(false);
      };
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not analyze the image.' });
      setIsAnalyzing(false);
    }
  };


  const categoryIcons = {
    Water: <Droplets className="mr-2 h-4 w-4" />,
    Electricity: <Zap className="mr-2 h-4 w-4" />,
    Roads: <Construction className="mr-2 h-4 w-4" />,
    Waste: <Trash2 className="mr-2 h-4 w-4" />,
    Other: <AlertCircle className="mr-2 h-4 w-4" />,
  };
  
  const handleProceedWithReport = () => {
    setNearbyIssues(null);
    formRef.current?.requestSubmit();
  }

  const handleViewExisting = () => {
    if (nearbyIssues && nearbyIssues.length > 0) {
        const issueId = nearbyIssues[0].id;
        setNearbyIssues(null);
        router.push(`/?issue=${issueId}`);
    }
  }

  return (
    <>
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('Report a Civic Issue')}</CardTitle>
        <CardDescription>
          {t('Help improve your community by reporting issues. Please provide as much detail as possible.')}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form ref={formRef} action={formAction} className="space-y-6">
          <CardContent className="space-y-6">
             {state && !state.success && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('Submission Failed')}</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <FormField
                control={form.control}
                name="photos"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('Upload Photos (up to 5)')}</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Input
                            type="file"
                            accept="image/*"
                            multiple
                            {...photoRef}
                            onChange={(e) => {
                                field.onChange(e.target.files);
                                handlePhotoChange(e);
                            }}
                            className="pl-10"
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Camera className="h-5 w-5 text-muted-foreground" />
                        </div>
                        </div>
                    </FormControl>
                    <FormDescription>After selecting a photo, a short survey will appear.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />

            {photoPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {photoPreviews.map((src, index) => (
                    <div key={index} className="relative w-full aspect-square rounded-md overflow-hidden border">
                        <Image
                        src={src}
                        alt={`Photo preview ${index + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        data-ai-hint="issue photo"
                        />
                    </div>
                    ))}
                </div>
            )}
            
             {isAnalyzing && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="animate-spin h-5 w-5" />
                    <p>AI is generating the report details...</p>
                </div>
            )}


            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Overflowing Garbage Bin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Description of Issue')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., There is a large pothole at the intersection of..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <input type="hidden" {...form.register('summary')} />
            <input type="hidden" {...form.register('userFrustration')} />
            <input type="hidden" {...form.register('userUrgency')} />
            <input type="hidden" {...form.register('peopleAffected')} />
            <input type="hidden" {...form.register('duration')} />
            <input type="hidden" {...form.register('userFeedback')} />


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('Category')}</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        name={field.name}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={t('Select a category')} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {Object.entries(categoryIcons).map(([cat, icon]) => (
                            <SelectItem key={cat} value={cat}>
                            <div className="flex items-center">
                                {icon} {t(cat)}
                            </div>
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <FormField
              control={form.control}
              name="latitude"
              render={() => (
                <FormItem>
                  <FormLabel>{t('Pinpoint Location')}</FormLabel>
                  <FormDescription>
                    {t('Drag the pin to the exact location of the issue.')}
                  </FormDescription>
                  <div className="h-64 w-full rounded-md overflow-hidden border">
                     {isClient && location ? (
                       <IssueLocationMap
                            key={`${location.lat}-${location.lng}`}
                            location={location}
                            interactive={true}
                            onLocationChange={handleLocationChange}
                        />
                     ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('Getting location...')}
                        </div>
                     )}
                  </div>
                   <input type="hidden" {...form.register('latitude')} />
                   <input type="hidden" {...form.register('longitude')} />
                  <FormMessage />
                </FormItem>
              )}
            />

          </CardContent>
          <CardFooter>
            <Button type="button" className="w-full" disabled={isCheckingDuplicates || isAnalyzing} onClick={handleSubmit}>
                 {(isCheckingDuplicates || isAnalyzing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {t('Submit Report')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>

    <FeedbackModal 
      open={showFeedbackModal}
      onOpenChange={setShowFeedbackModal}
      onFeedbackSubmit={handleFeedbackSubmit}
    />

    <AlertDialog open={!!nearbyIssues} onOpenChange={(open) => !open && setNearbyIssues(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('Similar Report Found!')}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                    <div className="text-sm text-muted-foreground">
                        <p>{t('A similar issue has already been reported nearby. Your report will be added as an upvote to the existing issue.')}</p>
                        <div className="mt-4 space-y-2">
                            {nearbyIssues?.map(issue => (
                                <div key={issue.id} className="p-2 border rounded-md text-sm">
                                    <p className="font-semibold text-foreground">{issue.title}</p>
                                    <p>Status: {issue.status}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setNearbyIssues(null)}>{t('Cancel')}</AlertDialogCancel>
                <Button variant="secondary" onClick={handleViewExisting}>
                    {t('View Existing Report')} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <AlertDialogAction onClick={handleProceedWithReport}>{t('Report Anyway')}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
