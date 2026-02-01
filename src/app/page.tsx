'use client';

import { useEffect, useState } from 'react';
import { useWalletStore } from '@/core/store/walletStore';
import { OnboardingView } from '@/components/views/OnboardingView';
import { UnlockView } from '@/components/views/UnlockView';
import { DashboardView } from '@/components/views/DashboardView';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { isUnlocked, hasVault, isLoading, initialize, mnemonicToShow } = useWalletStore();
  const [mounted, setMounted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    setMounted(true);
    initialize().finally(() => {
      setIsInitializing(false);
    });
  }, [initialize]);

  if (!mounted || isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-primary">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-background to-background selection:bg-primary selection:text-black">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg transition-all duration-500">
        {isUnlocked ? (
          <DashboardView />
        ) : mnemonicToShow ? (
          <OnboardingView />
        ) : hasVault ? (
          <UnlockView />
        ) : (
          <OnboardingView />
        )}
      </div>
    </main>
  );
}
