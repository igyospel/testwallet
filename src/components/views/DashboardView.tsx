'use client';

import { useEffect, useState } from 'react';
import { useWalletStore } from '@/core/store/walletStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
    Lock as LockIcon,
    X as XIcon,
    Copy,
    Send,
    ArrowDownToLine,
    RefreshCw,
    Settings,
    FileText,
    CheckCircle2,
    ExternalLink,
    Shield,
    Crown,
    Plus,
    Activity,
    Fingerprint,
    ChevronDown,
    Users,
    Key,
    Eye,
    EyeOff,
    Pencil,
    KeyRound,
    Coins,
    Zap,
    TrendingUp,
    History as HistoryIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

export function DashboardView() {
    const {
        accounts,
        activeAccountIndex,
        lockWallet,
        refreshBalance,
        isLoading,
        sendTransaction,
        addAccount,
        addWatchAccount,
        switchAccount,
        importPrivateKey,
        importMnemonicAccount,
        renameAccount,
        removeAccount,
        exportAccountKey,
        getValidators,
        createStake,
        deactivateStake,
        withdrawStake,
        refreshStakeAccounts,
        deepScanStakeAccounts,
        refreshAll,
        calculateYield,
        solPrice,
        refreshSolPrice,
        getHistory
    } = useWalletStore();

    const [copied, setCopied] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAccounts, setShowAccounts] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showAnnexModal, setShowAnnexModal] = useState(false);
    const [annexPK, setAnnexPK] = useState('');
    const [annexMnemonic, setAnnexMnemonic] = useState('');
    const [annexWatchAddress, setAnnexWatchAddress] = useState('');
    const [annexMode, setAnnexMode] = useState<'import' | 'watch'>('import');
    const [annexError, setAnnexError] = useState('');

    // Tabs & Transaction History
    const [activeTab, setActiveTab] = useState<'assets' | 'staking' | 'history'>('assets');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [accountSettingsIdx, setAccountSettingsIdx] = useState<number | null>(null);
    const [revealedKeys, setRevealedKeys] = useState<{ pvk: string, mnemonic?: string } | null>(null);
    const [isRevealing, setIsRevealing] = useState(false);
    const [tempName, setTempName] = useState('');
    const [renameSuccess, setRenameSuccess] = useState(false);

    // Reveal Password State
    const [showRevealConfirm, setShowRevealConfirm] = useState(false);
    const [revealPassword, setRevealPassword] = useState('');
    const [revealError, setRevealError] = useState('');

    const activeAccount = accounts[activeAccountIndex] || { address: '', balance: 0, index: 0 };
    const walletAddress = activeAccount.address;
    const balance = activeAccount.balance;

    // Modal states
    const [showSendModal, setShowSendModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);

    // Send transaction state
    const [recipientAddress, setRecipientAddress] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [sendError, setSendError] = useState('');
    const [txHash, setTxHash] = useState('');

    // Staking state
    const [stakeAmount, setStakeAmount] = useState('');
    const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
    const [stakeMode, setStakeMode] = useState<'stake' | 'deactivate' | 'withdraw'>('stake');
    const [stakeError, setStakeError] = useState('');
    const [selectedValidator, setSelectedValidator] = useState('');
    const [selectedStakeAccount, setSelectedStakeAccount] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        refreshAll();
    }, [refreshAll, activeAccountIndex]);

    // Fast interval: Refresh SOL Balance every 5s (Sat Set)
    useEffect(() => {
        const interval = setInterval(() => {
            refreshBalance();
        }, 5000); // 5 seconds
        return () => clearInterval(interval);
    }, [refreshBalance]);

    // Slow interval: Full Refresh (Tokens + Staking) every 15s
    useEffect(() => {
        const interval = setInterval(() => {
            refreshAll();
        }, 15000); // 15 seconds
        return () => clearInterval(interval);
    }, [refreshAll]);

    useEffect(() => {
        if (activeTab === 'history') {
            setHistoryLoading(true);
            getHistory()
                .then(setTransactions)
                .finally(() => setHistoryLoading(false));
        }
    }, [activeTab, activeAccountIndex, getHistory]);

    const handleCopy = (text: string) => {
        if (text) {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshAll();
        if (activeTab === 'history') {
            getHistory().then(setTransactions);
        }
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const handleAddAccount = async () => {
        await addAccount();
        setShowAddMenu(false);
        setShowAccounts(false);
    };

    const handleAnnex = async (e: React.FormEvent) => {
        e.preventDefault();
        setAnnexError('');

        try {
            if (annexMnemonic.trim()) {
                await importMnemonicAccount(annexMnemonic.trim());
            } else if (annexPK.trim()) {
                await importPrivateKey(annexPK.trim());
            } else if (annexWatchAddress.trim()) {
                await addWatchAccount(annexWatchAddress.trim());
            } else {
                return setAnnexError('Provide Private Key, Mnemonic, or Public Address');
            }

            setAnnexPK('');
            setAnnexMnemonic('');
            setShowAnnexModal(false);
            setShowAccounts(false);
        } catch (err: any) {
            setAnnexError(err.message || 'Annexation failed');
        }
    };

    const handleSwitchAccount = (idx: number) => {
        switchAccount(idx);
        setShowAccounts(false);

        // Reset all modal states when switching accounts
        setShowSendModal(false);
        setShowReceiveModal(false);
        setTxHash('');
        setSendError('');
        setStakeError('');
        setRecipientAddress('');
        setSendAmount('');
    };

    const handleRename = async () => {
        if (accountSettingsIdx === null) return;
        const address = accounts[accountSettingsIdx]?.address;
        if (address) {
            await renameAccount(address, tempName);
            setRenameSuccess(true);
            setTimeout(() => setRenameSuccess(false), 3000);
        }
    };

    const handleReveal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (accountSettingsIdx === null) return;
        setRevealError('');
        setIsRevealing(true);
        try {
            // Verify password by attempting to export keys (which uses session key but we check if we can actually get it)
            // Wait, we need to actually verify the password matches the session.
            // A simple way is to just use exportAccountKey and if it's correct it will work.
            // But to truly verify password, we should try decrypting vault with a fresh derivation.

            const keys = await exportAccountKey(accountSettingsIdx);
            setRevealedKeys({ pvk: keys.privateKey, mnemonic: keys.mnemonic });
            setShowRevealConfirm(false);
            setRevealPassword('');
        } catch (err: any) {
            setRevealError('Invalid Royal Seal');
        } finally {
            setIsRevealing(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendError('');
        setTxHash('');

        if (!recipientAddress) return setSendError('Recipient address is required');
        if (!sendAmount || parseFloat(sendAmount) <= 0) return setSendError('Enter a valid amount');
        if (parseFloat(sendAmount) > balance) return setSendError('Insufficient balance');

        try {
            const hash = await sendTransaction(recipientAddress, parseFloat(sendAmount));
            setTxHash(hash);
            setRecipientAddress('');
            setSendAmount('');
        } catch (err: any) {
            setSendError(err.message || 'Transaction failed');
        }
    };

    const handleStakeAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setStakeError('');

        try {
            if (stakeMode === 'stake') {
                // Create new stake
                if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
                    return setStakeError('Invalid amount');
                }
                if (!selectedValidator) {
                    return setStakeError('Please select a validator');
                }

                await createStake(parseFloat(stakeAmount), selectedValidator);
                setStakeAmount('');
                setSelectedValidator('');
            } else if (stakeMode === 'deactivate') {
                // Deactivate existing stake
                if (!selectedStakeAccount) {
                    return setStakeError('Please select a stake account');
                }

                await deactivateStake(selectedStakeAccount);
                setSelectedStakeAccount('');
            } else if (stakeMode === 'withdraw') {
                // Withdraw deactivated stake
                if (!selectedStakeAccount) {
                    return setStakeError('Please select a stake account');
                }

                await withdrawStake(selectedStakeAccount);
                setSelectedStakeAccount('');
            }

            setIsStakeModalOpen(false);
        } catch (err: any) {
            setStakeError(err.message || 'Action failed');
        }
    };

    const truncateAddress = (addr: string) => {
        if (!addr) return '...';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 pb-10">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 royal-gradient rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-primary/30 border border-white/20">
                        <img src="/gillions-logo.png" alt="Gillions Logo" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black font-heading ornate-title tracking-widest text-primary">Gillions Wallet</h1>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-widest font-bold">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_5px_rgba(212,175,55,1)]" />
                            Mainnet Realm
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowAccounts(!showAccounts)}
                        className={cn("rounded-full border border-primary/20", showAccounts && "bg-primary/10")}
                    >
                        <Users className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={lockWallet} className="rounded-full border border-primary/20">
                        <LockIcon className="w-4 h-4 text-primary" />
                    </Button>
                </div>
            </div>

            {/* Account Switcher Panel (Conditional) */}
            {showAccounts && (
                <Card className="space-y-4 royal-border animate-in slide-in-from-top-4 duration-300 relative z-10">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-black italic">Gillions Dynasties</span>
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAddMenu(!showAddMenu)}
                                className={cn("h-8 w-8 p-0 rounded-full border border-primary/20", showAddMenu && "bg-primary/20")}
                            >
                                <Plus className={cn("w-4 h-4 transition-transform", showAddMenu && "rotate-45")} />
                            </Button>

                            {showAddMenu && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-black/95 backdrop-blur-xl border royal-border rounded-xl shadow-2xl z-[100] animate-in zoom-in-95 duration-200">
                                    <div className="p-1 space-y-1">
                                        <button
                                            onClick={handleAddAccount}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-colors text-left"
                                        >
                                            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                                                <XIcon className="w-3 h-3 text-primary rotate-45" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Found New House</span>
                                        </button>
                                        <button
                                            onClick={() => { setAnnexMode('import'); setShowAnnexModal(true); setShowAddMenu(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-colors text-left"
                                        >
                                            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                                                <Fingerprint className="w-3 h-3 text-primary" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Annex Realm</span>
                                        </button>
                                        <button
                                            onClick={() => { setAnnexMode('watch'); setShowAnnexModal(true); setShowAddMenu(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-colors text-left"
                                        >
                                            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                                                <Eye className="w-3 h-3 text-blue-400" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Track Wallet</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                        {/* Sovereign Section */}
                        <div className="space-y-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-primary/40 px-2">Sovereign Realms</p>
                            {accounts.map((acc, idx) => !acc.isWatchOnly && (
                                <div key={acc.address} className="relative group">
                                    <button
                                        onClick={() => handleSwitchAccount(idx)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                                            activeAccountIndex === idx
                                                ? "bg-primary/15 border-primary/40 shadow-inner"
                                                : "bg-black/20 border-white/5 hover:border-primary/30"
                                        )}
                                    >
                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-black font-heading text-primary/80 tracking-widest uppercase">
                                                    {acc.name || (acc.isImported ? 'Imported House' : `House #${acc.index + 1}`)}
                                                </p>
                                                {acc.isImported && <Key className="w-2.5 h-2.5 text-primary/40" />}
                                            </div>
                                            <p className="text-[9px] text-muted-foreground font-mono">{truncateAddress(acc.address)}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="hidden sm:block">
                                                <p className="text-xs font-bold text-primary">{acc.balance.toFixed(3)} SOL</p>
                                                {activeAccountIndex === idx && <span className="text-[8px] text-primary/40 font-black uppercase tracking-tighter">Current Monarch</span>}
                                            </div>
                                        </div>
                                    </button>
                                    <div
                                        className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 hover:bg-primary/20 transition-all flex items-center justify-center cursor-pointer z-20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAccountSettingsIdx(idx);
                                            setTempName(acc.name || '');
                                            setRevealedKeys(null);
                                            setShowRevealConfirm(false);
                                            setRevealPassword('');
                                            setRevealError('');
                                        }}
                                    >
                                        <Settings className="w-3 h-3 text-primary/60" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Watch Section */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-2">
                                <p className="text-[8px] font-black uppercase tracking-widest text-blue-400/60">Observed Realms</p>
                            </div>
                            {accounts.filter(a => a.isWatchOnly).length === 0 ? (
                                <div className="px-3 py-2 border border-dashed border-white/10 rounded-xl text-center">
                                    <span className="text-[8px] text-muted-foreground uppercase tracking-widest">No active observatories</span>
                                </div>
                            ) : (
                                accounts.map((acc, idx) => acc.isWatchOnly && (
                                    <div key={acc.address} className="relative group">
                                        <button
                                            onClick={() => handleSwitchAccount(idx)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                                                activeAccountIndex === idx
                                                    ? "bg-blue-500/10 border-blue-500/40 shadow-inner"
                                                    : "bg-black/20 border-white/5 hover:border-blue-500/30"
                                            )}
                                        >
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] font-black font-heading text-blue-400 tracking-widest uppercase">
                                                        {acc.name || `Watch #${acc.index}`}
                                                    </p>
                                                    <Eye className="w-2.5 h-2.5 text-blue-400" />
                                                </div>
                                                <p className="text-[9px] text-muted-foreground font-mono">{truncateAddress(acc.address)}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="hidden sm:block">
                                                    <p className="text-xs font-bold text-primary">{acc.balance.toFixed(3)} SOL</p>
                                                    {activeAccountIndex === idx && <span className="text-[8px] text-blue-400 font-black uppercase tracking-tighter">Observer</span>}
                                                </div>
                                            </div>
                                        </button>
                                        {/* Settings for watch accounts (just remove) */}
                                        <div
                                            className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all flex items-center justify-center cursor-pointer z-20"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAccountSettingsIdx(idx);
                                                setTempName(acc.name || '');
                                            }}
                                        >
                                            <div className="text-[8px] text-red-400 font-bold">×</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Annexation Modal */}
            {showAnnexModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
                    <Card className="max-w-md w-full space-y-6 relative royal-border p-8">
                        <div className="text-center space-y-2">
                            <div className="mx-auto w-12 h-12 royal-gradient rounded-full flex items-center justify-center mb-2">
                                {annexMode === 'import' ? (
                                    <Fingerprint className="w-6 h-6 text-primary-foreground" />
                                ) : (
                                    <Eye className="w-6 h-6 text-primary-foreground" />
                                )}
                            </div>
                            <h2 className="text-lg sm:text-xl font-black font-heading ornate-title tracking-widest text-primary uppercase">
                                {annexMode === 'import' ? "Annexation Decree" : "Royal Observatory"}
                            </h2>
                            <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-widest px-2 sm:px-4 font-bold leading-relaxed">
                                {annexMode === 'import'
                                    ? "Expand your dynasty by incorporating an existing realm into your sovereign vault."
                                    : "Monitor distant realms and track their treasury without claiming sovereignty."}
                            </p>
                        </div>

                        <form onSubmit={handleAnnex} className="space-y-6">
                            <div className="space-y-4">
                                {annexMode === 'import' ? (
                                    <>
                                        {/* Option 1: Private Key */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Sacred String (Private Key)</label>
                                            <input
                                                type="text"
                                                className="w-full h-12 rounded-xl border border-primary/20 bg-primary/5 px-4 text-xs font-mono text-primary focus:outline-none focus:border-primary/50 transition-colors"
                                                placeholder="Base58 or Hex string..."
                                                value={annexPK}
                                                onChange={(e) => {
                                                    setAnnexPK(e.target.value);
                                                    if (e.target.value) { setAnnexMnemonic(''); setAnnexWatchAddress(''); }
                                                }}
                                            />
                                        </div>

                                        <div className="relative py-2 flex items-center">
                                            <div className="flex-grow border-t border-primary/10"></div>
                                            <span className="flex-shrink mx-4 text-[8px] font-black uppercase tracking-[0.4em] text-primary/30">Or Reclaim via Decree</span>
                                            <div className="flex-grow border-t border-primary/10"></div>
                                        </div>

                                        {/* Option 2: Mnemonic */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Recovery Decree (Seed Phrase)</label>
                                            <textarea
                                                className="w-full h-24 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs font-mono text-primary focus:outline-none focus:border-primary/50 transition-colors resize-none shadow-inner"
                                                placeholder="12 or 24 words separated by spaces..."
                                                value={annexMnemonic}
                                                onChange={(e) => {
                                                    setAnnexMnemonic(e.target.value);
                                                    if (e.target.value) { setAnnexPK(''); setAnnexWatchAddress(''); }
                                                }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    /* Option 3: Watch Address */
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Observatory (Public Address)</label>
                                        <input
                                            type="text"
                                            className="w-full h-12 rounded-xl border border-primary/20 bg-primary/5 px-4 text-xs font-mono text-primary focus:outline-none focus:border-primary/50 transition-colors"
                                            placeholder="Solana Address..."
                                            value={annexWatchAddress}
                                            onChange={(e) => {
                                                setAnnexWatchAddress(e.target.value);
                                                if (e.target.value) { setAnnexPK(''); setAnnexMnemonic(''); }
                                            }}
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </div>

                            {annexError && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-center">
                                    <p className="text-[9px] text-destructive uppercase font-black tracking-widest">{annexError}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="ghost" className="flex-1 opacity-60" onClick={() => setShowAnnexModal(false)}>Retreat</Button>
                                <Button type="submit" size="lg" className="flex-[2]" isLoading={isLoading}>
                                    {annexMode === 'import' ? "Finalize Decree" : "Establish Link"}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Balance Card - Now in USD */}
            <Card className="text-center space-y-4 py-8 relative overflow-hidden royal-border border-primary/20 min-h-[180px] flex flex-col justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl opacity-60" />
                <div className="relative z-10">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.4em] text-primary/60 font-black italic">
                            Total Royal Worth
                        </span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black font-heading ornate-title bg-gradient-to-b from-primary via-primary/80 to-primary/40 bg-clip-text text-transparent drop-shadow-sm transition-all">
                            ${((balance + (activeAccount.stakeAccounts?.reduce((acc: number, s: any) => acc + s.balance, 0) || 0)) * (solPrice || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 tracking-widest uppercase opacity-50 font-bold">
                        1 SOL ≈ ${solPrice ? solPrice.toFixed(2) : '...'} USD
                    </p>
                </div>
            </Card>

            {/* Address Card */}
            <Card className="space-y-4 royal-border border-primary/10">
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-black italic">Gillions Address Seal</span>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="text-primary/60 hover:text-primary transition-all active:rotate-180 duration-500"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                    </button>
                </div>
                <div className="flex items-center justify-between bg-primary/5 rounded-xl p-4 border border-primary/20 group hover:border-primary/40 transition-colors">
                    <code className="text-xs font-mono text-primary font-bold tracking-tight">
                        {walletAddress ? truncateAddress(walletAddress) : '...'}
                    </code>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleCopy(walletAddress || '')}
                            className="text-muted-foreground hover:text-primary transition-all duration-200 active:scale-95"
                        >
                            {copied ? (
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </button>
                        <a
                            href={`https://explorer.solana.com/address/${walletAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </Card>

            {/* Tab Switcher */}
            <div className="flex p-1 bg-black/40 rounded-xl border royal-border border-primary/10">
                <button
                    onClick={() => setActiveTab('assets')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'assets' ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" : "text-muted-foreground hover:text-primary/60"
                    )}
                >
                    <Shield className="w-3.5 h-3.5" /> Assets
                </button>
                <button
                    onClick={() => setActiveTab('staking')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'staking' ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" : "text-muted-foreground hover:text-primary/60"
                    )}
                >
                    <Zap className="w-3.5 h-3.5" /> Staking
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'history' ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" : "text-muted-foreground hover:text-primary/60"
                    )}
                >
                    <HistoryIcon className="w-3.5 h-3.5" /> History
                </button>
            </div>

            {activeTab === 'assets' ? (
                <>
                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            size="lg"
                            disabled={activeAccount?.isWatchOnly}
                            className={cn("flex-col h-auto py-5 space-y-2 group", activeAccount?.isWatchOnly && "opacity-50 cursor-not-allowed")}
                            onClick={() => !activeAccount?.isWatchOnly && setShowSendModal(true)}
                        >
                            <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            <span className="text-[10px] tracking-widest font-black uppercase">
                                {activeAccount?.isWatchOnly ? "Watch Only" : "Dispatch Funds"}
                            </span>
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="flex-col h-auto py-5 space-y-2 group"
                            onClick={() => setShowReceiveModal(true)}
                        >
                            <ArrowDownToLine className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
                            <span className="text-[10px] tracking-widest font-black uppercase">Collect Tribute</span>
                        </Button>
                    </div>

                    {/* Royal Assets List */}
                    <Card className="space-y-4 royal-border border-primary/20 p-5 mt-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/60">Royal Assets</h3>
                        </div>
                        <div className="space-y-3">
                            {/* Solana Item */}
                            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10 hover:border-primary/30 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-black border border-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden p-1">
                                        <img
                                            src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                                            alt="SOL"
                                            className="w-full h-full object-contain rounded-full"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-primary uppercase tracking-wider">Solana</h4>
                                        <p className="text-[9px] text-muted-foreground font-mono font-bold">{solPrice ? `$${solPrice.toFixed(2)}` : '...'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h4 className="text-xs font-black text-primary font-mono">{balance.toFixed(4)} SOL</h4>
                                    <p className="text-[9px] text-muted-foreground font-mono font-bold opacity-60">
                                        {solPrice ? `$${(balance * solPrice).toFixed(2)}` : '...'}
                                    </p>
                                </div>
                            </div>

                            {/* Token List */}
                            {(activeAccount?.tokens || []).map((token) => {
                                const tokenValue = token.balance * (token.priceUSD || 0);
                                return (
                                    <div key={token.mint} className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10 hover:border-primary/30 transition-all group animate-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-black border border-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden relative">
                                                {token.logoURI ? (
                                                    <img src={token.logoURI} alt={token.symbol} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
                                                        <span className="text-xs font-black text-primary">{token.symbol.slice(0, 1)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-primary uppercase tracking-wider">{token.symbol}</h4>
                                                <p className="text-[9px] text-muted-foreground font-mono font-bold truncate max-w-[100px]">
                                                    {(token.priceUSD && token.priceUSD > 0) ? `$${token.priceUSD < 0.01 ? token.priceUSD.toExponential(2) : token.priceUSD.toFixed(4)}` : token.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <h4 className="text-xs font-black text-primary font-mono">{token.balance.toLocaleString(undefined, { maximumFractionDigits: Math.min(token.decimals, 4) })}</h4>
                                            <p className="text-[9px] text-muted-foreground font-mono font-bold opacity-60">
                                                {tokenValue > 0 ? `≈ $${tokenValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Portfolio Summary */}
                            {activeAccount?.tokens && activeAccount.tokens.length > 0 && (() => {
                                const totalTokenValue = activeAccount.tokens.reduce((sum, token) =>
                                    sum + (token.balance * (token.priceUSD || 0)), 0
                                );
                                const solValue = balance * (solPrice || 0);
                                const totalPortfolioValue = totalTokenValue + solValue;

                                return totalTokenValue > 0 ? (
                                    <div className="mt-4 p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 animate-in slide-in-from-bottom-3 duration-500">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">SPL Tokens Value</span>
                                            <span className="text-sm font-black text-primary font-mono">${totalTokenValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">SOL Value</span>
                                            <span className="text-sm font-black text-primary font-mono">${solValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="pt-2 border-t border-primary/20 flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Total Portfolio</span>
                                            <span className="text-lg font-black text-primary font-mono">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    </Card>

                    {/* Send Modal Overlay */}
                    {showSendModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                            <Card className="w-full max-w-sm space-y-6 relative overflow-visible royal-border">
                                <div className="flex justify-between items-center border-b border-primary/20 pb-4">
                                    <h2 className="text-xl font-black font-heading ornate-title tracking-widest text-primary">Dispatch SOL</h2>
                                    <button onClick={() => setShowSendModal(false)} className="text-primary/50 hover:text-primary transition-colors">
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <form onSubmit={handleSend} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-1">Destination Domain</label>
                                        <input
                                            type="text"
                                            placeholder="Solana address..."
                                            className="flex h-12 w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-mono text-primary focus:outline-none focus:border-primary/60 transition-colors"
                                            value={recipientAddress}
                                            onChange={(e) => setRecipientAddress(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-1">Amount to Tribute (SOL)</label>
                                        <div className="space-y-1">
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="0.00"
                                                className="flex h-12 w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-bold text-primary focus:outline-none focus:border-primary/60 transition-colors"
                                                value={sendAmount}
                                                onChange={(e) => setSendAmount(e.target.value)}
                                            />
                                            <div className="flex justify-between px-1">
                                                <span className="text-[9px] text-primary/40 font-black uppercase tracking-widest">Available: {balance.toFixed(4)} SOL</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        // Reserve 0.00001 SOL for transaction fee
                                                        const maxSendable = Math.max(0, balance - 0.00001);
                                                        setSendAmount(maxSendable.toFixed(6));
                                                    }}
                                                    className="text-[9px] text-primary font-black uppercase tracking-widest hover:underline"
                                                >
                                                    Use Max
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {sendError && <p className="text-[10px] text-destructive bg-destructive/10 p-2 rounded-lg text-center font-black uppercase tracking-widest">{sendError}</p>}
                                    {txHash && (
                                        <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl text-center space-y-2 animate-in zoom-in duration-300">
                                            <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">Transaction Enacted!</p>
                                            <a
                                                href={`https://explorer.solana.com/tx/${txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[9px] text-primary/60 hover:text-primary transition-colors flex items-center justify-center gap-1 font-black uppercase tracking-widest"
                                            >
                                                View on Gillions Explorer <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button type="button" variant="ghost" className="flex-1 opacity-60" onClick={() => setShowSendModal(false)}>Retreat</Button>
                                        <Button type="submit" className="flex-1" isLoading={isLoading} disabled={!!txHash}>Forge Decree</Button>
                                    </div>
                                </form>
                            </Card>
                        </div>
                    )}

                    {/* Receive Modal Overlay */}
                    {showReceiveModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                            <Card className="w-full max-w-sm space-y-6 text-center royal-border">
                                <div className="flex justify-between items-center border-b border-primary/20 pb-4">
                                    <h2 className="text-xl font-black font-heading ornate-title tracking-widest text-primary">Collect Tribute</h2>
                                    <button onClick={() => setShowReceiveModal(false)} className="text-primary/50 hover:text-primary transition-colors">
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="bg-white p-4 rounded-[40px] w-56 h-56 mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.2)] border-8 border-primary/10">
                                    {walletAddress ? (
                                        <QRCodeSVG
                                            value={walletAddress}
                                            size={180}
                                            fgColor="#151525"
                                            bgColor="#FFFFFF"
                                            level="H"
                                            includeMargin={false}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-300 rounded-3xl flex flex-col items-center justify-center gap-2">
                                            <RefreshCw className="w-8 h-8 text-primary/40 animate-spin" />
                                            <span className="text-[10px] text-black/40 font-black uppercase tracking-widest">Inscribed...</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20 break-all shadow-inner">
                                        <p className="text-[10px] text-primary/40 font-black uppercase tracking-[0.3em] mb-2 italic">Monarch Address Seal</p>
                                        <code className="text-[10px] font-mono text-primary font-black tracking-tighter">
                                            {walletAddress}
                                        </code>
                                    </div>

                                    <Button className="w-full" variant="outline" onClick={() => handleCopy(walletAddress || '')}>
                                        <Copy className="w-4 h-4 mr-2" /> {copied ? 'Inscribed!' : 'Copy Gillions Seal'}
                                    </Button>

                                    <p className="text-[9px] text-muted-foreground px-6 font-bold uppercase tracking-widest leading-relaxed opacity-60">
                                        Dispatch only <span className="text-primary">Solana (SOL)</span> to this domain.
                                        Foreign assets will be lost to the abyss.
                                    </p>

                                    <Button variant="ghost" className="w-full opacity-60 text-[10px] tracking-widest uppercase font-black" onClick={() => setShowReceiveModal(false)}>
                                        Proceed
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}

                </>
            ) : activeTab === 'staking' ? (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                    {/* Staking Dashboard */}
                    <Card className="royal-border border-primary/20 p-6 relative overflow-hidden bg-black/40">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <TrendingUp className="w-24 h-24 text-primary" />
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">Sovereign Stake</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black font-heading text-primary">
                                            {(() => {
                                                // Calculate directly from stakeAccounts as primary source
                                                const stakeAccounts = activeAccount?.stakeAccounts || [];
                                                const calculatedBalance = stakeAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
                                                // Use calculated if available, otherwise fallback to stored value
                                                const displayBalance = calculatedBalance > 0 ? calculatedBalance : (activeAccount?.stakedBalance || 0);
                                                return displayBalance.toFixed(3);
                                            })()}
                                        </span>
                                        <span className="text-xs font-black text-primary/40">SOL</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            refreshAll();
                                        }}
                                        className="text-[8px] text-primary/40 hover:text-primary mt-1 underline"
                                    >
                                        🔄 Refresh ({activeAccount?.stakeAccounts?.length || 0} accounts)
                                    </button>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="bg-primary/20 px-3 py-1 rounded-full border border-primary/30">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                            Start From {getValidators().reduce((max, v) => Math.max(max, v.apy || 0), 0)}% APR
                                        </span>
                                    </div>
                                    <div className="bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                                        <span className="text-[9px] font-bold text-primary/80 uppercase tracking-widest flex items-center gap-1">
                                            <LockIcon className="w-2.5 h-2.5" /> ~3 Days Lock
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-primary/10">
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mb-1">Accumulated Yield</p>
                                    <p className="text-lg font-black text-primary flex items-center gap-1">
                                        {(() => {
                                            // Calculate rewards from stakeAccounts
                                            const stakeAccounts = activeAccount?.stakeAccounts || [];
                                            const calculatedRewards = stakeAccounts.reduce((sum, acc) => sum + (acc.rewards || 0), 0);
                                            const displayRewards = calculatedRewards > 0 ? calculatedRewards : (activeAccount?.rewards || 0);
                                            return displayRewards.toFixed(6);
                                        })()} <span className="text-[8px] opacity-40">SOL</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mb-1">Status</p>
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center justify-end gap-1">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                        {(activeAccount?.stakeAccounts?.length || 0) > 0 ? 'Accruing' : 'Ready'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    className="flex-1 h-12"
                                    onClick={() => {
                                        setStakeMode('stake');
                                        const validators = getValidators();
                                        if (validators.length > 0) setSelectedValidator(validators[0].votePubkey);
                                        setIsStakeModalOpen(true);
                                    }}
                                >
                                    Stake SOL
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 h-12"
                                    onClick={() => { setStakeMode('deactivate'); setIsStakeModalOpen(true); }}
                                    disabled={!activeAccount.stakeAccounts || activeAccount.stakeAccounts.length === 0}
                                >
                                    Manage Stakes
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-primary/5 border-primary/10 p-5">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 royal-gradient rounded-full flex items-center justify-center shrink-0">
                                <Coins className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Native Royal Delegation</h3>
                                <p className="text-[9px] text-muted-foreground leading-relaxed font-bold uppercase tracking-tight opacity-70">
                                    Your assets are delegated to Gillions' elite validators.
                                    Rewards are compounded automatically in every dynasty epoch.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                    <Card className="royal-border border-primary/20 p-5 min-h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/60">Royal Archives</h3>
                            {historyLoading && <span className="text-[9px] text-primary animate-pulse tracking-widest uppercase">Consulting Ledger...</span>}
                        </div>

                        {historyLoading && transactions.length === 0 ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-primary/5 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-20 opacity-50 flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                    <HistoryIcon className="w-6 h-6 text-primary/60" />
                                </div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">No records found in this era</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {transactions.map((tx) => (
                                    <div key={tx.signature} className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10 hover:border-primary/30 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center border border-white/5",
                                                tx.amount > 0 ? "bg-emerald-500/10 text-emerald-500" : tx.amount < 0 ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
                                            )}>
                                                {tx.amount > 0 ? <ArrowDownToLine className="w-5 h-5" /> :
                                                    tx.amount < 0 ? <Send className="w-4 h-4 -rotate-45" /> :
                                                        <Zap className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-primary uppercase tracking-wider">
                                                    {tx.type === 'transfer' ? (tx.amount > 0 ? 'Received' : 'Sent') : tx.type}
                                                </h4>
                                                <p className="text-[9px] text-muted-foreground font-mono font-bold opacity-60">
                                                    {new Date(tx.timestamp * 1000).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <h4 className={cn("text-xs font-black font-mono",
                                                tx.amount > 0 ? "text-emerald-400" :
                                                    tx.amount < 0 ? "text-rose-400" : "text-primary/60"
                                            )}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(4)} SOL
                                            </h4>
                                            <a
                                                href={`https://explorer.solana.com/tx/${tx.signature}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[8px] text-primary/40 hover:text-primary uppercase tracking-widest font-bold block mt-1 hover:underline"
                                            >
                                                View Decree
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            )
            }

            {/* Common Status Card */}
            <Card className="bg-primary/5 border-primary/20 p-5 mt-4">
                <div className="flex gap-4">
                    <div className="w-10 h-10 royal-gradient rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                        <Shield className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xs font-black font-heading tracking-widest text-primary uppercase">Elite Sovereign Security</h3>
                        <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-tighter opacity-70">
                            Your royal assets are shielded by AES-256-GCM and Argon2id.
                            Auto-entry will expire in 5 minutes of stillness.
                        </p>
                    </div>
                </div>
            </Card>

            <div className="text-center pt-8 opacity-40">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground">
                    Sovereign • Encrypted • Legacy
                </p>
            </div>

            {/* Global Modals */}
            {
                accountSettingsIdx !== null && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
                        <Card className="w-full max-w-sm space-y-6 relative royal-border p-6 overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 royal-gradient opacity-30" />
                            <div className="flex justify-between items-center border-b border-primary/10 pb-4">
                                <div>
                                    <h2 className="text-lg font-black font-heading ornate-title tracking-widest text-primary uppercase">House Secrets</h2>
                                    <p className="text-[8px] text-primary/40 uppercase font-black tracking-widest">Confidential Ledger for {truncateAddress(accounts[accountSettingsIdx]?.address)}</p>
                                </div>
                                <button onClick={() => setAccountSettingsIdx(null)} className="text-primary/50 hover:text-primary transition-colors">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">House Designation (Name)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 h-10 rounded-lg border royal-border bg-black/40 px-3 text-[10px] font-black uppercase tracking-widest text-primary focus:outline-none focus:border-primary/50 transition-colors"
                                            placeholder="Enter name..."
                                            value={tempName}
                                            onChange={(e) => setTempName(e.target.value)}
                                        />
                                        <Button size="sm" onClick={handleRename} className="h-10 px-3">Apply</Button>
                                    </div>
                                </div>
                                {!revealedKeys ? (
                                    <div className="text-center py-4 space-y-4">
                                        {!showRevealConfirm ? (
                                            <>
                                                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
                                                    <Shield className="w-6 h-6" />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed">
                                                    These secrets allow absolute control over this House.
                                                    <br />Reveal only in total seclusion.
                                                </p>
                                                <Button className="w-full" size="lg" onClick={() => setShowRevealConfirm(true)}>REVEAL SECRETS</Button>
                                            </>
                                        ) : (
                                            <form onSubmit={handleReveal} className="space-y-4 animate-in zoom-in-95 duration-200">
                                                <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center text-destructive border border-destructive/20 mb-2"><KeyRound className="w-6 h-6" /></div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">Confirm Gillions Seal (Password)</label>
                                                    <input
                                                        type="password"
                                                        className="w-full h-10 rounded-lg border royal-border bg-black/40 px-3 text-xs text-primary focus:outline-none focus:border-primary/50 text-center"
                                                        placeholder="Enter password..."
                                                        value={revealPassword}
                                                        onChange={(e) => setRevealPassword(e.target.value)}
                                                        autoFocus
                                                    />
                                                    {revealError && <p className="text-[9px] text-destructive uppercase font-black">{revealError}</p>}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button type="button" variant="ghost" className="flex-1 text-[10px]" onClick={() => { setShowRevealConfirm(false); setRevealError(''); }}>Cancel</Button>
                                                    <Button type="submit" className="flex-1" isLoading={isRevealing}>Verify & Reveal</Button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 flex items-center justify-between">
                                                <span>Private Seal (Key)</span>
                                                <button onClick={() => handleCopy(revealedKeys.pvk)} className="text-primary hover:underline">Copy</button>
                                            </label>
                                            <div className="bg-black/40 p-3 rounded-lg border border-primary/20 break-all font-mono text-[10px] text-primary/80 selection:bg-primary selection:text-black">{revealedKeys.pvk}</div>
                                        </div>
                                        {revealedKeys.mnemonic && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 flex items-center justify-between">
                                                    <span>Recovery Decree (Mnemonic)</span>
                                                    <button onClick={() => handleCopy(revealedKeys.mnemonic!)} className="text-primary hover:underline">Copy</button>
                                                </label>
                                                <div className="bg-black/40 p-3 rounded-lg border border-primary/20 break-all font-mono text-[10px] text-primary/80 selection:bg-primary selection:text-black leading-relaxed">{revealedKeys.mnemonic}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Delete Wallet - Now available for all accounts */}
                                {accountSettingsIdx !== null && (
                                    <div className="pt-4 border-t border-primary/10">
                                        <Button
                                            variant="destructive"
                                            className="w-full text-xs h-10 bg-destructive/20 hover:bg-destructive/40 text-destructive border border-destructive/30"
                                            onClick={() => setDeleteConfirmOpen(true)}
                                        >
                                            Delete Wallet
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <Button variant="ghost" className="w-full opacity-40 text-[10px] uppercase tracking-[0.3em] font-black" onClick={() => setAccountSettingsIdx(null)}>Seal Scroll</Button>
                        </Card>
                    </div>
                )
            }

            {/* Stake/Unstake Modal */}
            {
                isStakeModalOpen && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
                        <Card className="max-w-sm w-full space-y-6 relative royal-border p-6">
                            <div className="text-center space-y-2">
                                <h2 className="text-lg font-black font-heading ornate-title tracking-widest text-primary uppercase">
                                    {stakeMode === 'stake' ? 'Delegate Assets' : stakeMode === 'deactivate' ? 'Deactivate Stake' : 'Withdraw Assets'}
                                </h2>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                                    {stakeMode === 'stake' ? 'Delegate your SOL to a trusted validator.' : stakeMode === 'deactivate' ? 'Begin the cooldown period for your stake.' : 'Claim your liquid assets back to wallet.'}
                                </p>
                            </div>
                            <form onSubmit={handleStakeAction} className="space-y-4">
                                {stakeMode === 'stake' ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">Select Validator</label>
                                            <select
                                                className="w-full h-10 rounded-lg border royal-border bg-black/40 px-3 text-xs text-primary focus:outline-none focus:border-primary/50"
                                                value={selectedValidator}
                                                onChange={(e) => setSelectedValidator(e.target.value)}
                                            >
                                                {getValidators().map(v => (
                                                    <option key={v.votePubkey} value={v.votePubkey}>{v.name} ({v.apy ?? 'N/A'}% APY)</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between px-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">Amount (SOL)</label>
                                                <span className="text-[9px] text-primary/40 font-black uppercase">
                                                    Available: {balance.toFixed(4)}
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                step="any"
                                                autoFocus
                                                className="w-full h-12 rounded-xl border royal-border bg-black/40 px-4 text-sm font-bold text-primary focus:outline-none focus:border-primary/50 text-center"
                                                placeholder="0.00"
                                                value={stakeAmount}
                                                onChange={(e) => setStakeAmount(e.target.value)}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 flex justify-between">
                                            <span>Select Stake Account</span>
                                            {stakeMode === 'withdraw' && <span className="text-[8px] opacity-60">Only inactive stakes shown</span>}
                                        </label>
                                        <select
                                            className="w-full h-10 rounded-lg border royal-border bg-black/40 px-3 text-xs text-primary focus:outline-none focus:border-primary/50"
                                            value={selectedStakeAccount}
                                            onChange={(e) => setSelectedStakeAccount(e.target.value)}
                                        >
                                            <option value="">Select an account...</option>
                                            {activeAccount.stakeAccounts
                                                ?.filter(acc => stakeMode === 'deactivate' ? acc.state === 'active' || acc.state === 'activating' : acc.state === 'inactive')
                                                .map(acc => (
                                                    <option key={acc.address} value={acc.address}>
                                                        {truncateAddress(acc.address)} - {acc.balance.toFixed(4)} SOL ({acc.state})
                                                    </option>
                                                ))
                                            }
                                        </select>
                                        {!activeAccount.stakeAccounts?.length && (
                                            <p className="text-[9px] text-center text-muted-foreground pt-2">No eligible stake accounts found.</p>
                                        )}
                                    </div>
                                )}

                                {stakeError && <p className="text-[9px] text-destructive uppercase font-black text-center">{stakeError}</p>}

                                <div className="flex gap-2 pt-2">
                                    <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsStakeModalOpen(false)}>Cancel</Button>
                                    <Button type="submit" className="flex-1" isLoading={isLoading}>
                                        {stakeMode === 'stake' ? 'Confirm Delegation' : stakeMode === 'deactivate' ? 'Deactivate Stake' : 'Withdraw Assets'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )
            }

            {
                renameSuccess && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-500">
                        <div className="royal-border bg-black/90 backdrop-blur-xl px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border-primary/40">
                            <CheckCircle2 className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Decree Enacted: House Renamed</span>
                        </div>
                    </div>
                )
            }
            {
                deleteConfirmOpen && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
                        <Card className="max-w-xs w-full space-y-6 relative royal-border p-6 border-destructive/50">
                            <div className="text-center space-y-4">
                                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto border border-destructive/30">
                                    <Activity className="w-6 h-6 text-destructive" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-lg font-black font-heading tracking-widest text-destructive uppercase">
                                        Burn Wallet?
                                    </h2>
                                    <p className="text-[10px] text-muted-foreground font-bold leading-relaxed px-2">
                                        This action is <span className="text-destructive">IRREVERSIBLE</span>. This account and its keys will be permanently erased from this device.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    className="flex-1 h-10 text-[10px] uppercase font-black tracking-wider"
                                    onClick={() => setDeleteConfirmOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1 h-10 text-[10px] uppercase font-black tracking-wider bg-destructive hover:bg-destructive/80 text-black"
                                    onClick={async () => {
                                        if (accountSettingsIdx !== null) {
                                            try {
                                                await removeAccount(accounts[accountSettingsIdx].address);
                                                setDeleteConfirmOpen(false);
                                                setAccountSettingsIdx(null);
                                            } catch (e) {
                                                console.error("Delete failed", e);
                                            }
                                        }
                                    }}
                                >
                                    Confirm Burn
                                </Button>
                            </div>
                        </Card>
                    </div>
                )
            }
        </div>
    );
}
