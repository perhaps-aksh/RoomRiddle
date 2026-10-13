## What
<!-- One or two sentences: what changes and why. Link the issue: Closes #123 -->

## How
<!-- Key decisions, files touched, anything a reviewer should look at first. -->

## Checks
- [ ] `npm run check` passes
- [ ] TV changes: `apps/tv/scripts/wsl-check.sh` passes (and checked on the Vega Virtual Device if it changes what's on screen)
- [ ] No case-specific logic in the engine or UI; content stays in `packages/mystery-data`
- [ ] No secrets, keys or `.env` files
- [ ] Docs updated (README, `docs/`, friction log) where relevant

## Screenshots
<!-- TV or phone before/after, if the change is visible. -->
