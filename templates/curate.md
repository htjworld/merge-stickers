---
description: 스티커판을 말로 다듬기 (config.yml만 수정)
---

사용자의 요청을 `.merge-stickers/config.yml` 수정으로 옮겨 주세요. 요청: $ARGUMENTS

규칙:

1. 고치는 파일은 `.merge-stickers/config.yml`뿐입니다. `assets/merge-stickers/`와 `merges.json`은 건드리지 않습니다.
2. 스티커를 특정하려면 `.merge-stickers/merges.json`에서 `key`, `title`로 PR을 찾아 `owner/repo#123` 키를 씁니다.
3. 회사 레포처럼 통째로 빼는 요청은 `exclude.repos`에 glob(`"my-company/*"`)으로 넣습니다.
4. 수정 후 `npx merge-stickers render`, `git diff --stat`, `npx merge-stickers check`를 차례로 실행하고 결과를 요약합니다.
5. `visibility`나 `private.display`를 바꿨다면 `npx merge-stickers fetch`를 먼저 실행합니다.
