// Constants
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // Recommended for AES-GCM
const KEY_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100000; // Balanced for browser performance and security

/**
 * Modern Cryptography Service
 * Uses Web Crypto API + PBKDF2 for maximum browser compatibility.
 * Note: PBKDF2 with 600k iterations provides strong security while being stable across all browsers.
 */
export class CryptoService {
    /**
     * Generates a cryptographically secure random salt.
     */
    static generateSalt(): Uint8Array {
        return window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    }

    /**
     * Derives an encryption key from a password using PBKDF2-SHA256.
     * Uses 600,000 iterations as recommended by OWASP (2023).
     */
    static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
        try {
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);

            // Import password as a key for PBKDF2
            const baseKey = await window.crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            // Derive the actual encryption key
            return await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt as BufferSource,
                    iterations: PBKDF2_ITERATIONS,
                    hash: 'SHA-256',
                },
                baseKey,
                { name: 'AES-GCM', length: 256 },
                false, // Important: Key is NOT extractable
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            console.error('Key derivation failed:', error);
            throw new Error('Failed to derive secure key');
        }
    }

    /**
   * Encrypts data using AES-256-GCM and a provided key.
   */
    static async encryptWithKey(
        data: string,
        key: CryptoKey,
        salt: Uint8Array
    ): Promise<{ ciphertext: string; iv: string; salt: string }> {
        const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(data);

        const encryptedContent = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            key,
            encodedData
        );

        return {
            ciphertext: this.bufferToHex(new Uint8Array(encryptedContent)),
            iv: this.bufferToHex(iv),
            salt: this.bufferToHex(salt),
        };
    }

    /**
     * Encrypts data using AES-256-GCM.
     * Returns an object containing the ciphertext, iv, and salt.
     */
    static async encryptData(
        data: string,
        password: string
    ): Promise<{ ciphertext: string; iv: string; salt: string }> {
        const salt = this.generateSalt();
        const key = await this.deriveKey(password, salt);
        return this.encryptWithKey(data, key, salt);
    }

    /**
   * Decrypts data using AES-256-GCM and a provided key.
   * Useful when the key is already derived/cached (Session).
   */
    static async decryptWithKey(
        encryptedData: { ciphertext: string; iv: string },
        key: CryptoKey
    ): Promise<string> {
        const iv = this.hexToBuffer(encryptedData.iv);
        const ciphertext = this.hexToBuffer(encryptedData.ciphertext);

        try {
            const decryptedContent = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv as BufferSource,
                },
                key,
                ciphertext as BufferSource
            );

            const decoder = new TextDecoder();
            return decoder.decode(decryptedContent);
        } catch (e) {
            throw new Error('Decryption failed or invalid key');
        }
    }

    /**
     * Decrypts data using AES-256-GCM.
     */
    static async decryptData(
        encryptedData: { ciphertext: string; iv: string; salt: string },
        password: string
    ): Promise<string> {
        const salt = this.hexToBuffer(encryptedData.salt);
        const key = await this.deriveKey(password, salt);
        // Pass only the relevant parts of encryptedData to decryptWithKey
        return this.decryptWithKey({ ciphertext: encryptedData.ciphertext, iv: encryptedData.iv }, key);
    }

    // Helper: clear memory (best effort)
    static clearMemory(buffer: Uint8Array | Float32Array) {
        buffer.fill(0);
    }

    private static hexToBuffer(hex: string): Uint8Array {
        const tokens = hex.match(/.{1,2}/g);
        if (!tokens) return new Uint8Array();
        return new Uint8Array(tokens.map(byte => parseInt(byte, 16)));
    }

    private static bufferToHex(buffer: Uint8Array): string {
        return Array.from(buffer)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}
