
import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface WalletTransaction {
    signature: string;
    timestamp: number;
    status: 'success' | 'failed';
    type: 'transfer' | 'stake' | 'interact' | 'unknown';
    amount: number; // In SOL, positive = received, negative = sent
    otherParty?: string; // Sender or Recipient
    fee: number;
}

export class HistoryService {
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Fetch recent transaction history for an address
     * Limited to 10 items to respect public RPC limits
     */
    async getHistory(address: string, limit = 10): Promise<WalletTransaction[]> {
        try {
            const pubKey = new PublicKey(address);

            // 1. Get Signatures (lightweight)
            const signatures = await this.connection.getSignaturesForAddress(pubKey, { limit });

            if (signatures.length === 0) return [];

            // 2. Fetch Parsed Transactions (heavy)
            const signatureList = signatures.map(s => s.signature);

            // Batch fetch is better but depends on RPC support. getParsedTransactions verifies logic.
            const txs = await this.connection.getParsedTransactions(signatureList, {
                maxSupportedTransactionVersion: 0,
                commitment: 'confirmed'
            });

            // 3. Process and Normalize
            return txs.map((tx, i) => {
                if (!tx) return null;
                return this.parseTransaction(tx, signatures[i], address);
            }).filter((t): t is WalletTransaction => t !== null);

        } catch (error) {
            console.error('[HistoryService] Failed to fetch history:', error);
            return [];
        }
    }

    private parseTransaction(
        tx: ParsedTransactionWithMeta,
        sigInfo: { signature: string, blockTime?: number | null, err: any },
        myAddress: string
    ): WalletTransaction {
        const signature = sigInfo.signature;
        const timestamp = sigInfo.blockTime || 0;
        const status = sigInfo.err ? 'failed' : 'success';
        const fee = (tx.meta?.fee || 0) / LAMPORTS_PER_SOL;

        let amount = 0;
        let type: WalletTransaction['type'] = 'unknown';
        let otherParty = undefined;

        // Simple SOL Transfer detection
        // We look at preBalances and postBalances for our account
        if (tx.meta && tx.transaction.message.accountKeys) {
            const keys = tx.transaction.message.accountKeys;
            const myIndex = keys.findIndex(k => k.pubkey.toBase58() === myAddress);

            if (myIndex !== -1) {
                const pre = tx.meta.preBalances[myIndex];
                const post = tx.meta.postBalances[myIndex];
                const diff = (post - pre) / LAMPORTS_PER_SOL;

                // Adjust for fee if we are the payer
                // Usually first account is payer
                const isPayer = myIndex === 0;
                const actualChange = isPayer ? diff + fee : diff; // Remove fee impact to see actual movement

                // If close to 0 (just fee), it's probably just an interaction
                if (Math.abs(actualChange) < 0.000001 && isPayer) {
                    type = 'interact';
                    amount = 0;
                } else {
                    amount = diff; // Total balance change including fee
                    if (amount < 0) type = 'transfer'; // Sent
                    else type = 'transfer'; // Received
                }
            }
        }

        // Improve type detection based on instructions if needed (e.g. Stake Program)

        return {
            signature,
            timestamp,
            status,
            type,
            amount,
            otherParty,
            fee
        };
    }
}
