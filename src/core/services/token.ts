
import { Connection, PublicKey } from '@solana/web3.js';

export interface TokenAccount {
    mint: string;
    address: string; // Token Account Address
    balance: number;
    decimals: number;
}

export interface TokenInfo extends TokenAccount {
    symbol: string;
    name: string;
    logoURI?: string;
    priceUSD?: number;
}

// Common token list to avoid fetching huge lists every time
// Will fetch full list from Jupiter API if needed
const COMMON_TOKENS: Record<string, { symbol: string, name: string, logoURI?: string }> = {
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin', logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'USDT', logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png' },
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk', logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I' },
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', name: 'Jupiter', logoURI: 'https://static.jup.ag/jup/icon.png' },
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', name: 'Raydium', logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png' }
};

export class TokenService {
    private connection: Connection;

    private static jupiterCache: Map<string, { symbol: string, name: string, logoURI?: string }> = new Map();
    private static raydiumCache: Map<string, { symbol: string, name: string, logoURI?: string }> = new Map();
    private static isCacheHydrating = false;
    private static isRaydiumCacheHydrating = false;

    constructor(connection: Connection) {
        this.connection = connection;
        // Fire and forget cache hydration
        TokenService.hydrateJupiterCache();
        TokenService.hydrateRaydiumCache();
    }

    private static async hydrateRaydiumCache() {
        if (TokenService.isRaydiumCacheHydrating || TokenService.raydiumCache.size > 0) return;
        TokenService.isRaydiumCacheHydrating = true;

        try {
            const res = await fetch('https://api.raydium.io/v2/sdk/token/raydium.mainnet.json');
            if (res.ok) {
                const data = await res.json();
                if (data.tokens && Array.isArray(data.tokens)) {
                    data.tokens.forEach((token: any) => {
                        if (token.address && token.symbol) {
                            TokenService.raydiumCache.set(token.address, {
                                symbol: token.symbol,
                                name: token.name || token.symbol,
                                logoURI: token.logoURI
                            });
                        }
                    });
                    console.log(`[TokenService] Raydium cache loaded: ${TokenService.raydiumCache.size} tokens`);
                }
            }
        } catch (e) {
            console.warn('[TokenService] Failed to hydrate Raydium cache:', e);
        } finally {
            TokenService.isRaydiumCacheHydrating = false;
        }
    }

    private static async hydrateJupiterCache() {
        if (this.isCacheHydrating || this.jupiterCache.size > 0) return;
        this.isCacheHydrating = true;
        try {
            console.log('[TokenService] Hydrating Jupiter Token List...');
            const res = await fetch('https://token.jup.ag/strict');
            const data = await res.json();
            data.forEach((t: any) => {
                this.jupiterCache.set(t.address, {
                    symbol: t.symbol,
                    name: t.name,
                    logoURI: t.logoURI
                });
            });
            console.log(`[TokenService] Jupiter List hydrated: ${this.jupiterCache.size} tokens`);
        } catch (e) {
            console.warn('[TokenService] Jupiter list hydration failed', e);
        } finally {
            this.isCacheHydrating = false;
        }
    }

    /**
     * Get all SPL token accounts for a wallet
     */
    async getTokensForWallet(walletAddress: string): Promise<TokenInfo[]> {
        try {
            const pubKey = new PublicKey(walletAddress);
            const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
            const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            // Fetch both Standard and Token-2022 accounts
            const [standardRes, token2022Res] = await Promise.all([
                this.connection.getParsedTokenAccountsByOwner(pubKey, { programId: TOKEN_PROGRAM_ID }, 'confirmed'),
                this.connection.getParsedTokenAccountsByOwner(pubKey, { programId: TOKEN_2022_PROGRAM_ID }, 'confirmed').catch(() => ({ value: [] }))
            ]);

            const allAccounts = [...standardRes.value, ...(token2022Res.value || [])];

            // Process tokens in parallel
            const tokenPromises = allAccounts.map(async ({ pubkey, account }): Promise<TokenInfo | null> => {
                const parsedInfo = account.data.parsed.info;
                const mint = parsedInfo.mint;
                const decimals = parsedInfo.tokenAmount.decimals;
                const uiAmount = parsedInfo.tokenAmount.uiAmount || 0;

                if (uiAmount > 0) {
                    // Optimized metadata fetch with timeout
                    const metaPromise = this.getTokenMetadata(mint);
                    const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve({}), 3000)); // 3s timeout

                    const metaResult: any = await Promise.race([metaPromise, timeoutPromise]);

                    // Fallback to cache if result is empty/unknown
                    const cache = TokenService.jupiterCache.get(mint);
                    const finalMeta = (metaResult && metaResult.symbol !== 'Unknown') ? metaResult : (cache || { symbol: 'Unknown', name: `Token ${mint.slice(0, 4)}` });

                    return {
                        mint,
                        address: pubkey.toBase58(),
                        balance: uiAmount,
                        decimals,
                        symbol: finalMeta.symbol || 'Unknown',
                        name: finalMeta.name || `Token ${mint.slice(0, 4)}`,
                        logoURI: finalMeta.logoURI,
                        priceUSD: 0 // Will be fetched separately
                    };
                }
                return null;
            });

            // Wait for all and filter nulls
            let tokens = (await Promise.all(tokenPromises)).filter((t) => t !== null) as TokenInfo[];

            // Fetch prices for all tokens in parallel
            if (tokens.length > 0) {
                const pricePromises = tokens.map(async (token) => {
                    const price = await this.getTokenPrice(token.mint);
                    return { mint: token.mint, price };
                });

                const prices = await Promise.all(pricePromises);

                // Update tokens with prices
                tokens = tokens.map(token => {
                    const priceData = prices.find(p => p.mint === token.mint);
                    return {
                        ...token,
                        priceUSD: priceData?.price || 0
                    };
                });
            }

            return tokens;

        } catch (error) {
            console.error('[TokenService] Failed to fetch tokens:', error);
            throw error; // Critical: Throw so store keeps old data!
        }
    }

    /**
     * Get token price in USD
     * Uses Jupiter Price API with DexScreener fallback
     */
    private async getTokenPrice(mint: string): Promise<number> {
        try {
            // Try Jupiter Price API first (most reliable)
            const jupiterPrice = await this.fetchJupiterPrice(mint);
            if (jupiterPrice > 0) return jupiterPrice;

            // Fallback to DexScreener
            const dexScreenerPrice = await this.fetchDexScreenerPrice(mint);
            if (dexScreenerPrice > 0) return dexScreenerPrice;

            return 0;
        } catch (e) {
            return 0;
        }
    }

    private async fetchJupiterPrice(mint: string): Promise<number> {
        try {
            const res = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`, {
                signal: AbortSignal.timeout(2000)
            });
            if (!res.ok) return 0;

            const data = await res.json();
            const priceData = data.data?.[mint];

            return priceData?.price || 0;
        } catch (e) {
            return 0;
        }
    }

    private async fetchDexScreenerPrice(mint: string): Promise<number> {
        try {
            const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
                signal: AbortSignal.timeout(2000)
            });
            if (!res.ok) return 0;

            const data = await res.json();
            const pair = data.pairs?.[0];

            if (pair?.priceUsd) {
                return parseFloat(pair.priceUsd);
            }
            return 0;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Get token metadata (Symbol, Name, Logo)
     * Enhanced with multiple data sources for maximum coverage
     */
    private async getTokenMetadata(mint: string) {
        // 1. Check Common List (Fastest)
        if (COMMON_TOKENS[mint]) return COMMON_TOKENS[mint];

        // 2. Check Caches (Fast)
        if (TokenService.jupiterCache.has(mint)) return TokenService.jupiterCache.get(mint);
        if (TokenService.raydiumCache.has(mint)) return TokenService.raydiumCache.get(mint);

        // 3. Try Multiple Sources in Parallel (Fast & Comprehensive)
        try {
            // Race between multiple APIs - first one to respond wins
            const metadataPromise = Promise.race([
                this.fetchRaydiumMetadata(mint),
                this.fetchDexScreenerMetadata(mint),
                this.fetchPumpFunMetadata(mint),
                this.getOnChainMetadata(mint).then(async (onChainMeta) => {
                    if (!onChainMeta) return null;

                    let logoURI = undefined;
                    if (onChainMeta.uri) {
                        try {
                            const cleanUri = onChainMeta.uri.replace(/\0/g, '');
                            if (cleanUri && cleanUri.startsWith('http')) {
                                const controller = new AbortController();
                                const timeoutId = setTimeout(() => controller.abort(), 2000);
                                const jsonRes = await fetch(cleanUri, { signal: controller.signal });
                                clearTimeout(timeoutId);
                                const jsonData = await jsonRes.json();
                                logoURI = jsonData.image;
                            }
                        } catch (e) {
                            // ignore URI fetch fail
                        }
                    }

                    if (onChainMeta.symbol || onChainMeta.name) {
                        return {
                            symbol: onChainMeta.symbol.replace(/\0/g, '') || 'Unknown',
                            name: onChainMeta.name.replace(/\0/g, '') || `Token ${mint.slice(0, 4)}`,
                            logoURI: logoURI || `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`
                        };
                    }
                    return null;
                })
            ].filter(p => p !== null));

            // Wait for first successful response (max 3s)
            const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 3000));
            const result = await Promise.race([metadataPromise, timeoutPromise]);

            if (result && result.symbol && result.symbol !== 'Unknown') {
                // Cache the result
                TokenService.jupiterCache.set(mint, result);
                return result;
            }
        } catch (e) {
            console.warn('[TokenService] Metadata fetch failed for', mint, e);
        }

        // 4. Last Resort
        return {
            symbol: 'Unknown',
            name: `Token ${mint.slice(0, 4)}...`,
            logoURI: undefined
        };
    }

    private async fetchRaydiumMetadata(mint: string) {
        try {
            // Raydium's token list API
            const res = await fetch(`https://api.raydium.io/v2/sdk/token/raydium.mainnet.json`, {
                signal: AbortSignal.timeout(2000)
            });
            if (!res.ok) return null;

            const data = await res.json();
            const tokenInfo = data.tokens?.find((t: any) => t.address === mint);

            if (tokenInfo) {
                return {
                    symbol: tokenInfo.symbol,
                    name: tokenInfo.name,
                    logoURI: tokenInfo.logoURI
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    private async fetchDexScreenerMetadata(mint: string) {
        try {
            // DexScreener has comprehensive token data
            const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
                signal: AbortSignal.timeout(2000)
            });
            if (!res.ok) return null;

            const data = await res.json();
            const pair = data.pairs?.[0]; // Get first trading pair

            if (pair && pair.baseToken) {
                return {
                    symbol: pair.baseToken.symbol,
                    name: pair.baseToken.name,
                    logoURI: pair.info?.imageUrl || `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    private async fetchPumpFunMetadata(mint: string) {
        try {
            // PumpFun API is usually fast for their tokens
            const res = await fetch(`https://frontend-api.pump.fun/coins/${mint}`, {
                signal: AbortSignal.timeout(2000)
            });
            if (!res.ok) return null;
            const data = await res.json();
            return {
                symbol: data.symbol,
                name: data.name,
                logoURI: data.image_uri
            };
        } catch (e) {
            return null;
        }
    }

    private async getOnChainMetadata(mintHash: string) {
        try {
            const currMint = new PublicKey(mintHash);
            const metadataProgram = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

            // finding PDA using Uint8Array seeds (Browser safe)
            const [pda] = PublicKey.findProgramAddressSync(
                [
                    new TextEncoder().encode('metadata'),
                    metadataProgram.toBuffer(),
                    currMint.toBuffer(),
                ],
                metadataProgram
            );

            const accountInfo = await this.connection.getAccountInfo(pda);
            if (!accountInfo) return null;

            return this.decodeMetadata(accountInfo.data);
        } catch (e) {
            return null;
        }
    }

    // Browser-safe Metadata Decoder (No Buffer)
    private decodeMetadata(data: Buffer | Uint8Array) {
        try {
            const buffer = new Uint8Array(data);
            const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            const decoder = new TextDecoder('utf-8');

            let offset = 1 + 32 + 32; // Skip discriminator, auth, mint

            if (offset + 4 > buffer.length) return null;

            // Helper to get u32 le
            const readU32 = (pos: number) => view.getUint32(pos, true);

            const firstLen = readU32(offset);

            // Heuristic for Legacy V1 (Fixed Padding)
            if (firstLen > 1000) {
                if (buffer.length < offset + 32 + 10 + 200) return null; // Bounds check

                const nameStart = offset;
                const name = decoder.decode(buffer.slice(nameStart, nameStart + 32)).replace(/\0/g, '');

                const symbolStart = nameStart + 32;
                const symbol = decoder.decode(buffer.slice(symbolStart, symbolStart + 10)).replace(/\0/g, '');

                const uriStart = symbolStart + 10;
                const uri = decoder.decode(buffer.slice(uriStart, uriStart + 200)).replace(/\0/g, '');

                return { name, symbol, uri };
            }

            // Standard Borsh Decoder
            const readString = () => {
                if (offset + 4 > buffer.length) return "";
                const len = readU32(offset);
                offset += 4;
                if (offset + len > buffer.length) return "";
                const str = decoder.decode(buffer.slice(offset, offset + len));
                offset += len;
                return str;
            };

            const name = readString();
            const symbol = readString();
            const uri = readString();

            return { name, symbol, uri };
        } catch (e) {
            return null;
        }
    }
}
