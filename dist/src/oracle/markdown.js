import path from "node:path";
const EXT_TO_LANG = {
    ".ts": "ts",
    ".tsx": "tsx",
    ".js": "js",
    ".jsx": "jsx",
    ".json": "json",
    ".swift": "swift",
    ".md": "md",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
    ".py": "python",
    ".rb": "ruby",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".css": "css",
    ".scss": "scss",
    ".sql": "sql",
    ".yaml": "yaml",
    ".yml": "yaml",
};
function detectFenceLanguage(displayPath) {
    const ext = path.extname(displayPath).toLowerCase();
    return EXT_TO_LANG[ext] ?? null;
}
function pickFence(content) {
    // Choose a fence longer than any backtick run inside the file so the block can't prematurely close.
    const matches = [...content.matchAll(/`+/g)];
    const maxTicks = matches.reduce((max, m) => Math.max(max, m[0].length), 0);
    const fenceLength = Math.max(3, maxTicks + 1);
    return "`".repeat(fenceLength);
}
function formatLineRange(lineCount) {
    return lineCount === 0 ? "Lines: 0" : `Lines: 1-${lineCount}`;
}
function addLineNumbers(content) {
    if (content.length === 0) {
        return { text: "", lineCount: 0 };
    }
    const lines = content.split("\n");
    const width = String(lines.length).length;
    const numbered = lines
        .map((line, index) => `${String(index + 1).padStart(width, " ")} | ${line}`)
        .join("\n");
    return { text: numbered, lineCount: lines.length };
}
function renderFileSection(displayPath, content, options) {
    const fence = pickFence(content);
    const lang = detectFenceLanguage(displayPath);
    const normalized = content.replace(/\s+$/u, "");
    const header = options.index == null
        ? `### File: ${displayPath}`
        : `### File ${options.index}: ${displayPath}`;
    const fenceOpen = lang ? `${fence}${lang}` : fence;
    if (options.lineNumbers !== true) {
        return [header, fenceOpen, normalized, fence, ""].join("\n");
    }
    const numbered = addLineNumbers(normalized);
    return [header, formatLineRange(numbered.lineCount), fenceOpen, numbered.text, fence, ""].join("\n");
}
export function formatFileSection(displayPath, content, options = {}) {
    return renderFileSection(displayPath, content, options);
}
export function formatFileSections(sections, options = {}) {
    const lineNumbers = options.lineNumbers ?? true;
    const rendered = sections
        .map((section) => renderFileSection(section.displayPath, section.content, {
        lineNumbers,
        index: options.includeFileIndex ? section.index : undefined,
    }).trimEnd())
        .join("\n\n");
    return options.trailingNewline && rendered ? `${rendered}\n` : rendered;
}
