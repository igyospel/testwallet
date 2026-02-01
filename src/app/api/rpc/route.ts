import { NextRequest, NextResponse } from 'next/server';

// Alchemy Solana RPC - Premium endpoint with high rate limits and fast response
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'DHBbNy1FFcLG-35kDj1y-';
const RPC_ENDPOINTS = [
    `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    // Fallback to public if Alchemy has issues (rare)
    'https://api.mainnet-beta.solana.com',
];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Try each RPC endpoint
        let lastError = '';

        for (const endpoint of RPC_ENDPOINTS) {
            // Retry logic for each endpoint (1 retry allowed for 429)
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                        signal: controller.signal,
                    });

                    clearTimeout(timeoutId);

                    if (response.status === 429) {
                        // Rate limited. Wait and retry.
                        const waitTime = 1500 * (attempt + 1);
                        await new Promise(r => setTimeout(r, waitTime));
                        lastError = 'Rate limited';
                        continue; // Try attempt 2
                    }

                    if (!response.ok) {
                        lastError = `HTTP ${response.status}`;
                        if (response.status >= 500) continue; // Retry 5xx
                        break; // Don't retry 4xx (unless 429)
                    }

                    const data = await response.json();
                    return NextResponse.json(data);

                } catch (error: any) {
                    lastError = error.message || 'Network error';
                }
            }
        }

        // All failed. Return 200 with error object to prevent frontend crash
        console.error('[RPC Proxy] All endpoints failed. Last error:', lastError);
        return NextResponse.json({
            error: { code: -32000, message: "Network busy, please try again." }
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({
            error: { code: -32603, message: "Internal proxy error" }
        }, { status: 200 });
    }
}
