import { Connection, ConnectionConfig } from '@solana/web3.js';

/**
 * Get the RPC URL - either proxy or direct Alchemy
 */
export function getProxyUrl(): string {
    // For static export (GitHub Pages), use Alchemy directly
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_DIRECT_RPC === 'true') {
        const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'DHBbNy1FFcLG-35kDj1y-';
        return `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`;
    }

    // In browser with proxy, use current origin
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/api/rpc`;
    }

    // In server/build time, use Alchemy directly
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'DHBbNy1FFcLG-35kDj1y-';
    return `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`;
}

/**
 * Create a connection instance that works in the browser
 */
export function createConnection(commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'): Connection {
    const rpcUrl = getProxyUrl();
    return new Connection(rpcUrl, { commitment });
}
