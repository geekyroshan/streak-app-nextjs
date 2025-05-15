import { LandingPage } from '@/components/landing-page/LandingPage';
import { GitHubCodeHandler } from '@/components/auth/GitHubCodeHandler';
import { Suspense } from 'react';

export default function Home() {
  return (
    <>
      <Suspense fallback={null}>
        <GitHubCodeHandler />
      </Suspense>
      <LandingPage />
    </>
  );
}
