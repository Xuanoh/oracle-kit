## Sessions and API boundary

Use `oracle status --hours 72` and `oracle session <id> --render` to recover a
detached run. Do not duplicate a timed-out request. Sessions live under
`~/.oracle/sessions`; `ORACLE_HOME_DIR` overrides that location. Use `--slug`
for a readable session name and an explicit `--timeout` for automation.

Use API mode only within authorization covering its costs. Browser strength
flags do not set API reasoning. `latest` and `default` are browser targets,
not API model IDs. For API Astra, use `gpt-6-astra`, inspect local routing with
`oracle --route --provider openai --model gpt-6-astra`, and inspect the
effective API configuration. This snapshot's API default effort is `xhigh`;
a per-model override can request `max`. Work's Ultra must not be inferred
to be an API effort. API pricing is unknown in the local Astra estimator,
and its input cap remains conservatively 272k tokens.

Model IDs and effort support in this snapshot are adapter configuration, not proof
of current provider availability. Verify the intended API model against the
provider documentation and the account before sending a paid request.
