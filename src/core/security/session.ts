type LockCallback = () => void;

let sessionKey: CryptoKey | null = null;
let inactivityTimer: number | null = null;
let onLock: LockCallback | null = null;
const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 minutes

export const SessionManager = {
    setKey: (key: CryptoKey) => {
        sessionKey = key;
        SessionManager.resetTimer();
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
        inactivityTimer = window.setTimeout(() => {
            SessionManager.clear();
        }, AUTO_LOCK_MS) as unknown as number;
    },

    setOnLock: (cb: LockCallback) => {
        onLock = cb;
    }
};
