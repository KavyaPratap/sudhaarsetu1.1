
'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';

import { login, signup, adminLogin, workerLogin } from './actions';
import SudhaarSetuLogo from '@/components/SudhaarSetuLogo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useI18n } from '@/context/i18n-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Helper components are defined OUTSIDE the main component
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}


export default function LoginPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = React.useState('login');

  const [loginState, loginAction] = useActionState(login, null);
  const [signupState, signupAction] = useActionState(signup, null);
  const [adminLoginState, adminLoginAction] = useActionState(adminLogin, null);
  const [workerLoginState, workerLoginAction] = useActionState(workerLogin, null);

  React.useEffect(() => {
    const message = searchParams.get('message');
    if(message) {
      toast({ title: 'Check your email', description: message});
    }
  }, [searchParams, toast]);

  React.useEffect(() => {
    if (loginState?.error) {
      toast({ variant: 'destructive', title: 'Login Failed', description: loginState.error });
    }
  }, [loginState, toast]);

  React.useEffect(() => {
    if (signupState?.error) {
      toast({ variant: 'destructive', title: 'Signup Failed', description: signupState.error });
    }
  }, [signupState, toast]);
  
  React.useEffect(() => {
    if (adminLoginState?.error) {
      toast({ variant: 'destructive', title: 'Admin Login Failed', description: adminLoginState.error });
    }
  }, [adminLoginState, toast]);
  
  React.useEffect(() => {
    if (workerLoginState?.error) {
      toast({ variant: 'destructive', title: 'Worker Login Failed', description: workerLoginState.error });
    }
  }, [workerLoginState, toast]);


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-6">
        <SudhaarSetuLogo className="h-12 w-12 text-primary" />
        <h1 className="text-4xl font-bold text-primary font-headline tracking-tight">
          {t('SudhaarSetu')}
        </h1>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">{t('Sign In')}</TabsTrigger>
          <TabsTrigger value="signup">{t('Sign Up')}</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>{t('Sign In')}</CardTitle>
              <CardDescription>{t('Access your account to view and report issues.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={loginAction} className="space-y-4">
                {loginState?.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Login Failed</AlertTitle>
                    <AlertDescription>{loginState.error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">{t('Email')}</Label>
                  <Input id="email" name="email" type="email" placeholder="you@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('Password')}</Label>
                  <Input id="password" name="password" type="password" placeholder="••••••••" required />
                </div>
                <SubmitButton label={t('Sign In')} />
              </form>
               <CardDescription className="text-center pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  className="text-sm text-primary font-medium underline-offset-4 hover:underline focus:outline-none"
                  onClick={() => setActiveTab('admin')}
                >
                  Are you an admin? Login here
                </button>
                 <button
                  type="button"
                  className="text-sm text-primary font-medium underline-offset-4 hover:underline focus:outline-none"
                  onClick={() => setActiveTab('worker')}
                >
                  Are you a worker? Login here
                </button>
              </CardDescription>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>{t('Create an Account')}</CardTitle>
              <CardDescription>{t('Join the community to report issues and make a difference.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={signupAction} className="space-y-4">
                {signupState?.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Signup Failed</AlertTitle>
                    <AlertDescription>{signupState.error}</AlertDescription>
                  </Alert>
                )}
                 <div className="space-y-2">
                  <Label htmlFor="signup-fullname">{t('Full Name')}</Label>
                  <Input id="signup-fullname" name="full_name" type="text" placeholder="Your Name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('Email')}</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="you@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('Password')}</Label>
                  <Input id="signup-password" name="password" type="password" placeholder="••••••••" required />
                </div>
                <div className="space-y-2">
                    <Label>I am a...</Label>
                    <RadioGroup defaultValue="citizen" name="role" className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="citizen" id="role-citizen" />
                            <Label htmlFor="role-citizen">Citizen</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="worker" id="role-worker" />
                            <Label htmlFor="role-worker">Worker</Label>
                        </div>
                    </RadioGroup>
                </div>
                <SubmitButton label={t('Sign Up')} />
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle>{t('Admin Sign In')}</CardTitle>
              <CardDescription>{t('Access the administrative dashboard.')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={adminLoginAction} className="space-y-4">
                {adminLoginState?.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Admin Login Failed</AlertTitle>
                    <AlertDescription>{adminLoginState.error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="admin-email">{t('Email')}</Label>
                  <Input id="admin-email" name="email" type="email" placeholder="admin@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">{t('Password')}</Label>
                  <Input id="admin-password" name="password" type="password" placeholder="••••••••" required />
                </div>
                <SubmitButton label={t('Admin Sign In')} />
              </form>
               <CardFooter className="pt-6">
                <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab('login')}>Back to main login</Button>
              </CardFooter>
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="worker">
          <Card>
            <CardHeader>
              <CardTitle>Worker Sign In</CardTitle>
              <CardDescription>Access the worker dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={workerLoginAction} className="space-y-4">
                {workerLoginState?.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Worker Login Failed</AlertTitle>
                    <AlertDescription>{workerLoginState.error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="worker-email">{t('Email')}</Label>
                  <Input id="worker-email" name="email" type="email" placeholder="worker@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker-password">{t('Password')}</Label>
                  <Input id="worker-password" name="password" type="password" placeholder="••••••••" required />
                </div>
                <SubmitButton label={'Worker Sign In'} />
              </form>
               <CardFooter className="pt-6">
                <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab('login')}>Back to main login</Button>
              </CardFooter>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
