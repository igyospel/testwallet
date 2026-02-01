'use client';

import { useState } from 'react';
import { useWalletStore } from '@/core/store/walletStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Crown, AlertTriangle } from 'lucide-react';

export function UnlockView() {
    const { unlockWallet, resetWallet, isLoading } = useWalletStore();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!password) return;

        const success = await unlockWallet(password);
        if (!success) {
            setError('Incorrect password');
        }
    };

    const confirmReset = async () => {
        await resetWallet();
        setShowResetConfirm(false);
    };

    return (
        <>
            <Card className="text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 royal-border py-10 relative">
                <div className="mx-auto w-24 h-24 royal-gradient rounded-2xl overflow-hidden flex items-center justify-center text-primary-foreground shadow-[0_0_30px_rgba(212,175,55,0.3)] border-2 border-white/20">
                    <img src="/gillions-logo.png" alt="Gillions Logo" className="w-full h-full object-cover" />
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-black font-heading ornate-title tracking-[0.15em] text-primary">Gillions Access</h1>
                    <p className="text-muted-foreground text-xs uppercase tracking-widest px-4">Enter your gillions seal to unlock the sovereign vault.</p>
                </div>

                <form onSubmit={handleUnlock} className="space-y-6 pt-4 text-left px-2">
                    <Input
                        type="password"
                        label="Gillions Seal"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={error}
                        autoFocus
                        className="royal-border border-primary/20 focus:border-primary/50"
                    />
                    <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                        Reclaim Throne
                    </Button>
                </form>

                <button
                    onClick={() => setShowResetConfirm(true)}
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer uppercase tracking-widest opacity-60 w-full text-center"
                >
                    Seal lost? Reset Dynasty
                </button>
            </Card>

            {/* Custom Reset Confirmation Modal */}
            {showResetConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
                    <Card className="max-w-sm w-full space-y-6 text-center royal-border border-destructive/30 py-8 px-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-destructive to-transparent" />

                        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mb-4 animate-pulse">
                            <AlertTriangle className="w-8 h-8" />
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-xl font-black font-heading ornate-title tracking-widest text-destructive uppercase">Dissolve Dynasty?</h2>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed font-bold">
                                You are about to dissolve this sovereign domain.
                                <br />
                                <span className="text-destructive">All assets will be lost forever</span>
                                <br />
                                unless you possess the Secret Recovery Decree.
                            </p>
                        </div>

                        <div className="space-y-3 pt-4">
                            <Button
                                variant="outline"
                                className="w-full border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={confirmReset}
                                isLoading={isLoading}
                            >
                                DISSOLVE LEGACY
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full text-primary/60 uppercase text-[10px] tracking-widest font-black"
                                onClick={() => setShowResetConfirm(false)}
                            >
                                Retreat to Safety
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}
