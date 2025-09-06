import * as React from 'react';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import LoginForm from './login-form';

export default function LoginPageContainer() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
