'use client';

import { create } from 'zustand';
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl, Keypair } from '@solana/web3.js';
import { WalletService } from '@/core/wallet/walletService';
import { CryptoService } from '@/core/security/crypto';
import { SecureStorage } from '@/core/security/storage';
import { SessionManager } from '@/core/security/session';
import { StakingService, StakeAccount, ValidatorInfo } from '@/core/services/staking';
import { TokenService, TokenInfo } from '@/core/services/token';
import { HistoryService, WalletTransaction } from '@/core/services/history';
import { createConnection, getProxyUrl } from '@/core/utils/connection';

interface Account {
    address: string;
    index: number;
    balance: number;
    stakedBalance: number;
    rewards: number;
    name?: string;
    isImported?: boolean;
    isWatchOnly?: boolean; // New: If true, no private key available
    stakeAccounts?: StakeAccount[]; // Native stake accounts
    tokens?: TokenInfo[]; // SPL Tokens
}

interface WalletState {
    isLoading: boolean;
    isUnlocked: boolean;
    hasVault: boolean;
    accounts: Account[];
    activeAccountIndex: number;
    mnemonicToShow: string[] | null;

    initialize: () => Promise<void>;
    createWallet: (password: string) => Promise<void>;
    unlockWallet: (password: string) => Promise<boolean>;
    addAccount: () => Promise<void>;
    addWatchAccount: (address: string, name?: string) => Promise<void>; // New action
    renameAccount: (address: string, name: string) => Promise<void>;
    removeAccount: (address: string) => Promise<void>;
    switchAccount: (index: number) => void;
    lockWallet: () => void;
    confirmSeenMnemonic: () => void;
    refreshBalance: () => Promise<void>;
    getHistory: () => Promise<WalletTransaction[]>;
    getSigner: () => Promise<Keypair>;
    sendTransaction: (to: string, amount: number) => Promise<string>;
    resetWallet: () => Promise<void>;
    importWallet: (mnemonic: string, password: string) => Promise<void>;
    importPrivateKey: (privateKey: string) => Promise<void>;
    importMnemonicAccount: (mnemonic: string) => Promise<void>;
    exportAccountKey: (index: number) => Promise<{ mnemonic?: string; privateKey: string }>;
    getValidators: () => ValidatorInfo[];
    createStake: (amount: number, validatorVotePubkey: string) => Promise<string>;
    deactivateStake: (stakeAddress: string) => Promise<string>;
    withdrawStake: (stakeAddress: string) => Promise<string>;
    refreshStakeAccounts: () => Promise<void>;
    deepScanStakeAccounts: () => Promise<void>;
    refreshAll: () => Promise<void>;
    calculateYield: () => Promise<void>;
    solPrice: number;
    refreshSolPrice: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
    isLoading: true,
    isUnlocked: false,
    hasVault: false,
    accounts: [],
    activeAccountIndex: 0,
    solPrice: 0,
    mnemonicToShow: null,

    initialize: async () => {
        try {
            const has = await SecureStorage.hasVault();
            set({ hasVault: has, isLoading: false });

            // Hook up auto-lock callback
            SessionManager.setOnLock(() => {
                get().lockWallet();
            });

            get().refreshSolPrice();
        } catch (e) {
            console.error('Init failed', e);
            set({ isLoading: false });
        }
    },

    createWallet: async (password: string) => {
        set({ isLoading: true });
        try {
            const mnemonic = WalletService.generateMnemonic();
            const salt = CryptoService.generateSalt();
            const key = await CryptoService.deriveKey(password, salt);

            const encrypted = await CryptoService.encryptWithKey(mnemonic, key, salt);
            await SecureStorage.saveVault(encrypted);
            await SecureStorage.setMetadata('account_count', 1);

            // Establish session
            SessionManager.setKey(key);

            const seed = await WalletService.mnemonicToSeed(mnemonic);
            const kp = WalletService.deriveKeypair(seed, 0);

            set({
                hasVault: true,
                isUnlocked: false, // Wait for them to confirm they saw mnemonic
                mnemonicToShow: mnemonic.split(' '),
                accounts: [{ address: kp.publicKey.toBase58(), index: 0, balance: 0, stakedBalance: 0, rewards: 0 }],
                activeAccountIndex: 0
            });
        } catch (e) {
            console.error("Creation failed", e);
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    unlockWallet: async (password: string) => {
        set({ isLoading: true });
        try {
            const vault = await SecureStorage.getVault();
            if (!vault) throw new Error("No vault found");

            const saltHexPieces = vault.salt.match(/.{1,2}/g);
            if (!saltHexPieces) throw new Error("Invalid salt");
            const salt = new Uint8Array(saltHexPieces.map((b) => parseInt(b, 16)));

            const key = await CryptoService.deriveKey(password, salt);
            const mnemonic = await CryptoService.decryptWithKey(vault, key);

            // If successful, cache session and proceed
            SessionManager.setKey(key);

            const seed = await WalletService.mnemonicToSeed(mnemonic);
            const accountCount = await SecureStorage.getMetadata('account_count') || 1;

            const accounts: Account[] = [];
            // 1. Derived accounts
            for (let i = 0; i < accountCount; i++) {
                const kp = WalletService.deriveKeypair(seed, i);
                accounts.push({ address: kp.publicKey.toBase58(), index: i, balance: 0, stakedBalance: 0, rewards: 0 });
            }

            // 2. Imported accounts
            const importedKeys = await SecureStorage.getMetadata('imported_keys') || [];
            for (const imp of importedKeys) {
                accounts.push({ address: imp.address, index: -1, balance: 0, stakedBalance: 0, rewards: 0, isImported: true });
            }

            // 2b. Watch Accounts
            const watchAccounts = await SecureStorage.getMetadata('watch_accounts') || [];
            for (const wa of watchAccounts) {
                accounts.push({
                    address: wa.address,
                    index: -1,
                    balance: 0,
                    stakedBalance: 0,
                    rewards: 0,
                    name: wa.name, // Pre-assign name
                    isWatchOnly: true
                });
            }

            // 3. Apply Metadata (Names & Staking)
            const meta = await SecureStorage.getMetadata('account_metadata') || {};
            const accountsWithMeta = accounts.map(acc => ({
                ...acc,
                name: meta[acc.address]?.name || acc.name, // Prefer metadata, fallback to existing
                stakedBalance: meta[acc.address]?.stakedBalance || 0,
                rewards: meta[acc.address]?.rewards || 0
            }));

            // 4. Deduplicate by address (keep first occurrence)
            const uniqueAccounts = accountsWithMeta.filter((acc, index, self) =>
                index === self.findIndex(a => a.address === acc.address)
            );

            set({
                isUnlocked: true,
                accounts: uniqueAccounts,
                activeAccountIndex: 0
            });

            console.log('[unlockWallet] Wallet unlocked, triggering balance refresh...');
            get().refreshBalance();
            return true;
        } catch (e) {
            console.warn("Unlock failed", e);
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    addAccount: async () => {
        const key = SessionManager.getKey();
        if (!key) return;

        set({ isLoading: true });
        try {
            const vault = await SecureStorage.getVault();
            if (!vault) return;

            const mnemonic = await CryptoService.decryptWithKey(vault, key);
            const seed = await WalletService.mnemonicToSeed(mnemonic);

            const derivedCount = get().accounts.filter(a => !a.isImported).length;
            const kp = WalletService.deriveKeypair(seed, derivedCount);

            const meta = await SecureStorage.getMetadata('account_metadata') || {};
            const newAccount: Account = {
                address: kp.publicKey.toBase58(),
                index: derivedCount,
                balance: 0,
                stakedBalance: 0,
                rewards: 0,
                name: meta[kp.publicKey.toBase58()]?.name
            };
            const newAccounts = [...get().accounts];
            newAccounts.splice(derivedCount, 0, newAccount);

            await SecureStorage.setMetadata('account_count', derivedCount + 1);

            set({ accounts: newAccounts, activeAccountIndex: derivedCount });
            get().refreshBalance();
        } catch (e) {
            console.error("Add account failed", e);
        } finally {
            set({ isLoading: false });
        }
    },

    importPrivateKey: async (privateKey: string) => {
        const key = SessionManager.getKey();
        if (!key) throw new Error("Wallet locked");

        set({ isLoading: true });
        try {
            const kp = WalletService.fromPrivateKey(privateKey);
            const address = kp.publicKey.toBase58();

            if (get().accounts.find(a => a.address === address)) {
                throw new Error("Account already exists");
            }

            const salt = CryptoService.generateSalt();
            const encrypted = await CryptoService.encryptWithKey(privateKey, key, salt);

            const importedKeys = await SecureStorage.getMetadata('imported_keys') || [];
            importedKeys.push({ address, ...encrypted });
            await SecureStorage.setMetadata('imported_keys', importedKeys);

            const newAccount: Account = { address, index: -1, balance: 0, stakedBalance: 0, rewards: 0, isImported: true };
            const newAccounts = [...get().accounts, newAccount];

            set({ accounts: newAccounts, activeAccountIndex: newAccounts.length - 1 });
            // Small delay to ensure state is updated before refresh
            setTimeout(() => get().refreshBalance(), 100);
        } catch (e: any) {
            console.error("Import PK failed", e);
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    importMnemonicAccount: async (mnemonic: string) => {
        const key = SessionManager.getKey();
        if (!key) throw new Error("Wallet locked");

        set({ isLoading: true });
        try {
            if (!WalletService.validateMnemonic(mnemonic)) {
                throw new Error("Invalid Recovery Decree");
            }

            const seed = await WalletService.mnemonicToSeed(mnemonic);
            const kp = WalletService.deriveKeypair(seed, 0);
            const address = kp.publicKey.toBase58();
            const privateKey = Buffer.from(kp.secretKey).toString('hex');

            if (get().accounts.find(a => a.address === address)) {
                throw new Error("Account already exists");
            }

            const salt = CryptoService.generateSalt();
            const encryptedMnemonic = await CryptoService.encryptWithKey(mnemonic, key, salt);

            const importedKeys = await SecureStorage.getMetadata('imported_keys') || [];
            importedKeys.push({
                address,
                ...encryptedMnemonic,
                isMnemonic: true,
                pvk: privateKey
            });
            await SecureStorage.setMetadata('imported_keys', importedKeys);

            const newAccount: Account = { address, index: -1, balance: 0, stakedBalance: 0, rewards: 0, isImported: true };
            const newAccounts = [...get().accounts, newAccount];

            set({ accounts: newAccounts, activeAccountIndex: newAccounts.length - 1 });
            // Small delay to ensure state is updated before refresh
            setTimeout(() => get().refreshBalance(), 100);
        } catch (e: any) {
            console.error("Import Mnemonic failed", e);
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    addWatchAccount: async (address: string, name?: string) => {
        set({ isLoading: true });
        try {
            // Validate address
            try {
                new PublicKey(address);
            } catch (e) {
                throw new Error("Invalid Solana address");
            }

            const { accounts } = get();

            // Limit checks
            if (accounts.length >= 20) throw new Error("Account limit reached");
            if (accounts.some(a => a.address === address)) throw new Error("Account already exists");

            const watchAccounts = await SecureStorage.getMetadata('watch_accounts') || [];
            if (watchAccounts.some((w: any) => w.address === address)) throw new Error("Watch account already exists");

            const accountName = name || `Watch ${address.slice(0, 4)}...`;

            // Persist
            watchAccounts.push({ address, name: accountName });
            await SecureStorage.setMetadata('watch_accounts', watchAccounts);

            const newAccount: Account = {
                address,
                index: -1,
                balance: 0,
                stakedBalance: 0,
                rewards: 0,
                name: accountName,
                isWatchOnly: true
            };

            const updatedAccounts = [...accounts, newAccount];
            set({ accounts: updatedAccounts, activeAccountIndex: updatedAccounts.length - 1 });

            // Fetch data
            setTimeout(() => get().refreshAll(), 100);

        } catch (e) {
            console.error('Add Watch Account Failed:', e);
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    renameAccount: async (address: string, name: string) => {
        const meta = await SecureStorage.getMetadata('account_metadata') || {};
        meta[address] = { ...meta[address], name };
        await SecureStorage.setMetadata('account_metadata', meta);

        const newAccounts = get().accounts.map(acc =>
            acc.address === address ? { ...acc, name } : acc
        );
        set({ accounts: newAccounts });
    },

    removeAccount: async (address: string) => {
        set({ isLoading: true });
        try {
            const { accounts, activeAccountIndex } = get();
            const accountToRemove = accounts.find(a => a.address === address);
            if (!accountToRemove) throw new Error("Account not found");

            // 1. Safety check - prevent deleting the last account
            if (accounts.length <= 1) {
                throw new Error("Cannot remove the last account. At least one account must remain.");
            }

            // 2. Remove from storage based on account type
            if (accountToRemove.isImported) {
                // Remove from imported_keys
                const importedKeys = await SecureStorage.getMetadata('imported_keys') || [];
                const newKeys = importedKeys.filter((k: any) => k.address !== address);
                await SecureStorage.setMetadata('imported_keys', newKeys);
            } else if (accountToRemove.isWatchOnly) {
                // Remove from watch_accounts
                const watchAccounts = await SecureStorage.getMetadata('watch_accounts') || [];
                const newWatch = watchAccounts.filter((w: any) => w.address !== address);
                await SecureStorage.setMetadata('watch_accounts', newWatch);
            } else {
                // For derived accounts, we need to track which indices are "deleted"
                // For simplicity, we'll just remove from local state
                // Note: This doesn't actually delete from the seed, just hides it
                // A more robust solution would track deleted indices
            }

            // 3. Update local state
            const newAccounts = accounts.filter(a => a.address !== address);

            // Adjust active index
            let newIndex = activeAccountIndex;
            if (activeAccountIndex >= newAccounts.length) {
                newIndex = Math.max(0, newAccounts.length - 1);
            } else if (accounts[activeAccountIndex].address === address) {
                newIndex = 0;
            }

            set({ accounts: newAccounts, activeAccountIndex: newIndex });

            // 4. Cleanup metadata
            const meta = await SecureStorage.getMetadata('account_metadata') || {};
            if (meta[address]) {
                delete meta[address];
                await SecureStorage.setMetadata('account_metadata', meta);
            }

        } catch (e) {
            console.error("Remove account failed", e);
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    switchAccount: (index: number) => {
        if (index >= 0 && index < get().accounts.length) {
            set({ activeAccountIndex: index });
            get().refreshBalance();
        }
    },

    lockWallet: () => {
        SessionManager.clear();
        set({
            isUnlocked: false,
            accounts: [],
            activeAccountIndex: 0,
            mnemonicToShow: null,
        });
    },

    confirmSeenMnemonic: () => {
        set({ mnemonicToShow: null, isUnlocked: true });
        get().refreshBalance();
    },

    refreshBalance: async () => {
        const { accounts, activeAccountIndex } = get();
        const activeAccount = accounts[activeAccountIndex];
        if (!activeAccount) {
            return;
        }

        try {
            // Use our proxied connection to bypass CORS
            const connection = createConnection('confirmed');
            const pubKey = new PublicKey(activeAccount.address);
            const stakingService = new StakingService(getProxyUrl());

            // 1. Fetch Main Balance
            const bal = await connection.getBalance(pubKey);
            const balanceInSol = bal / LAMPORTS_PER_SOL;

            // 2. Fast Update for Known Stake Accounts (if any)
            let newStakeAccounts = activeAccount.stakeAccounts || [];

            if (newStakeAccounts.length > 0) {
                const knownAddresses = newStakeAccounts.map(s => s.address);
                try {
                    const updatedStakes = await stakingService.getMultipleStakeAccounts(knownAddresses);
                    if (updatedStakes.length > 0) {
                        // Smart merge: Update with fresh data but preserve fields that weren't fetched
                        newStakeAccounts = newStakeAccounts.map(old => {
                            const fresh = updatedStakes.find(f => f.address === old.address);
                            if (fresh) {
                                // Merge: Use fresh data where available, keep old data otherwise
                                return {
                                    ...old,
                                    balance: fresh.balance, // Always update balance
                                    state: fresh.state || old.state, // Update state if available
                                    delegatedValidator: fresh.delegatedValidator || old.delegatedValidator, // Preserve validator
                                    rewards: (fresh.rewards !== undefined && fresh.rewards > 0) ? fresh.rewards : old.rewards // Update rewards if fresh has it
                                };
                            }
                            return old;
                        });
                    }
                } catch (e) {
                    console.warn('[refreshBalance] Fast stake update failed:', e);
                }
            }

            // ALWAYS recalculate totals from actual stakeAccounts array
            // This ensures we never show 0 if accounts exist
            const totalStaked = newStakeAccounts.reduce((acc, s) => acc + (s.balance || 0), 0);
            const totalRewards = newStakeAccounts.reduce((acc, s) => acc + (s.rewards || 0), 0);

            console.log(`[refreshBalance] Updated: ${newStakeAccounts.length} stake accounts, Total: ${totalStaked.toFixed(4)} SOL, Rewards: ${totalRewards.toFixed(6)} SOL`);

            // Atomic State Update
            const updatedAccounts = [...accounts];
            updatedAccounts[activeAccountIndex] = {
                ...activeAccount,
                balance: balanceInSol,
                stakeAccounts: newStakeAccounts,
                stakedBalance: totalStaked,
                rewards: totalRewards
            };

            set({ accounts: updatedAccounts });

        } catch (e) {
            // Silent fail for fast poll
        }
    },


    getHistory: async () => {
        const { accounts, activeAccountIndex } = get();
        const activeAccount = accounts[activeAccountIndex];
        if (!activeAccount) return [];

        try {
            const connection = createConnection('confirmed');
            const historyService = new HistoryService(connection);
            // Limit to 10 transactions to avoid RPC rate limits
            return await historyService.getHistory(activeAccount.address, 10);
        } catch (e) {
            console.error('Failed to get history', e);
            return [];
        }
    },

    getSigner: async () => {
        const key = SessionManager.getKey();
        if (!key) throw new Error("Wallet locked");

        const activeAccount = get().accounts[get().activeAccountIndex];
        if (!activeAccount) throw new Error("No active account");

        if (activeAccount.isImported) {
            const importedKeys = await SecureStorage.getMetadata('imported_keys') || [];
            const imp = importedKeys.find((k: any) => k.address === activeAccount.address);
            if (!imp) throw new Error("Imported key not found");

            const decrypted = await CryptoService.decryptWithKey(imp, key);
            // If it was a mnemonic import, decrypted is the mnemonic, we need the pvk we stored
            const pk = imp.isMnemonic ? imp.pvk : decrypted;
            return WalletService.fromPrivateKey(pk);
        } else {
            const vault = await SecureStorage.getVault();
            if (!vault) throw new Error("No vault found found");

            const mnemonic = await CryptoService.decryptWithKey(vault, key);
            const seed = await WalletService.mnemonicToSeed(mnemonic);
            return WalletService.deriveKeypair(seed, activeAccount.index);
        }
    },

    sendTransaction: async (to: string, amount: number) => {
        set({ isLoading: true });
        try {
            const signer = await get().getSigner();
            const connection = createConnection('confirmed');

            const signature = await WalletService.transferSOL(
                connection,
                signer,
                to,
                amount
            );

            // Refresh balance after a short delay to allow transaction to propagate
            setTimeout(() => get().refreshBalance(), 2000);

            return signature;
        } catch (e) {
            console.error("Transaction failed", e);
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    resetWallet: async () => {
        set({ isLoading: true });
        try {
            await SecureStorage.clearVault();
            await SecureStorage.clearAllMetadata();
            SessionManager.clear();
            set({
                hasVault: false,
                isUnlocked: false,
                accounts: [],
                activeAccountIndex: 0,
                mnemonicToShow: null,
            });
        } catch (e) {
            console.error("Reset failed", e);
        } finally {
            set({ isLoading: false });
        }
    },

    importWallet: async (mnemonic: string, password: string) => {
        set({ isLoading: true });
        try {
            if (!WalletService.validateMnemonic(mnemonic)) {
                throw new Error("Invalid Recovery Decree");
            }

            const seed = await WalletService.mnemonicToSeed(mnemonic);
            const keypair = WalletService.deriveKeypair(seed);

            const salt = CryptoService.generateSalt();
            const key = await CryptoService.deriveKey(password, salt);
            const encrypted = await CryptoService.encryptWithKey(mnemonic, key, salt);

            await SecureStorage.saveVault(encrypted);
            await SecureStorage.setMetadata('account_count', 1);

            SessionManager.setKey(key);

            set({
                hasVault: true,
                isUnlocked: true,
                mnemonicToShow: null,
                accounts: [{ address: keypair.publicKey.toBase58(), index: 0, balance: 0, stakedBalance: 0, rewards: 0 }],
                activeAccountIndex: 0
            });

            get().refreshBalance();
        } catch (e) {
            console.error("Import failed", e);
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    exportAccountKey: async (index: number) => {
        const key = SessionManager.getKey();
        if (!key) throw new Error("Wallet locked");

        const account = get().accounts[index];
        if (!account) throw new Error("Account not found");

        if (account.isImported) {
            const importedKeys = await SecureStorage.getMetadata('imported_keys') || [];
            const imp = importedKeys.find((k: any) => k.address === account.address);
            if (!imp) throw new Error("Imported key not found");

            const decrypted = await CryptoService.decryptWithKey(imp, key);
            if (imp.isMnemonic) {
                return { mnemonic: decrypted, privateKey: imp.pvk || '' };
            }
            return { privateKey: decrypted };
        } else {
            const vault = await SecureStorage.getVault();
            if (!vault) throw new Error("No vault found found");

            const mnemonic = await CryptoService.decryptWithKey(vault, key);
            const seed = await WalletService.mnemonicToSeed(mnemonic);
            const kp = WalletService.deriveKeypair(seed, account.index);
            const privateKey = Buffer.from(kp.secretKey).toString('hex');

            return { mnemonic, privateKey };
        }
    },

    getValidators: () => {
        return StakingService.getRecommendedValidators();
    },

    createStake: async (amount: number, validatorVotePubkey: string) => {
        const { accounts, activeAccountIndex } = get();
        const activeAccount = accounts[activeAccountIndex];

        if (!activeAccount || activeAccount.balance < amount) {
            throw new Error("Insufficient balance");
        }

        const signer = await get().getSigner();
        const connection = createConnection('confirmed');
        const stakingService = new StakingService(getProxyUrl());

        // Create stake account and delegate
        const { stakeAccount, signature } = await stakingService.createStakeAccount(
            signer,
            amount * LAMPORTS_PER_SOL,
            validatorVotePubkey
        );

        console.log('Stake account created:', stakeAccount.toBase58());
        console.log('Transaction signature:', signature);

        // OPTIMISTIC UPDATE: Immediately add the new stake account to state
        // This prevents the "0 balance" issue while waiting for RPC indexer
        const newStakeAccount = {
            address: stakeAccount.toBase58(),
            balance: amount,
            state: 'activating' as const,
            delegatedValidator: validatorVotePubkey,
            rewards: 0
        };

        const currentStakeAccounts = activeAccount.stakeAccounts || [];
        const updatedStakeAccounts = [...currentStakeAccounts, newStakeAccount];
        const newTotalStaked = updatedStakeAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

        // Update state immediately
        const updatedAccounts = [...get().accounts];
        updatedAccounts[activeAccountIndex] = {
            ...activeAccount,
            stakeAccounts: updatedStakeAccounts,
            stakedBalance: newTotalStaked,
            balance: activeAccount.balance - amount // Deduct from main balance
        };
        set({ accounts: updatedAccounts });

        // Persist to cache AND add to known addresses list
        SecureStorage.getMetadata('account_metadata').then(meta => {
            const m = meta || {};
            const am = m[activeAccount.address] || {};
            am.lastKnownStakeAccounts = updatedStakeAccounts;

            // Add to known addresses for fast future fetching
            const currentKnownAddresses = am.knownStakeAddresses || [];
            am.knownStakeAddresses = Array.from(new Set([
                ...currentKnownAddresses,
                stakeAccount.toBase58()
            ]));

            m[activeAccount.address] = am;
            SecureStorage.setMetadata('account_metadata', m);
        }).catch(() => { });

        // Background refresh to get accurate data from chain (will merge with our optimistic update)
        setTimeout(() => get().refreshAll(), 2000);

        return signature;
    },

    deactivateStake: async (stakeAddress: string) => {
        const signer = await get().getSigner();
        const stakingService = new StakingService(getProxyUrl());

        const signature = await stakingService.deactivateStake(signer, stakeAddress);

        console.log('Stake deactivated:', signature);

        // Refresh stake accounts
        await get().refreshStakeAccounts();

        return signature;
    },

    withdrawStake: async (stakeAddress: string) => {
        const signer = await get().getSigner();
        const stakingService = new StakingService(getProxyUrl());

        // Get stake account info to withdraw full amount
        const stakeInfo = await stakingService.getStakeAccountInfo(stakeAddress);

        if (!stakeInfo) {
            throw new Error('Stake account not found');
        }

        if (stakeInfo.state !== 'inactive') {
            throw new Error('Stake must be fully deactivated before withdrawal');
        }

        const signature = await stakingService.withdrawStake(
            signer,
            stakeAddress,
            stakeInfo.balance * LAMPORTS_PER_SOL
        );

        console.log('Stake withdrawn:', signature);

        // Refresh balances and stake accounts atomically
        await get().refreshAll();

        return signature;
    },

    // Manual deep scan for stake accounts (slow, only use when needed)
    deepScanStakeAccounts: async () => {
        const { accounts, activeAccountIndex } = get();
        const activeAccount = accounts[activeAccountIndex];
        if (!activeAccount) return;

        try {
            const stakingService = new StakingService(getProxyUrl());

            // Perform full RPC scan (slow but comprehensive)
            const scannedStakes = await stakingService.getStakeAccountsForWallet(activeAccount.address);

            if (scannedStakes.length > 0) {
                // Merge with existing
                const existing = activeAccount.stakeAccounts || [];
                const merged = [...existing];

                scannedStakes.forEach(scanned => {
                    const idx = merged.findIndex(e => e.address === scanned.address);
                    if (idx >= 0) {
                        merged[idx] = scanned;
                    } else {
                        merged.push(scanned);
                    }
                });

                // Update state and metadata
                const totalStaked = merged.reduce((sum, acc) => sum + (acc.balance || 0), 0);
                const totalRewards = merged.reduce((sum, acc) => sum + (acc.rewards || 0), 0);

                const updatedAccounts = [...get().accounts];
                updatedAccounts[activeAccountIndex] = {
                    ...activeAccount,
                    stakeAccounts: merged,
                    stakedBalance: totalStaked,
                    rewards: totalRewards
                };
                set({ accounts: updatedAccounts });

                // Update known addresses
                const meta = await SecureStorage.getMetadata('account_metadata') || {};
                const am = meta[activeAccount.address] || {};
                am.lastKnownStakeAccounts = merged;
                am.knownStakeAddresses = merged.map(acc => acc.address);
                meta[activeAccount.address] = am;
                await SecureStorage.setMetadata('account_metadata', meta);
            }
        } catch (e) {
            console.error('Deep scan failed:', e);
            throw e;
        }
    },

    refreshStakeAccounts: async () => {
        const { accounts, activeAccountIndex } = get();
        const activeAccount = accounts[activeAccountIndex];

        if (!activeAccount) return;

        const stakingService = new StakingService(getProxyUrl());
        const stakeAccounts = await stakingService.getStakeAccountsForWallet(activeAccount.address);

        // Calculate total staked and rewards
        let totalStaked = 0;
        let totalRewards = 0;

        stakeAccounts.forEach(stake => {
            totalStaked += stake.balance;
            totalRewards += stake.rewards || 0;
        });

        // Update account with stake info
        const updatedAccounts = [...accounts];
        updatedAccounts[activeAccountIndex] = {
            ...activeAccount,
            stakeAccounts,
            stakedBalance: totalStaked,
            rewards: totalRewards
        };

        set({ accounts: updatedAccounts });
    },

    // Atomic refresh of both balance and stake accounts to prevent race conditions
    refreshAll: async () => {
        const { accounts, activeAccountIndex } = get();
        const activeAccount = accounts[activeAccountIndex];
        if (!activeAccount) return;

        try {
            const connection = createConnection('confirmed');
            const pubKey = new PublicKey(activeAccount.address);
            const stakingService = new StakingService(getProxyUrl());

            let newBalance = activeAccount.balance;
            let newStakeAccounts = activeAccount.stakeAccounts || [];
            let newTokens = activeAccount.tokens || [];

            // Parallel Execution for Speed ("Sat Set")
            // Balance is fastest, Tokens medium, Stakes slowest

            const balancePromise = connection.getBalance(pubKey)
                .then(bal => newBalance = bal / LAMPORTS_PER_SOL)
                .catch(err => console.warn('[refreshAll] Balance failed:', err));

            const tokenPromise = new TokenService(connection).getTokensForWallet(activeAccount.address)
                .then(tokens => {
                    newTokens = tokens;
                    // Persist tokens
                    SecureStorage.getMetadata('account_metadata').then(meta => {
                        const m = meta || {};
                        const am = m[activeAccount.address] || {};
                        am.tokens = tokens;
                        m[activeAccount.address] = am;
                        SecureStorage.setMetadata('account_metadata', m);
                    }).catch(() => { });
                })
                .catch(err => {
                    console.warn('[refreshAll] Tokens failed:', err);
                    // Try load cache
                    return SecureStorage.getMetadata('account_metadata').then(meta => {
                        if (meta && meta[activeAccount.address]?.tokens) {
                            newTokens = meta[activeAccount.address].tokens;
                        }
                    }).catch(() => { });
                });

            // Stake fetch - OPTIMIZED: Use tracked addresses instead of slow RPC scan
            const stakePromise = (async () => {
                try {
                    // Get list of known stake addresses from metadata
                    const meta = await SecureStorage.getMetadata('account_metadata');
                    const knownStakeAddresses = meta?.[activeAccount.address]?.knownStakeAddresses || [];

                    let fetchedStakes: any[] = [];

                    // If we have known addresses, fetch them directly (FAST)
                    if (knownStakeAddresses.length > 0) {
                        console.log(`[refreshAll] Fetching ${knownStakeAddresses.length} known stake accounts...`);
                        fetchedStakes = await stakingService.getMultipleStakeAccounts(knownStakeAddresses);
                    } else {
                        // IMPORTANT: If no known addresses, do initial discovery scan
                        console.log('[refreshAll] No known stake addresses, performing initial discovery scan...');
                        fetchedStakes = await stakingService.getStakeAccountsForWallet(activeAccount.address);

                        // Save discovered addresses for future fast fetching
                        if (fetchedStakes.length > 0) {
                            const discoveredAddresses = fetchedStakes.map(s => s.address);
                            const m = meta || {};
                            const am = m[activeAccount.address] || {};
                            am.knownStakeAddresses = discoveredAddresses;
                            m[activeAccount.address] = am;
                            await SecureStorage.setMetadata('account_metadata', m);
                            console.log(`[refreshAll] Discovered and saved ${discoveredAddresses.length} stake accounts`);
                        }
                    }

                    // Merge with existing optimistic updates
                    const existingAccounts = activeAccount.stakeAccounts || [];
                    const mergedAccounts = [...existingAccounts];

                    // Update existing accounts with fresh data
                    fetchedStakes.forEach(rpcAccount => {
                        const existingIndex = mergedAccounts.findIndex(acc => acc.address === rpcAccount.address);
                        if (existingIndex >= 0) {
                            mergedAccounts[existingIndex] = rpcAccount;
                        } else {
                            mergedAccounts.push(rpcAccount);
                        }
                    });

                    // Remove accounts that no longer exist (balance = 0 and confirmed by RPC)
                    const validAccounts = mergedAccounts.filter(acc => {
                        // Keep if we fetched it and it has balance
                        const fetched = fetchedStakes.find(f => f.address === acc.address);
                        if (fetched) return fetched.balance > 0;
                        // Keep optimistic updates (not yet confirmed by RPC)
                        return true;
                    });

                    newStakeAccounts = validAccounts;

                    // Update known addresses list
                    const updatedKnownAddresses = Array.from(new Set([
                        ...knownStakeAddresses,
                        ...validAccounts.map(acc => acc.address)
                    ]));

                    // Persist both accounts and address list
                    const m = meta || {};
                    const am = m[activeAccount.address] || {};
                    am.lastKnownStakeAccounts = validAccounts;
                    am.knownStakeAddresses = updatedKnownAddresses;
                    m[activeAccount.address] = am;
                    await SecureStorage.setMetadata('account_metadata', m);

                } catch (e) {
                    console.error('[refreshAll] Stake fetch failed:', e);
                    // On error, try to load from cache
                    try {
                        const meta = await SecureStorage.getMetadata('account_metadata');
                        if (meta?.[activeAccount.address]?.lastKnownStakeAccounts) {
                            newStakeAccounts = meta[activeAccount.address].lastKnownStakeAccounts;
                            console.log('[refreshAll] Loaded stake accounts from cache');
                        } else {
                            newStakeAccounts = activeAccount.stakeAccounts || [];
                        }
                    } catch (cacheErr) {
                        newStakeAccounts = activeAccount.stakeAccounts || [];
                    }
                }
            })();

            // Wait for critical data (Balance + Tokens) first to feel snappy?
            // Actually, waiting for ALL is safer for atomic update, but we want speed.
            // Let's await all. Parallelism saves the delays we removed.

            await Promise.all([balancePromise, tokenPromise, stakePromise]);

            // Calculate totals
            let totalStaked = 0;
            let totalRewards = 0;
            newStakeAccounts.forEach(stake => {
                totalStaked += stake.balance;
                totalRewards += stake.rewards || 0;
            });

            // Single atomic update
            const updatedAccounts = [...get().accounts]; // re-get accounts safely
            updatedAccounts[activeAccountIndex] = {
                ...activeAccount,
                balance: newBalance,
                stakeAccounts: newStakeAccounts,
                stakedBalance: totalStaked,
                rewards: totalRewards,
                tokens: newTokens
            };

            set({ accounts: updatedAccounts });
        } catch (e) {
            console.error('[refreshAll] Critical failure:', e);
        }
    },

    calculateYield: async () => {
        // For native staking, yields are calculated on-chain
        // We just refresh all data atomically
        await get().refreshAll();
        await get().refreshSolPrice();
    },

    refreshSolPrice: async () => {
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await res.json();
            if (data.solana?.usd) {
                set({ solPrice: data.solana.usd });
            }
        } catch (e) {
            console.error("Failed to fetch SOL price", e);
        }
    }
}));
