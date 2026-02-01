import * as bip39 from 'bip39';
import {
    Keypair,
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';

// BIP-44 Path for Solana: m/44'/501'/0'/0'
const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

export class WalletService {
    /**
     * Generates a 24-word mnemonic using secure entropy (WebCrypto).
     */
    static generateMnemonic(): string {
        // Generate 256 bits (32 bytes) of entropy for 24 words
        const entropy = window.crypto.getRandomValues(new Uint8Array(32));
        const hexEntropy = Array.from(entropy)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        return bip39.entropyToMnemonic(hexEntropy);
    }

    static validateMnemonic(mnemonic: string): boolean {
        return bip39.validateMnemonic(mnemonic);
    }

    static async mnemonicToSeed(mnemonic: string): Promise<Buffer> {
        return await bip39.mnemonicToSeed(mnemonic);
    }

    /**
     * Derives a Solana Keypair from a seed using BIP-44 path.
     */
    static deriveKeypair(seed: Buffer, accountIndex = 0): Keypair {
        // Note: accountIndex is 0 for the default path. 
        // To support multiple accounts, we would increment the last index: m/44'/501'/${accountIndex}'/0'
        const path = `m/44'/501'/${accountIndex}'/0'`;

        // derivePath expects seed in hex
        const derivedSeed = derivePath(path, seed.toString('hex')).key;

        // Keypair.fromSeed expects 32 bytes
        return Keypair.fromSeed(derivedSeed);
    }

    static fromPrivateKey(privateKey: string): Keypair {
        try {
            // Try explicit array format parsing (e.g. "[1, 2, 3...]")
            if (privateKey.trim().startsWith('[') && privateKey.trim().endsWith(']')) {
                const arr = JSON.parse(privateKey);
                const buffer = Uint8Array.from(arr);
                if (buffer.length === 64) return Keypair.fromSecretKey(buffer);
                if (buffer.length === 32) return Keypair.fromSeed(buffer);
            }
        } catch (e) { }

        try {
            // Try base58 first (common in Solana)
            const bs58 = require('bs58');
            const decoded = bs58.decode(privateKey);
            if (decoded.length === 64) return Keypair.fromSecretKey(decoded);
            if (decoded.length === 32) return Keypair.fromSeed(decoded);
        } catch (e) { }

        try {
            // Try hex
            const hex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
            const buffer = Buffer.from(hex, 'hex');
            if (buffer.length === 32) return Keypair.fromSeed(buffer);
            if (buffer.length === 64) return Keypair.fromSecretKey(buffer);
        } catch (e) { }

        throw new Error("Invalid Private Key format");
    }

    /**
     * Transfers SOL to another address.
     * Returns transaction signature immediately without waiting for confirmation.
     */
    static async transferSOL(
        connection: Connection,
        fromKeypair: Keypair,
        toAddress: string,
        amountSOL: number
    ): Promise<string> {
        const toPubkey = new PublicKey(toAddress);
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey: toPubkey,
                lamports: amountSOL * LAMPORTS_PER_SOL,
            })
        );

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromKeypair.publicKey;

        // Sign transaction
        transaction.sign(fromKeypair);

        // Send transaction (don't wait for confirmation to avoid timeout)
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        // Return signature immediately
        // Transaction will be confirmed in background
        return signature;
    }
}
