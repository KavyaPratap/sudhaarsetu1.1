
import * as React from 'react';
import { Suspense } from 'react';
import HomePageClient from './home-page-client';
import { Loader2 } from 'lucide-react';

export default function Home() {
  return (
    <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    }>
      <HomePageClient />
    </Suspense>
  );
}
