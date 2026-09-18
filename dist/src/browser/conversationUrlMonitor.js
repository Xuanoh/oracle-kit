import { delay } from "./utils.js";
import { isStableConversationUrl } from "./conversationUrl.js";
export function createConversationUrlMonitor(options) {
    const pollIntervalMs = options.pollIntervalMs ?? 250;
    const wait = options.wait ?? delay;
    const now = options.now ?? Date.now;
    let inFlight = null;
    let stopped = false;
    const activePersists = new Set();
    const update = async (label, timeoutMs = 10_000) => {
        const startedAt = now();
        while (!stopped && now() - startedAt < timeoutMs) {
            try {
                const url = await options.readUrl();
                if (stopped) {
                    return false;
                }
                if (url && isStableConversationUrl(url)) {
                    options.logger(`[browser] conversation url (${label}) = ${url}`);
                    const persist = options.persistUrl(url);
                    activePersists.add(persist);
                    try {
                        await persist;
                    }
                    finally {
                        activePersists.delete(persist);
                    }
                    return true;
                }
            }
            catch {
                // The page can navigate or disconnect between polls; keep trying until timeout.
            }
            await wait(pollIntervalMs);
        }
        return false;
    };
    const schedule = (label, timeoutMs) => {
        if (stopped) {
            return Promise.resolve(false);
        }
        if (inFlight) {
            return inFlight;
        }
        // The /c/ URL can appear after submit. Persist it without blocking response capture.
        inFlight = update(label, timeoutMs)
            .catch(() => false)
            .finally(() => {
            inFlight = null;
        });
        return inFlight;
    };
    return {
        update,
        schedule,
        isInFlight: () => inFlight !== null,
        stop: async () => {
            stopped = true;
            await Promise.allSettled(activePersists);
        },
    };
}
