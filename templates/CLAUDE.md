# merge-stickers

이 레포의 README에는 머지된 PR이 스티커판으로 자동 생성되어 있습니다.

## 수정 규칙

- 고칠 수 있는 파일은 `.merge-stickers/config.yml` 하나뿐입니다.
- `assets/merge-stickers/` 아래와 README의 `<!--MERGE-STICKERS:START-->` ~ `<!--MERGE-STICKERS:END-->` 사이는 생성물이라 직접 고치지 않습니다.
- `.merge-stickers/merges.json`은 수집된 데이터입니다. 직접 고치지 않습니다.

## 수정 후 할 일

1. `npx merge-stickers render` (네트워크 없이 다시 그립니다)
2. `git diff --stat`으로 변경 범위를 확인합니다.
3. `npx merge-stickers check`로 private 이름 누출, 용량 초과, 안 맞는 config 키를 검사합니다.

## 자주 하는 요청

- 특정 레포 빼기: `exclude.repos`에 이름이나 glob (`"my-company/*"`)
- PR 하나 빼기: `exclude.prs`에 `"owner/repo#123"`
- 스티커 하나 꾸미기: `stickers."owner/repo#123"`에 `shape`, `finish`, `rotate`, `image`
- 데이터를 새로 받아야 하는 변경(`visibility`, `private.display`)은 `npx merge-stickers fetch` 후 `render`
