---
description: Tweak the sticker board in plain words (edits config.yml only)
---

Turn the user's request into an edit of `.merge-stickers/config.yml`. Request: $ARGUMENTS

Rules:

1. `.merge-stickers/config.yml` is the only file you edit. Leave `assets/merge-stickers/` and `merges.json` alone.
2. To target a sticker, find the PR in `.merge-stickers/merges.json` by `key` or `title` and use its `owner/repo#123` key.
3. To drop a whole group, such as company repos, add a glob (`"my-company/*"`) to `exclude.repos`.
4. After editing, run `npx github:htjworld/merge-stickers render`, `git diff --stat` and `npx github:htjworld/merge-stickers check` in that order, and summarize the results.
5. If you changed `visibility` or `private.display`, run `npx github:htjworld/merge-stickers fetch` first.
