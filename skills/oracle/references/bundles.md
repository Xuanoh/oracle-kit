## File bundles and prompts

- Require a prompt; attach files only when needed.
- Include paths with repeated `--file`: files, directories, or quoted globs.
- Exclude with `--file "!**/*.test.*"`; inspect `--files-report`.
- Globs honor `.gitignore`; dotfiles need an explicit dot segment.
- Files over 1 MB are rejected by default; keep input compact and inspect
  token estimates rather than treating API context limits as browser limits.
- Never attach secrets, credentials, or unredacted `.env` files.

Include the task, relevant project layout, prior attempts/errors, constraints,
and the desired output. For manual use, render with
`oracle --render-markdown -p "<question>" --file "src/**"`, then choose the
surface, model, and strength explicitly before pasting. Add `--copy-markdown`
only when clipboard output is wanted.
