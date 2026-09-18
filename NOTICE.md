# Origin and scope

The CLI is derived from [steipete/oracle](https://github.com/steipete/oracle).
The copied installation identified itself as `@steipete/oracle` version `0.16.1`.
Its MIT license and copyright notice are preserved in LICENSE.
This is an independently maintained local adaptation, not an official upstream release.

The initial snapshot contains the already patched, compiled JavaScript runtime.
It does not contain the original TypeScript development tree, and no exact
upstream commit or clean-registry equivalence has been established. The original
package metadata is retained in docs/upstream-package.json for provenance only.

Local changes include model aliases, separate Chat/Work selection, reasoning
controls, selection verification, and direct Chrome connection precedence.
The shareable packaging adds portable skill documentation and regression tests.

patches/chat-work.patch records the consolidated browser adaptation against a
previous local installation that already had earlier modifications. It is
historical context, not a patch guaranteed to apply to a fresh npm release; the
current dist/ snapshot is the installation source. Do not apply the patch again.

Dependencies are obtained separately through npm and retain their own licenses.
No browser profiles, cookies, API keys, Oracle sessions, validation session
records, or research files are part of this repository.
