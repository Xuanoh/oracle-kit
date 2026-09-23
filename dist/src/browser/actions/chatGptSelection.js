import { levelsForSelection, selectionCapabilities } from "../selectionPlan.js";

export async function ensureChatGptSelection(Runtime, plan, logger, { observeOnly = false } = {}) {
    const outcome = await Runtime.evaluate({
        expression: `(${configureChatGptSelection.toString()})(${JSON.stringify(plan)}, ${JSON.stringify(observeOnly)}, ${JSON.stringify(selectionCapabilities(plan.surface))})`,
        awaitPromise: true,
        returnByValue: true,
    });
    if (outcome.exceptionDetails) throw new Error(outcome.exceptionDetails.exception?.description ?? outcome.exceptionDetails.text);
    const result = outcome.result?.value;
    if (!result || result.error) throw new Error(result?.error ?? "ChatGPT selection returned no evidence.");
    if (result.surface !== plan.surface || (plan.modelLabel && result.modelLabel !== plan.modelLabel)) throw new Error("ChatGPT surface or model evidence does not match the request.");
    const levels = levelsForSelection(result.surface, result.modelLabel);
    if (plan.level && levels?.[result.sliderValue] !== plan.level) throw new Error("ChatGPT reasoning evidence does not match the requested intensity.");
    const evidence = {
        requestedModel: plan.requestedModel,
        resolvedLabel: result.modelLabel,
        surface: result.surface,
        requestedLevel: plan.level,
        resolvedLevel: levels?.[result.sliderValue] ?? null,
        sliderValue: result.sliderValue,
        sliderMax: result.sliderMax,
        visibleLabel: result.visibleLabel,
        strategy: plan.strategy,
        status: observeOnly ? "observed" : "selected",
        verified: plan.strategy === "select",
        identityVerified: false,
        source: "chatgpt-surface-model-slider",
        capturedAt: new Date().toISOString(),
    };
    logger(`[browser] Selection: ${JSON.stringify(evidence)}`);
    return evidence;
}

async function configureChatGptSelection(plan, observeOnly, capabilities) {
    const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
    const visible = (node) => Boolean(node && !node.closest('[inert], [aria-hidden="true"]') && node.getBoundingClientRect().width && node.getBoundingClientRect().height);
    const waitFor = async (read, description) => {
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
            const value = read();
            if (value) return value;
            await pause();
        }
        throw new Error(`Unable to verify ${description}; no prompt was submitted.`);
    };
    const normalize = (text) => (text ?? "").replace(/\s+/g, " ").trim();
    const canonicalModel = (text) => {
        // Menu items may add a second line, e.g. a retirement notice.
        // Match the model's first line exactly, never a fuzzy name prefix.
        const label = normalize((text ?? "").trim().split(/\r?\n/)[0]);
        if (["Latest", "最新"].includes(label)) return "Latest";
        if (label === "Default" || label.startsWith("Default ") || label.startsWith("默认")) return "Default";
        return label;
    };
    const currentSurface = () => {
        const selected = document.querySelector('[data-tpp-toggle-value][aria-checked="true"]');
        return selected?.getAttribute("data-tpp-toggle-value") === "work" ? "work"
            : selected?.getAttribute("data-tpp-toggle-value") === "chatgpt" ? "chat" : null;
    };
    const menu = () => document.querySelector('[data-testid="composer-intelligence-picker-content"]');
    const modelItems = () => [...(menu()?.querySelectorAll('[role="menuitemradio"]') ?? [])];
    const selectedModel = () => canonicalModel(modelItems().find((node) => node.getAttribute("aria-checked") === "true")?.innerText);
    const slider = () => menu()?.querySelector('[role="slider"]');
    const sliderValue = () => Number(slider()?.getAttribute("aria-valuenow"));
    const closeMenu = async () => {
        const target = menu()?.closest('[role="menu"]');
        if (!target) return;
        target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        await waitFor(() => !menu(), "closed model menu");
    };
    const openMenu = async () => {
        if (menu()) return;
        const pill = await waitFor(() => [...document.querySelectorAll('main button.__composer-pill')].find(visible), "composer model control");
        pill.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }));
        pill.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerType: "mouse" }));
        await waitFor(menu, "model and reasoning menu");
    };
    try {
        await waitFor(currentSurface, "Chat/Work controls");
        if (currentSurface() !== plan.surface) {
            if (observeOnly) throw new Error(`Existing conversation is in ${currentSurface()}, not ${plan.surface}.`);
            await closeMenu();
            const toggle = document.querySelector(`[data-tpp-toggle-value="${plan.surface === "work" ? "work" : "chatgpt"}"]`);
            if (!visible(toggle)) throw new Error(`The ${plan.surface} surface is unavailable.`);
            toggle.click();
            await waitFor(() => currentSurface() === plan.surface, "surface switch");
        }
        await openMenu();
        await waitFor(() => modelItems().length, "model options");
        if (plan.modelLabel && selectedModel() !== plan.modelLabel) {
            if (observeOnly) throw new Error(`Selected model is ${selectedModel()}, not ${plan.modelLabel}.`);
            const option = modelItems().find((node) => canonicalModel(node.innerText) === plan.modelLabel);
            if (!option) throw new Error(`Model ${plan.modelLabel} is absent from the ${plan.surface} menu.`);
            if (!visible(option)) {
                const expand = [...menu().querySelectorAll('[role="menuitem"][aria-expanded]')].find(visible);
                if (!expand) throw new Error("Cannot open the model list.");
                expand.click();
                await waitFor(() => visible(modelItems().find((node) => canonicalModel(node.innerText) === plan.modelLabel)), "expanded model list");
            }
            modelItems().find((node) => canonicalModel(node.innerText) === plan.modelLabel).click();
            await waitFor(() => selectedModel() === plan.modelLabel, "selected model");
        }
        const expectedModel = selectedModel();
        if (!expectedModel) throw new Error("No selected model can be verified.");
        if (!Object.hasOwn(capabilities, expectedModel)) throw new Error(`Unrecognized model ${expectedModel}.`);
        const levels = capabilities[expectedModel];
        if (![...menu().querySelectorAll('[aria-keyshortcuts]')].some(visible)) {
            await closeMenu();
            await openMenu();
            await waitFor(() => [...(menu()?.querySelectorAll('[aria-keyshortcuts]') ?? [])].some(visible), "visible reasoning slider");
        }
        await waitFor(slider, "reasoning slider");
        const max = Number(slider().getAttribute("aria-valuemax"));
        const min = Number(slider().getAttribute("aria-valuemin"));
        if (min !== 0 || !Number.isInteger(max) || max !== (levels?.length ?? 6) - 1) {
            throw new Error("Reasoning slider layout has changed; refusing an unverified index mapping.");
        }
        if (plan.level) {
            const target = levels?.indexOf(plan.level) ?? -1;
            if (target < 0) throw new Error(`Reasoning intensity ${plan.level} is not available for ${expectedModel}.`);
            if (observeOnly && sliderValue() !== target) throw new Error("Existing conversation has a different reasoning intensity.");
            for (let attempts = 0; sliderValue() !== target && attempts <= max; attempts++) {
                const previous = sliderValue();
                const control = [...menu().querySelectorAll('[aria-keyshortcuts]')].find(visible);
                if (!control) throw new Error("Reasoning slider keyboard control is unavailable.");
                control.dispatchEvent(new KeyboardEvent("keydown", { key: target > previous ? "ArrowRight" : "ArrowLeft", bubbles: true }));
                await waitFor(() => sliderValue() !== previous, "reasoning slider movement");
            }
            if (sliderValue() !== target) throw new Error("Requested reasoning intensity was not selected.");
        }
        await pause();
        if (currentSurface() !== plan.surface || selectedModel() !== expectedModel) throw new Error("Surface or model changed while selecting reasoning intensity.");
        const announcement = menu().querySelector('[data-testid="composer-model-picker-slider-simple-view"]')?.innerText ?? "";
        const value = sliderValue();
        const labels = {
            instant: ["即时", "Instant"], low: ["轻度", "Low", "Light"], medium: ["中", "Medium"],
            high: ["高", "High"], xhigh: ["极高", "Extra High"], max: ["最高", "Max"],
            ultra: ["超高", "Ultra"], pro: ["Pro"],
        };
        const observedLevel = levels?.[value];
        if (levels && !labels[observedLevel]?.some((label) => announcement.startsWith(`${label}，`) || announcement.startsWith(`${label},`) || announcement.startsWith(`${label}\n`) || announcement === label)) {
            throw new Error(`Reasoning label does not match slider position: ${normalize(announcement)}.`);
        }
        const result = { surface: currentSurface(), modelLabel: expectedModel, sliderValue: value, sliderMax: max, visibleLabel: normalize(announcement) };
        await closeMenu();
        return result;
    } catch (error) {
        try { await closeMenu(); } catch {}
        return { error: error.message };
    }
}
