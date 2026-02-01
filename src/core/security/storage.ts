import { openDB, DBSchema } from 'idb';

const DB_NAME = 'GruiseWalletVault';
const STORE_NAME = 'secrets';
const VAULT_KEY = 'main_vault';

interface WalletDB extends DBSchema {
    secrets: {
        key: string;
        value: {
            ciphertext: string;
            iv: string;
            salt: string;
            timestamp: number;
        };
    };
    metadata: {
        key: string;
        value: any;
    };
}

export class SecureStorage {
    private static async getDB() {
        return openDB<WalletDB>(DB_NAME, 2, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata');
                }
            },
        });
    }

    static async setMetadata(key: string, value: any) {
        const db = await this.getDB();
        await db.put('metadata', value, key);
    }

    static async getMetadata(key: string) {
        const db = await this.getDB();
        return await db.get('metadata', key);
    }

    static async clearAllMetadata() {
        const db = await this.getDB();
        await db.clear('metadata');
    }

    static async saveVault(encryptedData: { ciphertext: string; iv: string; salt: string }) {
        const db = await this.getDB();
        await db.put(STORE_NAME, {
            ...encryptedData,
            timestamp: Date.now(),
        }, VAULT_KEY);
    }

    static async getVault() {
        const db = await this.getDB();
        return await db.get(STORE_NAME, VAULT_KEY);
    }

    static async clearVault() {
        const db = await this.getDB();
        await db.delete(STORE_NAME, VAULT_KEY);
    }

    static async hasVault(): Promise<boolean> {
        const data = await this.getVault();
        return !!data;
    }
}
