import { createRequire } from "node:module";
import { MODEL_CONFIGS, PRO_MODELS } from "./config.js";
import { pricingFromUsdPerToken } from "tokentally";
const OPENROUTER_DEFAULT_BASE = "https://openrouter.ai/api/v1";
const OPENROUTER_MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models";
const require = createRequire(import.meta.url);
let countTokensGpt5ProImpl;
const countTokensGpt5Pro = (input, options) => {
    countTokensGpt5ProImpl ??= require("gpt-tokenizer/model/gpt-5-pro").countTokens;
    return countTokensGpt5ProImpl(input, options);
};
export function isKnownModel(model) {
    return Object.hasOwn(MODEL_CONFIGS, model);
}
export function isOpenRouterBaseUrl(baseUrl) {
    if (!baseUrl)
        return false;
    try {
        const url = new URL(baseUrl);
        return url.hostname.includes("openrouter.ai");
    }
    catch {
        return false;
    }
}
export function defaultOpenRouterBaseUrl() {
    return OPENROUTER_DEFAULT_BASE;
}
export function normalizeOpenRouterBaseUrl(baseUrl) {
    try {
        const url = new URL(baseUrl);
        // If user passed the responses endpoint, trim it so the client does not double-append.
        if (url.pathname.endsWith("/responses")) {
            url.pathname = url.pathname.replace(/\/responses\/?$/, "");
        }
        return url.toString().replace(/\/+$/, "");
    }
    catch {
        return baseUrl;
    }
}
export function safeModelSlug(model) {
    return model.replace(/[/\\]/g, "__").replace(/[:*?"<>|]/g, "_");
}
function openRouterPricing(pricing) {
    const parsePrice = (value) => {
        const parsed = typeof value === "number"
            ? value
            : typeof value === "string" && value.trim() !== ""
                ? Number(value)
                : NaN;
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };
    const inputUsdPerToken = parsePrice(pricing?.prompt);
    const outputUsdPerToken = parsePrice(pricing?.completion);
    if (inputUsdPerToken === null || outputUsdPerToken === null)
        return null;
    const normalized = pricingFromUsdPerToken({ inputUsdPerToken, outputUsdPerToken });
    return {
        inputPerToken: normalized.inputUsdPerToken,
        outputPerToken: normalized.outputUsdPerToken,
    };
}
const catalogCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 20;
/**
 * Prune stale entries from the catalog cache to prevent unbounded growth.
 * Removes entries older than TTL and enforces a maximum cache size.
 */
function pruneCatalogCache(now) {
    // Remove stale entries first
    for (const [key, entry] of catalogCache) {
        if (now - entry.fetchedAt >= CACHE_TTL_MS) {
            catalogCache.delete(key);
        }
    }
    // If still over limit, evict oldest fetched entries (not true LRU; no last-access tracking).
    if (catalogCache.size > MAX_CACHE_ENTRIES) {
        const entries = [...catalogCache.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
        const toRemove = entries.slice(0, catalogCache.size - MAX_CACHE_ENTRIES);
        for (const [key] of toRemove) {
            catalogCache.delete(key);
        }
    }
}
async function fetchOpenRouterCatalog(apiKey, fetcher) {
    const now = Date.now();
    const cached = catalogCache.get(apiKey);
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.models;
    }
    const response = await fetcher(OPENROUTER_MODELS_ENDPOINT, {
        headers: {
            authorization: `Bearer ${apiKey}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to load OpenRouter models (${response.status})`);
    }
    const json = (await response.json());
    const models = json?.data ?? [];
    catalogCache.set(apiKey, { fetchedAt: now, models });
    // Prune after insert so the max-size constraint is strictly enforced.
    pruneCatalogCache(now);
    return models;
}
function mapToOpenRouterId(candidate, catalog, providerHint) {
    if (candidate.includes("/"))
        return candidate;
    const byExact = catalog.find((entry) => entry.id === candidate);
    if (byExact)
        return byExact.id;
    const bySuffix = catalog.find((entry) => entry.id.endsWith(`/${candidate}`));
    if (bySuffix)
        return bySuffix.id;
    if (providerHint) {
        return `${providerHint}/${candidate}`;
    }
    return candidate;
}
export async function resolveModelConfig(model, options = {}) {
    const base = await resolveBaseModelConfig(model, options);
    // Apply user-config per-model overrides last, after known/OpenRouter/synthesized
    // resolution, so an explicit override always wins.
    return applyModelOverride(base, model, options.modelOverrides);
}
async function resolveBaseModelConfig(model, options = {}) {
    const known = isKnownModel(model) ? MODEL_CONFIGS[model] : null;
    const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
    const openRouterActive = isOpenRouterBaseUrl(options.baseUrl) || Boolean(options.openRouterApiKey);
    if (known && !openRouterActive) {
        return known;
    }
    // Try to enrich from OpenRouter catalog when available.
    if (openRouterActive && options.openRouterApiKey) {
        try {
            const catalog = await fetchOpenRouterCatalog(options.openRouterApiKey, fetcher);
            const targetId = mapToOpenRouterId(typeof model === "string" ? model : String(model), catalog, known?.provider);
            const info = catalog.find((entry) => entry.id === targetId) ?? null;
            if (info) {
                return {
                    ...(known ?? {
                        model,
                        tokenizer: countTokensGpt5Pro,
                        inputLimit: info.context_length ?? 200_000,
                        reasoning: null,
                    }),
                    apiModel: targetId,
                    openRouterId: targetId,
                    provider: known?.provider ?? "other",
                    inputLimit: info.context_length ?? known?.inputLimit ?? 200_000,
                    pricing: openRouterPricing(info.pricing) ?? known?.pricing ?? null,
                    supportsBackground: known?.supportsBackground ?? true,
                    supportsSearch: known?.supportsSearch ?? true,
                };
            }
            // No metadata hit; fall through to synthesized config.
            return {
                ...(known ?? {
                    model,
                    tokenizer: countTokensGpt5Pro,
                    inputLimit: 200_000,
                    reasoning: null,
                }),
                apiModel: targetId,
                openRouterId: targetId,
                provider: known?.provider ?? "other",
                supportsBackground: known?.supportsBackground ?? true,
                supportsSearch: known?.supportsSearch ?? true,
                pricing: known?.pricing ?? null,
            };
        }
        catch {
            // If catalog fetch fails, fall back to a synthesized config.
        }
    }
    // Synthesized generic config for custom endpoints or failed catalog fetch.
    return {
        ...(known ?? {
            model,
            tokenizer: countTokensGpt5Pro,
            inputLimit: 200_000,
            reasoning: null,
        }),
        provider: known?.provider ?? "other",
        supportsBackground: known?.supportsBackground ?? true,
        supportsSearch: known?.supportsSearch ?? true,
        pricing: known?.pricing ?? null,
    };
}
export function isProModel(model) {
    return isKnownModel(model) && PRO_MODELS.has(model);
}
const VALID_REASONING_EFFORTS = ["low", "medium", "high", "xhigh"];
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
 * Returns the override's `apiModel` for a *known* model when present and non-empty,
 * otherwise `undefined`. Single source of truth for the override apiModel rule,
 * shared by {@link applyModelOverride} and the CLI's `effectiveModelId` resolution.
 */
export function resolveOverriddenApiModel(model, overrides) {
    if (!overrides || !isKnownModel(model))
        return undefined;
    const override = overrides[model];
    if (!isRecord(override))
        return undefined;
    if (typeof override.apiModel === "string" && override.apiModel.trim() !== "") {
        return override.apiModel.trim();
    }
    return undefined;
}
/**
 * Apply a user-config per-model override on top of a resolved config.
 *
 * Scope is intentionally narrow: only *known* models can be overridden, so the
 * tokenizer (a function, not expressible in JSON) and any unspecified fields are
 * inherited from the base config. Override fields are validated defensively
 * because they come from user-authored JSON5.
 */
export function applyModelOverride(base, model, overrides) {
    if (!overrides || !isKnownModel(model))
        return base;
    const override = overrides[model];
    if (!isRecord(override))
        return base;
    const result = { ...base };
    const apiModel = resolveOverriddenApiModel(model, overrides);
    if (apiModel) {
        result.apiModel = apiModel;
    }
    if (Object.hasOwn(override, "reasoning")) {
        const reasoning = override.reasoning;
        if (reasoning === null) {
            // Explicit null clears the known model's reasoning effort.
            result.reasoning = null;
        }
        else if (isRecord(reasoning) &&
            typeof reasoning.effort === "string" &&
            (VALID_REASONING_EFFORTS.includes(reasoning.effort) ||
                (model === "gpt-6-astra" && reasoning.effort === "max"))) {
            result.reasoning = { effort: reasoning.effort };
        }
        // Malformed reasoning override is ignored (base value preserved).
    }
    if (typeof override.inputLimit === "number" &&
        Number.isSafeInteger(override.inputLimit) &&
        override.inputLimit > 0) {
        result.inputLimit = override.inputLimit;
    }
    // Non-positive or non-integer inputLimit (e.g. 0, 0.5, NaN, Infinity) is ignored.
    if (Object.hasOwn(override, "pricing")) {
        const pricing = override.pricing;
        if (pricing === null) {
            result.pricing = null;
        }
        else if (isRecord(pricing) &&
            typeof pricing.inputPerToken === "number" &&
            Number.isFinite(pricing.inputPerToken) &&
            pricing.inputPerToken >= 0 &&
            typeof pricing.outputPerToken === "number" &&
            Number.isFinite(pricing.outputPerToken) &&
            pricing.outputPerToken >= 0) {
            result.pricing = {
                inputPerToken: pricing.inputPerToken,
                outputPerToken: pricing.outputPerToken,
            };
        }
        // Malformed pricing override is ignored (base value preserved).
    }
    return result;
}
export function resetOpenRouterCatalogCacheForTest() {
    catalogCache.clear();
}
export function getOpenRouterCatalogCacheSizeForTest() {
    return catalogCache.size;
}
export function getOpenRouterCatalogCacheMaxEntriesForTest() {
    return MAX_CACHE_ENTRIES;
}
