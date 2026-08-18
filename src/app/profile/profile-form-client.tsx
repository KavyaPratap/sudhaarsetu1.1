'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  User as UserIcon,
  Award,
  Phone,
  MapPin,
  BadgeCheck,
  AlertCircle,
  LocateFixed,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateProfile } from './actions';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Header from '@/components/Header';
import BottomNavBar from '@/components/BottomNavBar';
import { useI18n } from '@/context/i18n-context';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Save Changes
    </Button>
  );
}

export default function ProfileFormClient({ initialProfile }: { initialProfile: UserProfile }) {
  const { toast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = React.useState<UserProfile>(initialProfile);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(initialProfile?.avatar_url || null);
  const avatarFileRef = React.useRef<HTMLInputElement>(null);
  const addressTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const { t } = useI18n();

  const [state, formAction] = useActionState(updateProfile, null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      e.target.value = value;
    } else {
      e.target.value = value.slice(0, 10);
    }
  };

  const handleAutodetectLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const locationString = `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`;
          if (addressTextareaRef.current) {
            addressTextareaRef.current.value = locationString;
            const event = new Event('input', { bubbles: true });
            addressTextareaRef.current.dispatchEvent(event);
          }
          toast({
            title: 'Location Detected',
            description: 'Your current location has been filled in.',
          });
        },
        (error) => {
          toast({
            variant: 'destructive',
            title: 'Location Error',
            description: `Could not get location: ${error.message}`,
          });
        }
      );
    } else {
      toast({
        variant: 'destructive',
        title: 'Location Not Supported',
        description: 'Geolocation is not available in your browser.',
      });
    }
  };

  React.useEffect(() => {
    if (!state) return;

    if (state.success) {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
      if (state.updatedProfile?.avatar_url) {
        setAvatarPreview(`${state.updatedProfile.avatar_url}?t=${new Date().getTime()}`);
      }
    } else if (state.error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: state.error,
      });
    }
  }, [state, toast]);

  const homeUrl = profile.role === 'admin' ? '/admin' : profile.role === 'worker' ? '/worker' : '/';

  return (
    <>
      <Header user={profile} t={t} />
      <div className="flex min-h-screen flex-col items-center bg-secondary/30 p-4 sm:p-6 md:p-8 pt-24 md:pt-8">
        <div className="w-full max-w-4xl">
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-primary to-accent" />
            <CardContent className="p-6 text-center -mt-16">
              <Avatar className="mx-auto h-24 w-24 ring-4 ring-background">
                <AvatarImage src={avatarPreview || undefined} alt={profile?.full_name || 'User'} />
                <AvatarFallback>
                  <UserIcon className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <h1 className="mt-4 text-2xl font-bold">{profile?.full_name}</h1>
              <p className="text-muted-foreground">{profile?.email}</p>
              <div className="mt-4 flex justify-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Award className="h-5 w-5 text-accent" />
                  <span className="font-bold text-foreground">{profile?.points ?? 0}</span> {t('Points')}
                </div>
              </div>
            </CardContent>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="md:col-span-2 p-6">
                <h2 className="text-xl font-semibold mb-4">{t('Edit Profile')}</h2>
                <form action={formAction} className="space-y-6">
                  {state && !state.success && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Update Failed</AlertTitle>
                      <AlertDescription>{state.error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="full_name">{t('Full Name')}</Label>
                      <Input id="full_name" name="full_name" defaultValue={profile.full_name || ''} />
                    </div>
                    <div>
                      <Label htmlFor="contact_number">{t('Contact Number')}</Label>
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-secondary text-sm">
                          +91
                        </span>
                        <Input
                          id="contact_number"
                          name="contact_number"
                          defaultValue={profile.contact_number || ''}
                          onChange={handleContactNumberChange}
                          placeholder="9876543210"
                          className="rounded-l-none"
                          maxLength={10}
                          pattern="\d{10}"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">{t('Address')}</Label>
                    <div className="relative">
                      <Textarea
                        id="address"
                        name="address"
                        ref={addressTextareaRef}
                        defaultValue={profile.address || ''}
                        placeholder="Your full address or auto-detect"
                        rows={3}
                        className="pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground"
                        onClick={handleAutodetectLocation}
                        aria-label="Autodetect location"
                      >
                        <LocateFixed className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="avatar">{t('Update Avatar')}</Label>
                    <Input
                      id="avatar"
                      name="avatar"
                      type="file"
                      ref={avatarFileRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                    />
                  </div>

                  <div className="flex justify-end gap-4 mt-6">
                    <Button variant="outline" type="button" onClick={() => router.push(homeUrl)}>
                      {t('Go to Dashboard')}
                    </Button>
                    <SubmitButton />
                  </div>
                </form>
              </div>
              <aside className="md:col-span-1 p-6 bg-secondary/50 border-l">
                <h3 className="text-lg font-semibold mb-4">{t('Your Stats')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">
                      {profile?.contact_number ? `+91 ${profile.contact_number}` : t('No contact number')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">{profile?.address || t('No address provided')}</span>
                  </div>
                </div>

                <Separator className="my-6" />

                <h3 className="text-lg font-semibold mb-4">{t('Badges')}</h3>
                <div className="flex flex-wrap gap-2">
                  {profile?.badges?.length ? (
                    profile.badges.map((badge) => (
                      <Badge key={badge} variant="secondary" className="text-sm py-1 px-3">
                        <BadgeCheck className="h-4 w-4 mr-1.5" />
                        {t(badge)}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('No badges earned yet.')}</p>
                  )}
                </div>
              </aside>
            </div>
          </Card>
        </div>
      </div>
      <BottomNavBar activeView="my-reports" />
    </>
  );
}
