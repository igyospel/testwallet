import { Connection, ConnectionConfig } from '@solana/web3.js';

/**
 * Get the absolute URL for our RPC proxy
 */
export function getProxyUrl(): string {
    // In browser, use current origin
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/api/rpc`;
    }
    // In server/build time, use localhost (shouldn't happen but just in case)
    return 'http://localhost:3000/api/rpc';
}

/**
 * Create a connection instance that works in the browser via our proxy
 */
export function createConnection(commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'): Connection {
    const proxyUrl = getProxyUrl();
    return new Connection(proxyUrl, { commitment });
}
