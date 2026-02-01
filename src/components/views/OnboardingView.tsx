'use client';

import { useState, useMemo } from 'react';
import { useWalletStore } from '@/core/store/walletStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Crown, Eye, EyeOff, Copy, RefreshCw, AlertTriangle, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this exists or works with local utils

export function OnboardingView() {
    const { createWallet, importWallet, mnemonicToShow, confirmSeenMnemonic, isLoading } = useWalletStore();

    const [step, setStep] = useState<'welcome' | 'password' | 'reveal' | 'confirm' | 'import'>('welcome');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [importMnemonic, setImportMnemonic] = useState('');
    const [pwError, setPwError] = useState('');

    // Confirmation state
    const [shuffledWords, setShuffledWords] = useState<string[]>([]);
    const [selectedWords, setSelectedWords] = useState<string[]>([]);

    const mnemonicWords = useMemo(() => mnemonicToShow || [], [mnemonicToShow]);

    const handleCreatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            setPwError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            setPwError('Passwords do not match');
            return;
        }

        try {
            await createWallet(password);
            setStep('reveal');
        } catch (err) {
            setPwError('Failed to create wallet');
        }
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError('');

        if (!importMnemonic.trim()) {
            setPwError('Recovery Decree is required');
            return;
        }

        if (password.length < 8) {
            setPwError('Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            setPwError('Passwords do not match');
            return;
        }

        try {
            await importWallet(importMnemonic.trim().toLowerCase(), password);
        } catch (err: any) {
            setPwError(err.message || 'Import failed. Check your Decree.');
        }
    };

    const startConfirmation = () => {
        // Shuffle words for the confirmation step
        const shuffled = [...mnemonicWords].sort(() => Math.random() - 0.5);
        setShuffledWords(shuffled);
        setStep('confirm');
    };

    const handleWordSelect = (word: string) => {
        if (selectedWords.includes(word)) return;
        setSelectedWords([...selectedWords, word]);
    };

    const handleResetSelection = () => {
        setSelectedWords([]);
    };

    const isConfirmationComplete = useMemo(() => {
        if (selectedWords.length !== mnemonicWords.length) return false;
        return selectedWords.every((w, i) => w === mnemonicWords[i]);
    }, [selectedWords, mnemonicWords]);

    const finalizeSetup = () => {
        if (isConfirmationComplete) {
            confirmSeenMnemonic();
            // Store will update state, parent Page will flip to Dashboard
        }
    };

    // 1. Welcome Screen
    if (step === 'welcome') {
        return (
            <Card className="text-center space-y-8 py-10 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse" />
                    <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden relative z-10 shadow-[0_0_25px_rgba(212,175,55,0.3)] border border-primary/20">
                        <img src="/gillions-logo.png" alt="Gillions Logo" className="w-full h-full object-cover" />
                    </div>
                </div>
                <div className="space-y-4">
                    <h1 className="text-3xl sm:text-4xl font-black font-heading ornate-title tracking-[0.2em] bg-gradient-to-b from-primary via-primary/80 to-primary/40 bg-clip-text text-transparent">Gillions Wallet</h1>
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-[1px] w-8 bg-primary/30" />
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.3em] font-bold">The Sovereign Vault</p>
                        <div className="h-[1px] w-8 bg-primary/30" />
                    </div>
                </div>
                <div className="space-y-3 pt-4">
                    <Button size="lg" className="w-full" onClick={() => setStep('password')}>
                        Found New Dynasty
                    </Button>
                    <Button variant="ghost" className="w-full text-[10px] tracking-widest uppercase opacity-80 text-primary hover:bg-primary/10" onClick={() => setStep('import')}>
                        Reclaim Legacy Decree
                    </Button>
                </div>
            </Card>
        );
    }

    // New: 1b. Import Screen
    if (step === 'import') {
        return (
            <Card className="space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black font-heading ornate-title tracking-wider text-primary">Reclaim Legacy</h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-widest leading-relaxed">
                        Enter your sacred Recovery Decree and set a new Gillions Seal.
                    </p>
                </div>

                <form onSubmit={handleImport} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Recovery Decree (24 Words)</label>
                        <textarea
                            className="w-full h-32 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs font-mono text-primary focus:outline-none focus:border-primary/50 transition-colors resize-none"
                            placeholder="word1 word2 word3..."
                            value={importMnemonic}
                            onChange={e => setImportMnemonic(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        <Input
                            type="password"
                            label="New Gillions Seal"
                            placeholder="Minimum 8 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        <Input
                            type="password"
                            label="Confirm Seal"
                            placeholder="Re-enter to verify"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            error={pwError}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" className="flex-1 opacity-60" onClick={() => setStep('welcome')}>Retreat</Button>
                        <Button type="submit" size="lg" className="flex-[2]" isLoading={isLoading}>
                            Restore Dynasty
                        </Button>
                    </div>
                </form>
            </Card>
        );
    }

    // 2. Password Creation
    if (step === 'password') {
        return (
            <Card className="space-y-6">
                <h2 className="text-2xl font-black text-center font-heading ornate-title tracking-wider text-primary">Secure the Crown</h2>
                <p className="text-center text-muted-foreground text-xs uppercase tracking-widest leading-relaxed">
                    This password encrypts your royal seal. It is known only to you.
                </p>
                <form onSubmit={handleCreatePassword} className="space-y-4">
                    <Input
                        type="password"
                        label="Password"
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        error={pwError}
                        autoFocus
                    />
                    <Input
                        type="password"
                        label="Confirm Password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <Button type="submit" size="lg" className="w-full mt-4" isLoading={isLoading}>
                        Continue <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </form>
            </Card>
        );
    }

    // 3. Reveal Mnemonic
    if (step === 'reveal') {
        return (
            <Card className="space-y-6 max-w-lg mx-auto">
                <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 royal-gradient rounded-full flex items-center justify-center text-primary-foreground mb-2">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black font-heading ornate-title text-primary tracking-wider">Secret Recovery Decree</h2>
                    <p className="text-muted-foreground text-xs uppercase tracking-widest leading-relaxed">
                        Inscribe these 24 sacred words in order.
                        <br /><span className="font-bold text-primary">To lose them is to lose your domain forever.</span>
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 sm:p-4 bg-primary/5 rounded-xl border royal-border border-primary/20 relative">
                    {mnemonicWords.map((word: string, idx: number) => (
                        <div key={idx} className="flex items-center space-x-2 bg-primary/10 p-2 rounded text-[10px] royal-border border-primary/10">
                            <span className="text-primary/50 select-none w-5 text-right font-black">{idx + 1}.</span>
                            <span className="font-mono font-bold text-primary tracking-tight">{word}</span>
                        </div>
                    ))}

                    <div className="col-span-2 sm:col-span-3 mt-4 flex justify-center">
                        <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(Array.isArray(mnemonicToShow) ? mnemonicToShow.join(' ') : '')} className="text-[10px] tracking-widest uppercase">
                            <Copy className="w-3 h-3 mr-2" /> Duplicate Scroll
                        </Button>
                    </div>
                </div>

                <Button size="lg" className="w-full" onClick={startConfirmation}>
                    Decree Saved <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            </Card>
        );
    }

    // 4. Confirm Mnemonic
    if (step === 'confirm') {
        return (
            <Card className="space-y-6 royal-border">
                <div className="text-center space-y-2 px-2">
                    <h2 className="text-xl sm:text-2xl font-black font-heading ornate-title text-primary tracking-wider">Verify Lineage</h2>
                    <p className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-widest leading-relaxed">
                        Reconstruct the sacred order to prove your claim.
                    </p>
                </div>

                {/* Selected Area */}
                <div className="min-h-[100px] sm:min-h-[120px] p-3 sm:p-5 bg-primary/5 rounded-2xl border royal-border border-primary/30 flex flex-wrap gap-2 shadow-inner">
                    {selectedWords.map((word, idx) => (
                        <div key={idx} className="bg-primary text-primary-foreground px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold animate-in zoom-in shadow-lg shadow-primary/20">
                            <span className="mr-1 sm:mr-2 opacity-50 text-[8px] sm:text-[10px]">{idx + 1}.</span>{word}
                        </div>
                    ))}
                    {selectedWords.length === 0 && (
                        <span className="text-primary/30 text-[10px] uppercase tracking-widest self-center mx-auto font-black">Await your command...</span>
                    )}
                </div>

                <div className="flex justify-between items-center text-[10px] px-2 font-black tracking-widest uppercase">
                    <span className={cn(selectedWords.length === 24 ? "text-primary" : "text-muted-foreground")}>
                        {selectedWords.length} / 24 SEALED
                    </span>
                    <button onClick={handleResetSelection} className="text-destructive hover:underline transition-all">Dissolve</button>
                </div>

                {/* Shuffled Pool */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {shuffledWords.map((word, idx) => {
                        const isSelected = selectedWords.includes(word);
                        return (
                            <button
                                key={idx}
                                disabled={isSelected}
                                onClick={() => handleWordSelect(word)}
                                className={cn(
                                    "p-2 sm:p-2.5 rounded-xl text-[9px] sm:text-[10px] font-mono font-bold transition-all duration-300 border uppercase tracking-tighter",
                                    isSelected
                                        ? "opacity-10 cursor-not-allowed border-transparent bg-primary/10"
                                        : "bg-primary/5 border-primary/20 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-primary/30"
                                )}
                            >
                                {word}
                            </button>
                        );
                    })}
                </div>

                <Button
                    size="lg"
                    className="w-full"
                    disabled={!isConfirmationComplete}
                    onClick={finalizeSetup}
                >
                    {isConfirmationComplete ? (
                        <span className="flex items-center tracking-[0.2em]">Ascend to Throne <CheckCircle2 className="ml-2 w-4 h-4" /></span>
                    ) : "Complete the Ritual"}
                </Button>
            </Card>
        );
    }

    return null;
}
