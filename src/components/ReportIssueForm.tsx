
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
  Mic,
  MicOff,
  ThumbsUp,
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
import { submitIssue, upvoteExistingIssue, runIssueAnalysis } from '@/app/actions';
import type { Issue } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import dynamic from 'next/dynamic';
import { useI18n } from '@/context/i18n-context';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const fileToDataUri = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const IssueLocationMap = dynamic(() => import('./IssueLocationMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><Loader2 className="animate-spin"/></div>
});

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  description: z.string().min(10, 'Please provide a detailed description.'),
  category: z.enum(['Water', 'Electricity', 'Roads', 'Waste', 'Other'], {
    required_error: "Please select a category.",
  }),
  photos: z.any()
    .refine((files) => files?.length > 0 && files?.[0]?.size > 0, 'At least one photo is required.')
    .refine((files) => files?.length <= 5, 'You can upload a maximum of 5 photos.'),
  latitude: z.number({ required_error: "Please select a location on the map." }),
  longitude: z.number({ required_error: "Please select a location on the map." }),
  summary: z.string().optional(),
  reportAnyway: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;
type NearbyIssue = {id: string, title: string, status: string };
type ListeningState = 'idle' | 'listening' | 'processing';

interface ReportIssueFormProps {
  onIssueSubmitted: (result: { issue: Issue; isDuplicate?: boolean }) => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = React.useState(false);
  const [nearbyIssues, setNearbyIssues] = React.useState<NearbyIssue[] | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  
  // Voice state
  const [listeningState, setListeningState] = React.useState<ListeningState>('idle');
  const recognitionRef = React.useRef<any>(null);


  const { t, language } = useI18n();

  const { toast } = useToast();
  const router = useRouter();

  const [state, formAction] = useActionState(submitIssue, null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      photos: undefined,
    },
  });
  
  const photoRef = form.register("photos");
  
  const performAiAnalysis = React.useCallback(async (photoFile?: File, transcript?: string) => {
    if (form.getValues('description').trim() !== '') {
        // If there's already a description, don't run the analysis.
        if (transcript) {
            form.setValue('description', form.getValues('description') + ' ' + transcript);
            toast({ title: "Heard You!", description: "Appended your speech to the existing description."});
        }
        return;
    }
    
    setListeningState('processing');
    toast({ title: "Analyzing...", description: "AI is analyzing the input to fill the form." });
    
    let photoDataUri: string | undefined;
    if (photoFile) {
        photoDataUri = await fileToDataUri(photoFile);
    }

    const result = await runIssueAnalysis(language, transcript, photoDataUri);
    if (result.success && result.data) {
        const { title, description, category, summary } = result.data;
        form.setValue('title', title, { shouldValidate: true });
        form.setValue('description', description, { shouldValidate: true });
        form.setValue('category', category, { shouldValidate: true });
        form.setValue('summary', summary, { shouldValidate: true });
        toast({ title: 'Analysis Complete', description: 'The form has been auto-filled. Please review and submit.' });
    } else {
        toast({ variant: 'destructive', title: 'Analysis Failed', description: result.error });
        // If analysis fails but we have a transcript, at least fill the description
        if (transcript) {
            form.setValue('description', transcript);
        }
    }
    setListeningState('idle');
  }, [form, language, toast]);
  
    // Effect to initialize Speech Recognition
  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Voice Input Not Supported',
        description: 'Your browser does not support speech recognition.',
      });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListeningState('listening');
    recognition.onend = () => {
        if(listeningState !== 'processing') {
            setListeningState('idle');
        }
    }
    recognition.onerror = (event: any) => {
        toast({ variant: 'destructive', title: 'Voice Error', description: `An error occurred: ${event.error}` });
        setListeningState('idle');
    }
    recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        performAiAnalysis(undefined, transcript);
    };
  }, [language, form, toast, listeningState, performAiAnalysis]);


  const toggleListening = () => {
      if (listeningState === 'idle') {
          recognitionRef.current?.start();
      } else {
          recognitionRef.current?.stop();
      }
  }


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
    setIsSubmitting(false);
    if (state?.success && state.issue) {
       if (state.isDuplicate) {
         onIssueSubmitted({ issue: state.issue, isDuplicate: true });
       } else {
         onIssueSubmitted({ issue: state.issue });
       }
      form.reset();
      setPhotoPreviews([]);
    } else if (state && !state.success && state.nearbyIssues) {
      setNearbyIssues(state.nearbyIssues);
      setShowDuplicateDialog(true);
    }
  }, [state, onIssueSubmitted, form, toast]);

  const handleSubmitWithCheck = async () => {
    setIsSubmitting(true);
    form.setValue('reportAnyway', undefined);
    await form.trigger();
    
    const isFormValid = form.formState.isValid;
    if (isFormValid) {
        formRef.current?.requestSubmit();
    } else {
        setIsSubmitting(false);
        toast({
            variant: 'destructive',
            title: 'Invalid Form',
            description: 'Please fill out all required fields before submitting.',
        });
    }
  };

  const handleReportAnyway = async () => {
    setIsSubmitting(true);
    setShowDuplicateDialog(false);
    form.setValue('reportAnyway', 'true');
    formRef.current?.requestSubmit();
  };

  const handleUpvoteDuplicate = async () => {
    if (!nearbyIssues) return;
    setIsSubmitting(true);
    setShowDuplicateDialog(false);
    const result = await upvoteExistingIssue(nearbyIssues[0].id);
    if (result.success && result.issue) {
      onIssueSubmitted({ issue: result.issue, isDuplicate: true });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsSubmitting(false);
  };
  
  const handleLocationChange = React.useCallback((newLoc: { lat: number, lng: number}) => {
      setLocation(newLoc);
      form.setValue('latitude', newLoc.lat, { shouldValidate: true });
      form.setValue('longitude', newLoc.lng, { shouldValidate: true });
  }, [form]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (photoPreviews.length > 0) {
        photoPreviews.forEach(url => URL.revokeObjectURL(url));
      }
      const newPreviews = Array.from(files).map(file => URL.createObjectURL(file));
      setPhotoPreviews(newPreviews);
      
      // Trigger AI analysis if description is empty
      if (form.getValues('description').trim() === '') {
        performAiAnalysis(files[0]);
      }
    }
  };


  const categoryIcons = {
    Water: <Droplets className="mr-2 h-4 w-4" />,
    Electricity: <Zap className="mr-2 h-4 w-4" />,
    Roads: <Construction className="mr-2 h-4 w-4" />,
    Waste: <Trash2 className="mr-2 h-4 w-4" />,
    Other: <AlertCircle className="mr-2 h-4 w-4" />,
  };
  
  const MicButton = () => {
      let Icon = Mic;
      let title = "Record description";
      if (listeningState === 'listening') {
          Icon = MicOff;
          title = "Stop listening";
      } else if (listeningState === 'processing') {
          Icon = Loader2;
          title = "AI is processing...";
      }

      return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleListening}
            disabled={listeningState === 'processing' || isSubmitting}
            className={cn("ml-2", {
                'text-red-500 hover:text-red-600': listeningState === 'listening',
                'animate-spin': listeningState === 'processing'
            })}
            title={title}
        >
            <Icon className="h-5 w-5" />
        </Button>
      )
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
             {state && !state.success && !state.nearbyIssues && (
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
                            <SelectContent position="popper">
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>{t('Description of Issue')}</FormLabel>
                    <MicButton />
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the problem, or click the mic to speak."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <input type="hidden" {...form.register('summary')} />

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
            <Button type="button" className="w-full" disabled={isSubmitting || listeningState !== 'idle'} onClick={handleSubmitWithCheck}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {t('Submit Report')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>

    <AlertDialog open={showDuplicateDialog} onOpenChange={(open) => !open && setShowDuplicateDialog(false)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('Similar Report Found!')}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                    <div>
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
                <AlertDialogCancel onClick={() => setShowDuplicateDialog(false)}>{t('Cancel')}</AlertDialogCancel>
                <Button variant="secondary" onClick={() => handleUpvoteDuplicate()}>
                    {t('Upvote Existing Report')} <ThumbsUp className="ml-2 h-4 w-4" />
                </Button>
                <AlertDialogAction onClick={handleReportAnyway}>{t('Report Anyway')}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
