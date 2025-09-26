
'use client';

import * as React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useI18n } from '@/context/i18n-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { logout } from '@/app/login/actions';
import { cn } from '@/lib/utils';
import { parseCommand } from '@/ai/flows/parse-command';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type ListeningState = 'idle' | 'listening' | 'processing';

export default function VoiceNavigator() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [listeningState, setListeningState] = React.useState<ListeningState>('idle');
  const recognitionRef = React.useRef<any>(null);
  const { language, setLanguage } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const commands = React.useMemo(() => ({
    goToFeed: () => router.push('/?view=feed'),
    goToReport: () => router.push('/?view=report'),
    goToMyReports: () => router.push('/my-reports'),
    goToProfile: () => router.push('/profile'),
    logout: () => logout(),
    unknown: () => toast({
        variant: 'destructive',
        title: 'Command Not Understood',
        description: `Sorry, I didn't understand that command.`,
    })
  }), [router, toast]);
  
  const handleCommand = React.useCallback(async (transcript: string) => {
    try {
        const result = await parseCommand({ commandText: transcript, language });
        const commandToExecute = result.command;

        if (commandToExecute === 'changeLanguage' && result.targetLanguage) {
             setLanguage(result.targetLanguage);
             toast({
                title: "Language Changed",
                description: `App language set to ${result.targetLanguage}`
             })
        } else if (commandToExecute !== 'changeLanguage' && commands[commandToExecute]) {
            commands[commandToExecute]();
        } else {
            commands.unknown();
        }
    } catch (error) {
        console.error("Error parsing command:", error);
        toast({
            variant: 'destructive',
            title: 'AI Error',
            description: 'Could not process the voice command.',
        });
    } finally {
         setTimeout(() => setListeningState('idle'), 1000);
    }
  }, [language, commands, toast, setLanguage]);

  React.useEffect(() => {
    setIsMounted(true);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onstart = () => {
      setListeningState('listening');
    };

    recognition.onend = () => {
      if (listeningState !== 'processing') {
          setListeningState('idle');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      
      let description = `Could not recognize speech: ${event.error}`;
      if (event.error === 'network') {
        description = "Voice recognition failed due to a network issue. Please check your internet connection and try again.";
      } else if (event.error === 'no-speech') {
        description = "No speech was detected. Please try again.";
      } else if (event.error === 'service-not-allowed' || event.error === 'not-allowed') {
        description = "Voice recognition permission denied. Please enable it in your browser settings.";
      }

      if (event.error !== 'aborted') {
          toast({
            variant: 'destructive',
            title: 'Voice Error',
            description: description,
          });
      }
      setListeningState('idle');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        setListeningState('processing');
        toast({
            title: "Heard you!",
            description: `Processing: "${transcript}"`
        });
        handleCommand(transcript);
      } else {
        setListeningState('idle');
      }
    };

    recognitionRef.current = recognition;
  }, [language, toast, handleCommand, listeningState]);


  const toggleListening = () => {
    if (listeningState === 'idle') {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Could not start recognition:", e);
        toast({
          variant: 'destructive',
          title: 'Voice Error',
          description: 'Could not start voice recognition. Please try again.',
        });
        setListeningState('idle');
      }
    } else {
      try {
        recognitionRef.current?.abort();
        setListeningState('idle');
      } catch (e) {
         console.error("Could not stop recognition:", e);
      }
    }
  };

  if (!isMounted || !recognitionRef.current) {
    return null;
  }

  return (
    <Button
      onClick={toggleListening}
      size="icon"
      className={cn("fixed bottom-20 md:bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-colors", {
          'bg-red-600 hover:bg-red-700': listeningState === 'listening',
          'bg-blue-600 hover:bg-blue-700': listeningState === 'processing',
          'bg-primary hover:bg-primary/90': listeningState === 'idle',
      })}
    >
      {listeningState === 'idle' && <Mic className="h-6 w-6" />}
      {listeningState === 'listening' && <MicOff className="h-6 w-6 animate-pulse" />}
      {listeningState === 'processing' && <Loader2 className="h-6 w-6 animate-spin" />}
      <span className="sr-only">Toggle Voice Navigation</span>
    </Button>
  );
}
