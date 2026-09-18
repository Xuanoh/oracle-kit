## Continuous browser conversations

Continue the existing conversation for follow-ups on the same question; start a
new one for independent questions or when requested. Keep follow-ups within the
authorized task, and stop when it is resolved rather than running an open-ended
consultation loop.

After each turn, retain its Oracle session ID, ChatGPT conversation URL, tab target ID, and
verified surface/model/intensity. Read the answer before composing an adaptive
follow-up, then use the most recent completed session:

```bash
oracle --engine browser --remote-chrome 127.0.0.1:9222 \
  --followup <latest-session-id> \
  -p "<follow-up question>" --slug "<new-turn-slug>"
```

`--followup` inherits the parent browser configuration (including connection,
surface, model, and intensity); do not rely on new selection flags overriding
it. Keep the explicit `--remote-chrome` for this local setup to suppress the
implicitly configured bridge. The adapter checks the resumed selection without
changing it. If a different
setting is requested, resolve that explicitly before sending. Supply only the
new question and necessary new or changed files; do not resend the entire history.

For questions known in advance, repeat `--browser-follow-up "<question>"` on the
initial browser command. Prefer separate `--followup` calls when the next question
depends on the answer. `oracle session <id>` only inspects or reattaches to a run;
it does not send a new question.

Before another send, confirm the prior turn finished. If submission or response
collection times out, inspect that run and the webpage instead of blindly
resubmitting. For recovery with multiple open tabs, bind
`oracle session <id> --harvest --browser-tab <target-id-or-conversation-url>`
to the intended conversation rather than trusting an automatically chosen tab.
Verify the same conversation URL and a newly added assistant answer;
an old answer is not a successful follow-up. Use `--browser-archive never` on
the initial call when further turns are intended; `--followup` also disables
automatic archiving.

### Current browser limitation and tested fallback

The 2026-09-08 two-turn Chat / GPT-5.6 Sol / Instant check passed in the
original tab using direct CDP submission and Oracle harvest, **not** end-to-end
`--followup`. The resumed conversation has no homepage Chat/Work toggle, so the
current selection adapter rejects it before sending. A reopened tab also showed
a different model pill from the original tab. Do not bypass this by pretending
that inherited configuration proves the current UI selection.

Until that adapter is fixed, use the original verified tab for continuous
browser consultations when direct browser control is available. Connect through
the installed package's `chrome-remote-interface` to port 9222 and the saved
target ID. Verify the exact conversation URL, completed prior turns, empty draft,
and checked model plus slider in the composer menu. For this tested Chat choice,
the checked model is `GPT-5.6 Sol`, slider value 0 / maximum 4, label Instant/即时.
Do not infer an absent surface toggle from the requested setting; retain the
original verified surface provenance and stop if the menu contradicts it.
Close the menu, focus `#prompt-textarea`, use CDP `Input.insertText`, and click
the enabled `[data-testid="send-button"]` once. Harvest that exact target and
confirm one new user turn and one new assistant turn before continuing.

An observed send timeout left the first prompt in the composer without a user
turn. Only after confirming it was unsent was that existing draft submitted;
do not insert another copy. Keep failed CLI session statuses intact and describe
CDP recovery separately rather than claiming the CLI succeeded. If the original
tab or reliable verification is unavailable, stop and report the limitation.
