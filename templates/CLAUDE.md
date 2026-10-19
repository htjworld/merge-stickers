# merge-stickers

This repo's README has a sticker board of merged PRs, generated automatically.

## Editing rules

- `.merge-stickers/config.yml` is the only file you may edit.
- Everything under `assets/merge-stickers/`, and the README between `<!--MERGE-STICKERS:START-->` and `<!--MERGE-STICKERS:END-->`, is generated. Don't edit it by hand.
- `.merge-stickers/merges.json` is collected data. Don't edit it by hand.

## After editing

1. `npx github:htjworld/merge-stickers render` (redraws without network)
2. Check the scope of changes with `git diff --stat`.
3. `npx github:htjworld/merge-stickers check` looks for private name leaks, oversized files and config keys that match nothing.

## Common requests

- Drop a repo: add its name or a glob (`"my-company/*"`) to `exclude.repos`
- Drop one PR: add `"owner/repo#123"` to `exclude.prs`
- Style a sticker: set `shape`, `finish`, `rotate`, `image` or `tier` under `stickers."owner/repo"` (the whole repo) or `"owner/repo#123"` (one PR)
- Tiers (white > color > bronze > silver > gold > platinum > diamond) come from how many PRs you have in that repo. Pin every sticker with `sticker.tier`; change the counts with `sticker.thresholds`
- Changes that need fresh data (`visibility`, `private.display`): run `npx github:htjworld/merge-stickers fetch`, then `render`
