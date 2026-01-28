'use client';

import { Suspense } from 'react';
import { HomePageContent } from '@/components/home-page-content';
import { Loader2 } from 'lucide-react';

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
