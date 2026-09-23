---
name: oracle
description: "Oracle consultation with selected files through ChatGPT Chat/Work browser automation or an explicitly requested API."
---

# Oracle

Bundle a focused question and the smallest useful file set for an independent consultation. Treat the answer as advisory and verify it against primary sources or tests.

Use the patched `oracle` executable from Oracle Kit; read [installation](references/installation.md) when setup or recovery is needed. An npm reinstall can overwrite the patch. Do not silently substitute an unverified `npx` release.

For a new browser consultation, read [browser setup and selection](references/browser.md). Preserve the user's explicit surface/model/intensity. The local default for an unspecified difficult consultation is Chat / Latest / Pro; live UI verification is not proof of backend model identity. GPT-6 Sol and GPT-6 Luna require Work; their maximum browser levels are Ultra and Max respectively. Preview the exact bundle with `--dry-run json --files-report` before sending.

For file syntax or a manual bundle, read [bundles](references/bundles.md). Do not attach secrets. For follow-ups or timeouts, read [conversation recovery](references/followups.md) before another send: the current resumed-selection adapter has a known limitation, and an old response is not a successful new turn.

Use [sessions and API](references/sessions-api.md) for detached runs or explicitly authorized API use. API costs need covered authorization; browser reasoning controls do not define API effort.
