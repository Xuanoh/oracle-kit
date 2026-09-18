import process from "node:process";
import { startOscProgress as startOscProgressShared, supportsOscProgress as supportsOscProgressShared, } from "osc-progress";
export function supportsOscProgress(env = process.env, isTty = process.stdout.isTTY === true) {
    if (env.CODEX_MANAGED_BY_NPM === "1" && env.ORACLE_FORCE_OSC_PROGRESS !== "1") {
        return false;
    }
    return supportsOscProgressShared(env, isTty, {
        disableEnvVar: "ORACLE_NO_OSC_PROGRESS",
        forceEnvVar: "ORACLE_FORCE_OSC_PROGRESS",
    });
}
export function startOscProgress(options = {}) {
    const env = options.env ?? process.env;
    if (env.CODEX_MANAGED_BY_NPM === "1" && env.ORACLE_FORCE_OSC_PROGRESS !== "1") {
        return () => { };
    }
    return startOscProgressShared({
        ...options,
        // Preserve Oracle's previous defaults: progress emits to and checks stdout.
        write: options.write ?? ((text) => process.stdout.write(text)),
        isTty: options.isTty ?? process.stdout.isTTY === true,
        disableEnvVar: "ORACLE_NO_OSC_PROGRESS",
        forceEnvVar: "ORACLE_FORCE_OSC_PROGRESS",
    });
}
