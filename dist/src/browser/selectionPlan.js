import { normalizeThinkingTimeLevel } from "../oracle/thinkingTime.js";

export const CHAT_LEVELS = ["instant", "medium", "high", "xhigh", "pro"];
export const WORK_LEVELS = ["low", "medium", "high", "xhigh", "max", "ultra"];
const WORK_MODELS = {
    "gpt-6-astra": "GPT-6 Astra",
    "gpt-5.6": "GPT-5.6 Sol",
    "gpt-5.6-sol": "GPT-5.6 Sol",
    "gpt-5.6-terra": "GPT-5.6 Terra",
    "gpt-5.6-luna": "GPT-5.6 Luna",
    "gpt-5.5": "GPT-5.5",
    "gpt-work-default": "Default",
};

export function canonicalBrowserEffort(value, surface) {
    if (value == null || value === "") return null;
    const normalized = normalizeThinkingTimeLevel(value);
    const level = {
        light: surface === "chat" ? "instant" : "low",
        standard: "medium",
        extended: "high",
        heavy: "xhigh",
    }[normalized] ?? normalized;
    const supported = surface === "chat" ? CHAT_LEVELS : WORK_LEVELS;
    if (!supported.includes(level)) {
        throw new Error(`Unsupported ${surface} reasoning intensity "${value}". Use ${supported.join(", ")}.`);
    }
    return level;
}

export function levelsForSelection(surface, modelLabel) {
    if (surface === "chat") {
        if (!["Latest", "GPT-5.6 Sol", "GPT-5.5"].includes(modelLabel)) throw new Error(`Unsupported Chat model "${modelLabel}".`);
        return CHAT_LEVELS;
    }
    if (modelLabel === "GPT-5.6 Luna") return WORK_LEVELS.slice(0, 5);
    if (modelLabel === "GPT-5.5") return WORK_LEVELS.slice(0, 4);
    if (modelLabel === "Default") return null;
    if (Object.values(WORK_MODELS).includes(modelLabel)) return WORK_LEVELS;
    throw new Error(`Unsupported Work model "${modelLabel}".`);
}

export function selectionCapabilities(surface) {
    const labels = surface === "chat" ? ["Latest", "GPT-5.6 Sol", "GPT-5.5"] : [...new Set(Object.values(WORK_MODELS))];
    return Object.fromEntries(labels.map((label) => [label, levelsForSelection(surface, label)]));
}

export function resolveChatGptSelection({ surface = "chat", model, thinkingTime, strategy = "select", researchMode = "off" }) {
    if (!["chat", "work"].includes(surface)) throw new Error(`Unknown ChatGPT surface "${surface}".`);
    let level = canonicalBrowserEffort(thinkingTime, surface);
    let modelLabel = null;
    if (strategy === "ignore" && level) {
        throw new Error("An explicit reasoning intensity cannot be combined with --browser-model-strategy ignore.");
    }
    if (strategy === "select") {
        if (surface === "work") {
            modelLabel = WORK_MODELS[model];
        } else {
            modelLabel = {
                "gpt-chat-latest": "Latest",
                "gpt-6-astra": "Latest",
                "gpt-5-pro": "Latest",
                "gpt-5.6": "GPT-5.6 Sol",
                "gpt-5.6-sol": "GPT-5.6 Sol",
                "gpt-5.6-sol-pro": "GPT-5.6 Sol",
                "gpt-5.5": "GPT-5.5",
                "gpt-5.5-instant": "GPT-5.5",
                "gpt-5.5-pro": "GPT-5.5",
            }[model];
            const required = model === "gpt-5.5-instant" ? "instant"
                : ["gpt-6-astra", "gpt-5-pro", "gpt-5.6-sol-pro", "gpt-5.5-pro"].includes(model) ? "pro" : null;
            if (required) {
                if (level && level !== required) {
                    throw new Error(`${model} in Chat requires ${modelLabel} + ${required}; use --browser-surface work for fixed-model reasoning levels.`);
                }
                level = required;
            }
        }
        if (!modelLabel) throw new Error(`Model "${model}" is not supported in ChatGPT ${surface}. Choose a model from that surface's menu.`);
        const levels = levelsForSelection(surface, modelLabel);
        if (level && !levels) {
            throw new Error("Work Default changes both model and intensity. Choose a fixed Work model before requesting a reasoning intensity.");
        }
        if (level && !levels.includes(level)) throw new Error(`${modelLabel} supports ${levels.join(", ")}, not ${level}.`);
    }
    if (researchMode === "deep" && (surface === "work" || level)) {
        throw new Error("Deep Research has a separate control flow; do not combine it with Work or an explicit reasoning intensity.");
    }
    return { surface, requestedModel: model, modelLabel, level, strategy };
}
