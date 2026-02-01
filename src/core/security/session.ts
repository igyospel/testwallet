type LockCallback = () => void;

let sessionKey: CryptoKey | null = null;
let inactivityTimer: number | null = null;
let onLock: LockCallback | null = null;
const AUTO_LOCK_MS = 30 * 60 * 1000; // 30 minutes
let isListening = false;

export const SessionManager = {
    setKey: (key: CryptoKey) => {
        sessionKey = key;
        SessionManager.resetTimer();

        if (!isListening && typeof window !== 'undefined') {
            // Reset timer on interaction
            window.addEventListener('click', () => SessionManager.resetTimer());
            window.addEventListener('keydown', () => SessionManager.resetTimer());
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') SessionManager.resetTimer();
            });
            isListening = true;
        }
    },

    getKey: (): CryptoKey | null => {
        if (sessionKey) {
            SessionManager.resetTimer();
        }
        return sessionKey;
    },

    hasKey: (): boolean => {
        return !!sessionKey;
    },

    clear: () => {
        // Prevent recursion if already clearing
        if (sessionKey === null && inactivityTimer === null) return;

        sessionKey = null;
        if (inactivityTimer) {
            window.clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        if (onLock) onLock();
    },

    resetTimer: () => {
        if (inactivityTimer) window.clearTimeout(inactivityTimer);
        // Only verify lock if we actually have a key
        if (sessionKey) {
            inactivityTimer = window.setTimeout(() => {
                SessionManager.clear();
            }, AUTO_LOCK_MS) as unknown as number;
        }
    },

    setOnLock: (cb: LockCallback) => {
        onLock = cb;
    }
};
