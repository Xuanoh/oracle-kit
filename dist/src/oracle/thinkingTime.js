export const THINKING_TIME_LEVELS = ["instant", "light", "standard", "extended", "heavy", "max", "ultra", "pro"];
export const THINKING_TIME_ALIASES = [
    "instant",
    "low",
    "medium",
    "high",
    "extra-high",
    "extra high",
    "extrahigh",
    "xhigh",
];
export const THINKING_TIME_INPUT_VALUES = [
    ...THINKING_TIME_LEVELS,
    ...THINKING_TIME_ALIASES,
];
export function normalizeThinkingTimeLevel(value) {
    const normalized = (value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, "-");
    switch (normalized) {
        case "max":
        case "ultra":
        case "pro":
        case "instant":
            return normalized;
        case "light":
        case "low":
            return "light";
        case "standard":
        case "medium":
            return "standard";
        case "extended":
        case "high":
            return "extended";
        case "heavy":
        case "extra-high":
        case "extrahigh":
        case "xhigh":
            return "heavy";
        default:
            return null;
    }
}
