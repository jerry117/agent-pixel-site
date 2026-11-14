# Agent pixel site

A pixel-art construction site strip docked above the composer (the `conversation.input.dock` slot), where this session's agents appear as little construction workers:

- **The foreman** — the session's own agent. Its state is folded from the session log:
  - reading (read / grep / glob / web lookups) → walks to the **archive room**;
  - writing code (write / edit / apply_patch) → **lays bricks, raising the house**;
  - any failed tool call → the chimney lights up with **smoke**;
  - `approval/asked` (waiting for a permission decision) or `ask_user_question` (asking the user) → **holds up a sign**;
  - turn start / end → reviews the blueprint / sips tea.
- **The workers** — every catalogued subagent (`subagent/catalog`) joins with a tent (one-shot) or a hut (continuable); a `subagent` / `spawn_teammate` dispatch puts them to work, and their `tool/result` settles them (failures smoke).
- **Workflow members** — `tool-workflow/*` records add blueprint-hut workers, settled by outcome (completed → flag, otherwise smoke).
- **The task board** — the left wooden board mirrors the latest `todo_write` list (green = completed, amber = in progress); the house roof rises with completion and flies a flag at 100%.

## Data source and limits

State is folded purely from **the open session's log** into one `pixelSite` session projection (host-side pure fold, served to the client over `wire.view`; the client only renders). Therefore:

- fine-grained foreman actions come from the session's own tool calls and approval audit events;
- subagent / workflow workers show the **dispatch and settlement milestones** recorded in the parent log, not each child's internal tool-by-tool activity;
- the projection is derived from the log, so replay, fork, and resume reproduce the same site.

When an open session provides the required slot interfaces, an empty or unavailable projection shows an idle site. Missing useProjection or translation props hide the strip.

## Implementation constraints (read before changing — all paid for in blood)

- **Never shadow `h`**: `h` is the `React.createElement` alias. The pixel helpers (`R`, `PixelSvg`) once named their height parameter `h`, so `h('rect'/'svg', …)` inside the body called a **number** — an instant TypeError during child rendering → the slot error boundary **permanently abdicates the entry** (silently invisible, no visible error). Heights are always named `height`. Regression guard: `node render-check.mjs` (recursive render verification, 346 component invocations).
- **The entry component must tolerate `props === undefined`**: the renderer probes entries with no props during assembly (observed 6× per mount here). Destructure with `props ?? {}` and return null on props-less passes.
- **Client components must NOT use react hooks from the module table** (`React.useEffect`/`useState`…): in this deployment the module table's React is not dispatcher-paired with the page's rendering instance, so such calls throw React #321 and the slot error boundary silently abdicates the entry. Subscribe to data only through runtime-provided hook props (`useProjection`).
- On render failure the component returns `null` (hidden, not crashed) — a deliberate degradation.
- Fold-semantics changes must bump `STATE_VERSION` and update the unit checks.
- Debugging tip: for silently invisible slot entries, use render-phase `fetch` beacons to a local listener (no hooks, dispatched before a crash) — far more reliable than reading the console.

## Verification

- Verified: bundle installation, host projection registration, client slot registration, page load and module activation (including the desktop Electron page), the `useProjection` data flow, log-driven folding (tool calls, approvals, subagent catalog, workflow records, todo writes), and 21 fold unit checks.
- Not verified (needs a live look): the pixel art's light/dark theme appearance and horizontal scrolling with many workers.
