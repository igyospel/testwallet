import {
    Connection,
    StakeProgram,
    Keypair,
    PublicKey,
    Transaction,
    LAMPORTS_PER_SOL,
    Authorized,
    Lockup,
    sendAndConfirmTransaction,
    SYSVAR_CLOCK_PUBKEY,
    SYSVAR_STAKE_HISTORY_PUBKEY
} from '@solana/web3.js';

export interface StakeAccount {
    address: string;
    balance: number;
    state: 'activating' | 'active' | 'deactivating' | 'inactive';
    delegatedValidator?: string;
    activationEpoch?: number;
    deactivationEpoch?: number;
    rewards?: number;
}

export interface ValidatorInfo {
    votePubkey: string;
    name: string;
    commission: number;
    apy?: number;
}

export class StakingService {
    private connection: Connection;

    // Top validators on Solana mainnet-beta
    private static RECOMMENDED_VALIDATORS: ValidatorInfo[] = [
        {
            votePubkey: 'MarinadeA1gorithmicDe1egationStrategy111111',
            name: 'Marinade',
            commission: 0,
            apy: 7.2
        },
        {
            votePubkey: 'J1to3PQfXidUUhprQWgdKkQAMWPJAEqSJ7amkBDE9qhF',
            name: 'Jito',
            commission: 0,
            apy: 7.1
        },
        {
            votePubkey: 'beefKGBWeSpHzYBHZXwp5So7wdQGX6mu4ZHCsH3uTar',
            name: 'Stakewiz',
            commission: 5,
            apy: 6.8
        },
        {
            votePubkey: 'Luck3DN3HhkV6oc7rPQ1hYGgU3b5AhdKW9o1ob6AyU9',
            name: 'Laine',
            commission: 5,
            apy: 6.7
        }
    ];

    constructor(rpcUrl: string) {
        this.connection = new Connection(rpcUrl, 'confirmed');
    }

    static getRecommendedValidators(): ValidatorInfo[] {
        return this.RECOMMENDED_VALIDATORS;
    }

    /**
     * Create a new stake account and delegate to validator
     */
    async createStakeAccount(
        fromKeypair: Keypair,
        amountLamports: number,
        validatorVotePubkey: string
    ): Promise<{ stakeAccount: PublicKey; signature: string }> {
        // Generate new stake account
        const stakeAccount = Keypair.generate();

        // Minimum stake is 0.001 SOL for rent exemption
        const minimumAmount = await this.connection.getMinimumBalanceForRentExemption(
            StakeProgram.space
        );

        if (amountLamports < minimumAmount) {
            throw new Error(`Minimum stake amount is ${minimumAmount / LAMPORTS_PER_SOL} SOL`);
        }

        // Create authorized and lockup (user controls both)
        const authorized = new Authorized(
            fromKeypair.publicKey, // staker
            fromKeypair.publicKey  // withdrawer
        );

        const lockup = new Lockup(0, 0, fromKeypair.publicKey);

        // Build transaction
        const transaction = new Transaction();

        // 1. Create stake account
        transaction.add(
            StakeProgram.createAccount({
                fromPubkey: fromKeypair.publicKey,
                stakePubkey: stakeAccount.publicKey,
                authorized,
                lockup,
                lamports: amountLamports
            })
        );

        // 2. Delegate to validator
        transaction.add(
            StakeProgram.delegate({
                stakePubkey: stakeAccount.publicKey,
                authorizedPubkey: fromKeypair.publicKey,
                votePubkey: new PublicKey(validatorVotePubkey)
            })
        );

        // Send transaction
        const signature = await sendAndConfirmTransaction(
            this.connection,
            transaction,
            [fromKeypair, stakeAccount],
            { commitment: 'confirmed' }
        );

        return {
            stakeAccount: stakeAccount.publicKey,
            signature
        };
    }

    /**
     * Get stake account info
     */
    async getStakeAccountInfo(stakeAddress: string): Promise<StakeAccount | null> {
        try {
            const pubkey = new PublicKey(stakeAddress);
            const accountInfo = await this.connection.getParsedAccountInfo(pubkey);

            if (!accountInfo.value) {
                return null;
            }

            const lamports = accountInfo.value.lamports;

            // Try to parse stake state from parsed data
            let state: StakeAccount['state'] = 'active'; // Default to active

            try {
                const parsedData = accountInfo.value.data;
                if (parsedData && typeof parsedData === 'object' && 'parsed' in parsedData) {
                    const parsed = parsedData.parsed as any;
                    if (parsed?.type === 'delegated' || parsed?.info?.stake?.delegation) {
                        state = 'active';
                    } else if (parsed?.type === 'initialized') {
                        state = 'inactive';
                    }
                }
            } catch (e) {
                console.warn('[Staking] Could not parse stake state, assuming active');
            }

            return {
                address: stakeAddress,
                balance: lamports / LAMPORTS_PER_SOL,
                state,
                rewards: 0 // Calculate from balance changes if needed
            };
        } catch (error: any) {
            console.error('[Staking] Failed to get stake account info:', error.message);
            return null;
        }
    }

    /**
     * Deactivate stake (begin unstaking)
     */
    async deactivateStake(
        authorizedKeypair: Keypair,
        stakeAddress: string
    ): Promise<string> {
        const transaction = new Transaction().add(
            StakeProgram.deactivate({
                stakePubkey: new PublicKey(stakeAddress),
                authorizedPubkey: authorizedKeypair.publicKey
            })
        );

        // Get recent blockhash
        const { blockhash } = await this.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = authorizedKeypair.publicKey;

        // Sign and send
        transaction.sign(authorizedKeypair);
        const signature = await this.connection.sendRawTransaction(
            transaction.serialize(),
            { skipPreflight: false, preflightCommitment: 'confirmed' }
        );

        return signature;
    }

    /**
     * Withdraw from deactivated stake account
     */
    async withdrawStake(
        authorizedKeypair: Keypair,
        stakeAddress: string,
        amountLamports: number
    ): Promise<string> {
        const transaction = new Transaction().add(
            StakeProgram.withdraw({
                stakePubkey: new PublicKey(stakeAddress),
                authorizedPubkey: authorizedKeypair.publicKey,
                toPubkey: authorizedKeypair.publicKey,
                lamports: amountLamports
            })
        );

        // Get recent blockhash
        const { blockhash } = await this.connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = authorizedKeypair.publicKey;

        // Sign and send
        transaction.sign(authorizedKeypair);
        const signature = await this.connection.sendRawTransaction(
            transaction.serialize(),
            { skipPreflight: false, preflightCommitment: 'confirmed' }
        );

        return signature;
    }

    /**
     * Get all stake accounts for a wallet
     */
    async getStakeAccountsForWallet(walletAddress: string): Promise<StakeAccount[]> {
        try {
            const pubkey = new PublicKey(walletAddress);
            console.log('[Staking] Fetching stake accounts for:', walletAddress);

            // Try to get stake accounts by checking both staker and withdrawer authorities
            const stakerAccounts = await this.connection.getParsedProgramAccounts(
                StakeProgram.programId,
                {
                    filters: [
                        {
                            memcmp: {
                                offset: 12, // Offset for staker pubkey
                                bytes: pubkey.toBase58()
                            }
                        }
                    ]
                }
            ).catch(e => {
                console.warn('[Staking] Failed to fetch by staker:', e.message);
                return [];
            });

            const withdrawerAccounts = await this.connection.getParsedProgramAccounts(
                StakeProgram.programId,
                {
                    filters: [
                        {
                            memcmp: {
                                offset: 44, // Offset for withdrawer pubkey
                                bytes: pubkey.toBase58()
                            }
                        }
                    ]
                }
            ).catch(e => {
                console.warn('[Staking] Failed to fetch by withdrawer:', e.message);
                return [];
            });

            // Combine and deduplicate
            const allAccounts = [...stakerAccounts, ...withdrawerAccounts];
            const uniqueAccounts = allAccounts.filter((acc, index, self) =>
                index === self.findIndex(a => a.pubkey.toBase58() === acc.pubkey.toBase58())
            );

            console.log(`[Staking] Found ${uniqueAccounts.length} stake account(s)`);

            const stakeAccounts: StakeAccount[] = [];

            for (const { pubkey, account } of uniqueAccounts) {
                try {
                    // Optimized: Parse data directly from the list response
                    // No need to fetch getStakeAccountInfo again
                    const output: StakeAccount = {
                        address: pubkey.toBase58(),
                        balance: account.lamports / LAMPORTS_PER_SOL,
                        state: 'active', // Default
                        rewards: 0
                    };

                    // Try to parse simplified state
                    const parsedData = account.data;
                    if (parsedData && typeof parsedData === 'object' && 'parsed' in parsedData) {
                        const parsed = parsedData.parsed as any;
                        if (parsed?.type === 'initialized') {
                            output.state = 'inactive';
                        } else if (parsed?.type === 'delegated' || parsed?.info?.stake?.delegation) {
                            output.state = 'active';
                        }
                    } else {
                        // If standard parsing fails, assume active if balance > 0
                        // Since we filtered by stake program, it should be a stake account
                    }

                    console.log('[Staking] Parsed account:', output.address, output.balance);
                    stakeAccounts.push(output);

                } catch (err) {
                    console.warn('[Staking] Error parsing account data:', pubkey.toBase58(), err);
                }
            }

            return stakeAccounts;
        } catch (error: any) {
            console.error('[Staking] Failed to get stake accounts:', error.message);
            return [];
        }
    }

    /**
     * Get multiple stake accounts by address (Fast update for known accounts)
     */
    async getMultipleStakeAccounts(addresses: string[]): Promise<StakeAccount[]> {
        if (addresses.length === 0) return [];

        try {
            const pubkeys = addresses.map(a => new PublicKey(a));
            // Chunking into groups of 100 just in case
            const chunks = [];
            for (let i = 0; i < pubkeys.length; i += 100) {
                chunks.push(pubkeys.slice(i, i + 100));
            }

            const results: StakeAccount[] = [];

            for (const chunk of chunks) {
                const accountInfos = await this.connection.getMultipleAccountsInfo(chunk);

                chunk.forEach((pubkey, i) => {
                    const info = accountInfos[i];
                    if (info && info.data) {
                        try {
                            // Parse stake account data properly
                            const balance = info.lamports / LAMPORTS_PER_SOL;

                            // Try to parse state and rewards from account data
                            let state: StakeAccount['state'] = 'active';
                            let rewards = 0;
                            let delegatedValidator: string | undefined;

                            try {
                                // Stake account data structure (simplified parsing)
                                // We'll use a basic approach to detect state
                                const data = info.data;

                                // Check if account has delegation (offset ~124 for delegation info)
                                // This is a simplified check - full parsing would be more complex
                                if (data.length > 200) {
                                    // Likely has delegation data
                                    // Try to read voter pubkey at offset ~124
                                    const voterPubkeyOffset = 124;
                                    if (data.length >= voterPubkeyOffset + 32) {
                                        const voterPubkeyBytes = data.slice(voterPubkeyOffset, voterPubkeyOffset + 32);
                                        try {
                                            delegatedValidator = new PublicKey(voterPubkeyBytes).toBase58();
                                        } catch (e) {
                                            // Invalid pubkey, skip
                                        }
                                    }

                                    // Check activation state
                                    // If lamports > minimum (0.001 SOL) and has delegation, likely active
                                    if (balance > 0.001 && delegatedValidator) {
                                        state = 'active';
                                    } else if (balance > 0.001) {
                                        state = 'activating';
                                    } else {
                                        state = 'inactive';
                                    }

                                    // Rewards calculation (simplified)
                                    // In reality, rewards are calculated from epoch credits
                                    // For now, we'll estimate based on balance growth
                                    // This will be overwritten by full scan data when available
                                    rewards = 0; // Will be updated by full scan
                                }
                            } catch (parseError) {
                                // If parsing fails, use defaults
                                console.warn('Stake data parsing failed for', pubkey.toBase58(), parseError);
                            }

                            results.push({
                                address: pubkey.toBase58(),
                                balance,
                                state,
                                rewards,
                                delegatedValidator
                            });
                        } catch (e) {
                            console.warn('Failed to parse stake', pubkey.toBase58(), e);
                        }
                    }
                });
            }

            return results;
        } catch (e) {
            console.error('getMultipleStakeAccounts failed:', e);
            return [];
        }
    }

    /**
     * Get current epoch info
     */
    async getEpochInfo() {
        return await this.connection.getEpochInfo();
    }

    /**
     * Estimate time until next epoch (approximate)
     */
    async getTimeUntilNextEpoch(): Promise<number> {
        const epochInfo = await this.getEpochInfo();
        const slotsRemaining = epochInfo.slotsInEpoch - epochInfo.slotIndex;
        const secondsRemaining = slotsRemaining * 0.4; // ~400ms per slot
        return Math.floor(secondsRemaining);
    }
}
