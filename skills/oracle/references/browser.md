## ChatGPT browser workflow

Use the patched local `oracle` executable. Choose the surface, model menu, and
reasoning intensity separately. Default to **Chat / Latest / Pro** for an
unspecified difficult Oracle consultation; preserve a user's explicit choices.
Use Work when requested or when the task specifically requires a fixed Work
model and its reasoning options.

The following menus were observed during the original local checks on
2026-09-08. Availability may change with the account, quota, or rollout.

| Surface | Model argument | Model menu | Allowed intensity |
| --- | --- | --- | --- |
| Chat | `latest` | Latest | `instant medium high xhigh pro` |
| Chat | `gpt-5.6-sol` | GPT-5.6 Sol | Same five levels |
| Chat | `gpt-5.5` | GPT-5.5 | Same five levels |
| Work | `gpt-6-astra` | GPT-6 Astra | `low medium high xhigh max ultra` |
| Work | `gpt-5.6-sol` | GPT-5.6 Sol | Same six levels |
| Work | `gpt-5.6-terra` | GPT-5.6 Terra | Same six levels |
| Work | `gpt-5.6-luna` | GPT-5.6 Luna | `low medium high xhigh max` |
| Work | `gpt-5.5` | GPT-5.5 | `low medium high xhigh` |
| Work | `default` | Default | Automatic model/intensity combinations |

English/Chinese labels: Instant=即时, Low=轻度, Medium=中, High=高,
Extra High=极高, Max=最高, Ultra=超高. Chat's Pro is a slider endpoint.
Work does not have a Pro endpoint.

**Latest is a routing choice, not an exact backend identity.** These are
historical observations and adapter rules, not a guarantee of model availability
on another account. In this adapter, Chat `gpt-6-astra` (`gpt-6` alias) selects
Latest + Pro; conflicting intensity flags fail. For fixed Astra +
xhigh/max/ultra, the adapter expects Work. Inspect the actual menu before use.

Work Default uses a six-position automatic ladder observed as:
Terra Low → Sol Low → Sol Medium → Astra Low → Astra Medium → Astra Extra High.
The CLI can select Default and retain its existing slider position. To request
an exact reasoning intensity, select a fixed Work model instead.

## Commands

Chat Latest + Pro:

```bash
oracle --engine browser --remote-chrome 127.0.0.1:9222 --browser-surface chat \
  --model latest --browser-thinking-time pro \
  -p "<question>" --file "src/**"
```

Work Astra + Ultra:

```bash
oracle --engine browser --remote-chrome 127.0.0.1:9222 --browser-surface work \
  --model gpt-6-astra --browser-thinking-time ultra \
  -p "<question>" --file "src/**"
```

Preview the exact same command with `--dry-run json --files-report` before
submission. The preview includes the surface, model menu, and intensity; it
does not establish live selection. Omitting intensity preserves the page's
current setting except model aliases that require a specific endpoint:
Chat `gpt-6-astra` / `gpt-5-pro` → Latest + Pro,
`gpt-5.6-sol-pro` → Sol + Pro, `gpt-5.5-pro` → GPT-5.5 + Pro.

The CLI's unqualified default remains `gpt-5.5-pro`; always specify the model
in this skill's workflow. Legacy strength aliases are supported:
`light` → Chat Instant / Work Low, `standard` → Medium,
`extended` → High, `heavy` → Extra High. Prefer current names.

## Browser connection and verification

Start your own signed-in Chrome with a dedicated profile and a local debugging
port; see [installation](installation.md). Confirm the endpoint is listening and
pass `--remote-chrome 127.0.0.1:9222` (or your chosen endpoint).

An explicit `--remote-chrome` overrides an implicitly configured Oracle bridge.
Explicitly passing both `--remote-host` and `--remote-chrome` remains an error.
Preserve profile contents and existing sessions.

The modern picker uses a Chat/Work toggle, an expandable model list, and a
keyboard-accessible slider. The CLI verifies the surface, checked model,
slider bounds, position, and visible strength label before submission.
An unavailable or unverified choice fails without silently reducing strength.
Model selection and reasoning selection are recorded together; UI verification
is distinct from backend identity verification.

`--browser-model-strategy current` retains the selected model and can set a
supported explicit strength; `ignore` cannot be combined with an explicit
strength. Resumed conversations are checked without changing their choices.
Deep Research has its own flow and cannot be combined with Work or an explicit
strength in this adapter.

Fourteen live selection cases and their read-only rechecks passed without
sending messages. End-to-end response generation was not exercised by those
checks. Oracle Kit includes offline regression tests, a historical patch, and installation
notes. The historical patch is not a clean-upstream installer. An npm reinstall can
overwrite the local patch. Do not substitute an unverified `npx` release.
