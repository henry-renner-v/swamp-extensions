---
name: release-vendored-extension
description: >
  Release a swamp extension end-to-end — the "deploy dance" — for the case where
  the extension vendors code from a separate upstream repo and is consumed by
  other repos. Triggers on "publish/deploy/ship the extension", "push to the
  registry", "release the new version", or bumping an extension's version. Covers
  three phases: upstream provenance sync, the official publish flow, and the
  post-publish consumer pull + smoke test. Do NOT use for authoring a brand-new
  extension from scratch or for routine code edits (use the `swamp` skill for
  those) — this is the release wrapper, not the authoring guide.
---

# Release a vendored-upstream extension (the deploy dance)

A release runbook for shipping a swamp extension whose model/report code is
**vendored** (copied) from a separate canonical upstream repo, and which other
repos **consume** by pulling it from the registry. It orchestrates git + the
`swamp` CLI across repos. The publish mechanics themselves are owned by the
official `swamp` skill — this skill **points to** those guides and wraps the
cross-repo steps the official guide doesn't cover.

This is a Claude Code skill (agent runbook), not a published swamp skill.

> **Load it from inside the source repo.** A project skill is only in scope when
> Claude's working directory is this repo (or a subdir). If you launched from a
> parent dir (e.g. `~/dev`), this skill won't load and the release will be
> re-derived from scratch — `cd` into the source repo first.

## Roles (parameterize — substitute the real repos at run time)

- **upstream-provenance repo** — the canonical module you vendor code _from_.
  Optional: only present when the extension ships a vendored copy of upstream
  code. Skip Phase 1 if the extension has no upstream.
- **source repo** — holds the `manifest.yaml`; you run `swamp extension push`
  from here. Must have a **public** git remote (publish verifies it).
- **consumer repo(s)** — every repo that `swamp extension pull`s the published
  artifact and runs it.

Detect the role of the repo you're in from its remote/layout; never hardcode
repo names in this skill.

## Quick checklist

1. [ ] Decide the next version (`swamp extension version`) and set it
       everywhere.
2. [ ] (if vendored) Commit + push upstream, re-sync the vendored copy, update
       the pinned SHA — **before** the adversarial review.
3. [ ] fmt + quality clean; tests pass.
4. [ ] Adversarial review by an **independent no-context subagent** (not the
       author), recorded in-repo at the final content-hash path — no
       `pending`/unaddressed `issue`.
5. [ ] Commit + push the **source repo** to its public remote.
6. [ ] `swamp extension push` (real).
7. [ ] **Pull into every consumer and actually run it** (Phase 3 — do not skip).

## Phase 0 — Pin the version

CalVer is computed at publish time, but in-tree version fields must match what
ships or they drift.

1. `swamp extension version <name>` → shows the current published version and
   the next CalVer.
2. Set the manifest `version:` **and every in-code `version:` field** (model,
   report) to that next CalVer. Mismatched fields are a common, silent foot-gun.

## Phase 1 — Upstream provenance sync (only if the extension vendors code)

The vendored copy in the source repo claims a pinned upstream commit. If you
changed upstream code, that claim is a lie until you commit upstream and re-pin.

1. Make + test the change in the **upstream-provenance repo** (`deno test`,
   `deno fmt`, `deno lint`).
2. Commit and **push** the upstream repo. Capture the new commit SHA.
3. Re-sync the vendored copy in the **source repo**: copy the exported surface
   over, re-apply any visibility/JSDoc shaping the vendored copy needs, and
   **update the pinned commit SHA** in its header to the SHA from step 2.

> **Order matters.** Do this _before_ Phase 2's adversarial review. The review
> is bound to the packaged **content hash**; editing the pin changes the
> tarball, which moves the review file path. Pin first, then review — otherwise
> the review you write lands at a stale path and the push still warns.

## Phase 2 — Publish (delegate to the official `swamp` skill)

Follow the official guides — do not re-derive them here:

- `swamp` skill → `references/extension-publish/guide.md` (publishing)
- `swamp` skill → `references/extension/references/adversarial-review.md`
  (review)

Sequence:

1. `swamp extension fmt <manifest>` — fix all formatting/lint (the quality gate
   hard-fails otherwise).
2. `swamp extension quality <manifest>` — must score clean (all factors earned).
3. Run unit tests for the model + report.
4. `swamp extension push <manifest> --dry-run --json` — this prints the
   **content-hash-bound** adversarial-review path and a fill-in skeleton.
5. **Adversarial review — delegate to an independent no-context subagent.**
   *Exempt: docs/comment/version-only changes* (no logic/schema/behavior change)
   — skip the review per the rubric's typo/comment-tweak carve-out and publish
   with `--yes` (the push review-gate warning is non-blocking). For everything
   else: the author reviewing their own diff is a rubber-stamp; spawn a fresh
   subagent
   (`general-purpose`) that re-derives everything cold:
   - Give it ONLY the diff (`git diff origin/main..HEAD`), the changed files,
     the manifest, and the rubric path (`adversarial-review.md`). **Withhold
     your own conclusions.** Prompt it to be hostile ("assume there's a bug;
     find it") and to run the mechanical checks first.
   - Require a verdict (`pass`/`issue`/`na`) for every applicable dimension,
     each with a note that cites specific identifiers/lines (proof it read THIS
     code), plus an explicit SAFE / DO NOT PUBLISH recommendation.
   - Record **its** verdicts (not yours) to the content-hash path. Set
     `export SWAMP_EXTENSION_REVIEW_DIR="$PWD/.swamp-reviews"` so the report
     lands **inside the repo** (committed in step 6 → durable + auditable),
     not the ephemeral `/tmp` default. Stamp a `reviewer` field marking it an
     independent no-context subagent.
   - If it returns any `issue` / DO NOT PUBLISH, fix forward — do **not**
     publish. Re-run the dry-run to confirm the gate is clean.
6. **Commit + push the source repo to its public remote now** (include the
   `.swamp-reviews/` report from step 5) — `repository-verified` is confirmed
   server-side at publish, so the public repo must be up to date.
7. `swamp extension push <manifest> --yes --release-notes "<what changed + back-compat note>"`.
8. Record the published version and extension ID from the output.

## Phase 3 — Pull into consumers and actually try it (DO NOT SKIP)

The registry quality score and the dry-run **do not execute the bundle in a real
consumer.** A bundle can publish cleanly and still fail to load, fail to run, or
break on data written by the previous version. **You** want to find that — not a
downstream user. Treat this phase as mandatory.

For **each** consumer repo:

1. `swamp extension pull <name> --force` — moves the consumer to the new version
   (overwrites the managed pulled copy under `.swamp/`). Confirm with
   `swamp extension list` that it now shows the new version.
2. **Confirm it loads:** `swamp model type describe <type>` reports the new
   version and the expected methods/resources. (If it's a report/skill, exercise
   that surface instead.)
3. **Confirm backwards compatibility:** if the consumer holds resources written
   by the _previous_ version, read/render one and verify the new code handles
   the old shape without throwing (e.g. a newly-added, defaulted field must not
   be dereferenced unguarded).
4. **Actually run the capability once** — run the method/report against real or
   sample input and eyeball the output. A clean publish is not proof it runs.
5. If applicable, confirm the consumer's vendored/pinned SHA now matches the SHA
   you pushed in Phase 1.

If any check fails, fix forward (new CalVer) or
`swamp extension yank <name>
<version>` the broken release, then repeat from the
relevant phase.

## What this skill does NOT do

- **Author a new extension** — use the `swamp` skill's extension guide.
- **Define the quality rubric or review dimensions** — those are owned by the
  official guides this skill points to.
- **Hardcode repo names** — keep it role-parameterized so it stays general.
