# Installation and browser setup

Install the patched CLI from [Oracle Kit](https://github.com/Xuanoh/oracle-kit)
using Node.js 24+ and npm. The repository [setup guide](https://github.com/Xuanoh/oracle-kit/blob/main/docs/setup.md)
contains CLI and skill setup.
Use `oracle --help` to confirm the command resolves, and check for the
`--browser-surface` option. Do not silently substitute an upstream npm release
when this adapter is required. Installing the skill alone does not install the CLI.

## Dedicated Chrome profile

Launch Chrome with a dedicated, non-default user data directory. Examples:

Linux (adjust the Chrome executable name if necessary):

```bash
google-chrome --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.oracle/browser-profile"
```

macOS:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 --user-data-dir="$HOME/.oracle/browser-profile"
```

Windows PowerShell (adjust the executable path if needed):

```powershell
& "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 "--user-data-dir=$env:USERPROFILE\.oracle\browser-profile"
```

Sign in to ChatGPT yourself in that browser. Keep the debugging endpoint local;
it grants control over the signed-in browser. Never share the profile directory.

From the same environment that runs Oracle, verify the endpoint:

```bash
curl http://127.0.0.1:9222/json/version
```

If Oracle runs in WSL but Chrome runs in Windows, loopback connectivity depends
on the WSL network setup. A Windows-side listening port alone is not proof of
WSL reachability. Confirm the endpoint from WSL before invoking Oracle; do not
expose the port publicly to work around networking.

Pass `--remote-chrome 127.0.0.1:9222` explicitly. Inspect the actual account's
menu before choosing surface/model/intensity, then preview the complete command
with `--dry-run json --files-report`. The adapter's historical menu table does
not establish what is available on another account today.

For restoration or updates, reinstall from the Oracle Kit checkout and its
lockfile. Do not reapply patches/chat-work.patch to the included runtime.
