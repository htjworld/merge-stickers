# merge-stickers 기획서 (plan.md)

> 한 줄 소개: 내가 머지시킨 오픈소스 PR을 칭찬스티커판처럼 README에 붙여주는 도구

작성 목적: 구현은 직접 진행하고, 이 문서는 무엇을 어떤 순서로 만들지 정하는 기준 문서로 사용합니다.
핵심 목표는 두 가지입니다.

1. 실제로 내 프로필 README에 붙이고 싶을 만큼 예쁠 것 (GitHub 스타 획득의 핵심)
2. 설치가 30초 안에 끝날 것 (`npx merge-stickers init` 한 번)

---

## 1. 요구사항 정리

| 요구 | 해석 |
|---|---|
| 머지된 항목을 전부 가져옴 | 내가 작성자인 merged PR 전체를 GraphQL로 페이지네이션 수집 |
| 클릭하면 머지된 항목으로 이동 | 스티커 1개 = 링크 1개 (해당 PR URL) |
| 캘린더보다 칭찬스티커 느낌 | 기본 레이아웃은 "스티커판". 캘린더는 선택 레이아웃으로 제공 |
| 레포 대표 사진을 스티커처럼 | 레포 소셜 프리뷰, 오너 아바타, 언어 폴백 순으로 이미지를 고르고 다이컷 스티커로 가공 |
| 스티커마다 변주 | 모양, 각도, 크기, 마감, 장식을 시드 기반으로 결정 (재실행해도 모양 유지) |
| 훅으로 자동 수집 | GitHub Actions (cron + 수동 실행)로 갱신하고 SVG와 README 표를 자동 커밋 |
| public만 or private 포함 선택 | `visibility: public | all` 옵션. private은 마스킹 옵션 제공 |
| 빼고 싶은 레포 선택 | config의 exclude 규칙 (레포, 오너, glob, PR, 키워드, 기간) |
| Claude Code로 직접 수정 | 설정과 데이터를 사람이 읽기 쉬운 파일로 분리하고, `CLAUDE.md`와 커맨드를 함께 생성 |

---

## 2. 가장 중요한 설계 제약 (GitHub README의 한계)

이 제약을 먼저 이해해야 설계가 흔들리지 않습니다.

1. `<img>`로 렌더링되는 SVG는 JS 실행, 외부 리소스 로딩, 내부 링크 클릭이 모두 막힙니다.
   - 레포 이미지는 반드시 base64 data URI로 SVG 안에 인라인해야 합니다.
   - 폰트도 외부 로딩이 안 되므로 시스템 폰트 스택을 쓰거나 텍스트를 path로 변환합니다.
2. 하나의 큰 SVG 안에 `<a>`를 넣어도 README에서는 클릭되지 않습니다.
3. README 마크다운에는 image map이 없고, `style` 속성은 제거됩니다. 그래서 겹치기용 음수 마진 같은 CSS 트릭이 불가능합니다.
4. GitHub 이미지 프록시(camo)가 캐시하므로 같은 URL의 SVG를 갱신해도 한동안 옛날 모양이 보일 수 있습니다.

### 결정

- **클릭 가능한 보드 = 스티커 1장당 SVG 1개 + `<a><img></a>` 나열.** 각도, 위치 흔들림, 그림자는 각 SVG 안에 미리 구워 넣습니다.
- 각 타일 캔버스를 스티커보다 약간 크게(예: 96px 캔버스에 72px 스티커) 잡아서 흔들림과 회전이 잘리지 않게 합니다.
- 타일 배경은 투명으로 둡니다. 스티커의 흰색 다이컷 테두리 덕분에 라이트와 다크 모드 모두에서 잘 보입니다.
- 헤더(통계 배너)와 빈 슬롯은 라이트와 다크 두 벌을 만들고 `<picture>`로 전환합니다.
- 캐시 문제는 README 스니펫에 `?v=<콘텐츠 해시>`를 붙여 해결합니다.
- 클릭이 필요 없는 사람을 위해 **단일 `board.svg`(종이 배경 포함)** 도 보너스 출력으로 제공합니다.
- 완전한 인터랙션(호버, 툴팁, 클릭)은 **GitHub Pages용 `index.html`** 로 제공합니다. 여기서는 SVG 안의 `<a>`가 정상 동작합니다.

### 갱신 트리거에 대한 주의

"머지되면 즉시 훅"은 불가능합니다. 다른 사람 레포에서 일어난 머지는 내 레포의 워크플로우를 깨우지 않기 때문입니다.
그래서 `schedule`(하루 1회) + `workflow_dispatch`(수동)로 갱신합니다.
cron 예시: `0 18 * * *` (UTC 18시 = KST 새벽 3시)

---

## 3. 스티커 디자인 스펙 (스타를 결정하는 파트)

이 도구의 승부처는 데이터가 아니라 **스티커 한 장의 질감**입니다. 구현 전에 Phase 0에서 디자인 프로토타입부터 검증합니다.

### 3.1 스티커의 구조

- **다이컷 흰 테두리**: 이미지 윤곽을 따라 4~6px 두께로 둥글게 확장한 흰색(또는 크림색) 외곽선. 실제 스티커 느낌의 가장 큰 요소입니다.
- **부드러운 그림자**: 아래쪽으로 살짝 떨어지는 그림자 (`feDropShadow`). 종이에 붙은 얇은 스티커처럼 약하게.
- **광택 하이라이트**: 좌상단에서 대각선으로 지나가는 반투명 흰색 그라데이션 1줄.
- **필 코너(peel)**: 일부 스티커(약 15%)의 모서리를 살짝 들뜨게 표현.
- **마감 종류**: glossy(광택), matte(무광), holo(홀로그램 그라데이션 광택), foil(금박 테두리)

### 3.2 변주 규칙 (시드 기반, 결정적)

`hash(seed + pr.id)`를 mulberry32 같은 가벼운 PRNG에 넣어 모든 값을 결정합니다.
같은 입력이면 항상 같은 결과가 나오므로, 매일 돌려도 데이터가 안 바뀌면 git diff가 생기지 않습니다.

| 항목 | 범위 |
|---|---|
| 회전 | -12도 ~ +12도 |
| 크기 | 0.94 ~ 1.06배 |
| 위치 흔들림 | 타일 안에서 최대 +-8px |
| 모양 | circle, squircle, rounded-square, hexagon, star-badge, shield, cloud, scallop |
| 테두리색 | white, cream, 파스텔 3~4종 (테마별) |
| 장식 | 와시 테이프(약 10%), 스파클, "MERGED" 도장 (일부) |
| 마감 | glossy 60%, matte 20%, holo 15%, foil 5% (테마별 가중치) |

`variation` 옵션(0~1)으로 변주 강도를 조절합니다. 0이면 모두 똑같은 정렬, 1이면 가장 자유분방합니다.

### 3.3 의미가 있는 특별 스티커 (게이미피케이션)

랜덤 장식과 별개로, 데이터에 근거한 장식을 붙여 "내 기록이 쌓이는 맛"을 줍니다.

- 같은 레포에 여러 번 머지: 우하단에 `x5` 카운트 뱃지
- 해당 레포에 첫 머지: 스파클
- 스타 수가 매우 높은 레포(임계값 설정 가능): 골드 포일 테두리
- 가장 최근 머지: 살짝 큰 "NEW" 리본

### 3.4 이미지 선택 우선순위

1. `overrides`에서 사용자가 지정한 이미지
2. 레포 커스텀 소셜 프리뷰 (`usesCustomOpenGraphImage`가 true일 때만)
3. 레포 오너의 아바타
4. 폴백 스티커: 주요 언어 색상 배경 + 레포 이니셜 (GitHub 기본 생성 OG 이미지는 통계 문구가 들어 있어 못생겨서 사용하지 않음)

이미지는 가져온 뒤 `sharp`로 160px 정도로 줄이고 모양에 맞게 크롭해서 인라인합니다. 파일당 용량 예산(예: 15KB 이하)을 두고 초과하면 품질을 낮춥니다.

### 3.5 테마 프리셋

- `paper`: 크림 톤, 따뜻한 그림자, 점선 슬롯 (기본값)
- `holo`: 홀로그램 마감 비중을 높인 화려한 테마
- `midnight`: 다크 테마에 맞춘 네온 느낌의 테두리
- `minimal`: 흰 테두리, 단색 그림자, 변주 최소
- 모든 테마는 라이트와 다크 두 벌의 헤더와 슬롯을 자동 생성

### 3.6 빈 슬롯 (칭찬스티커판의 핵심 연출)

실제 칭찬스티커판처럼 **번호가 적힌 점선 원 슬롯**을 깔고, 머지된 순서대로 스티커가 채워지게 합니다.
다음에 채워질 빈 슬롯이 보이면 "더 붙이고 싶다"는 동기가 생깁니다. `slots: auto`면 현재 개수를 10의 배수로 올림해서 빈 칸을 보여줍니다.

### 3.7 헤더

한 줄 통계를 도장 스타일로 표시합니다. 예: `42 MERGED PRs / 17 REPOS / since 2023`.
스타일은 테마를 따르고, 라이트와 다크 두 벌을 생성합니다.

### 3.8 애니메이션 (선택)

holo 마감의 은은한 반짝임 정도만 CSS 애니메이션으로 지원합니다.
`prefers-reduced-motion`을 SVG 내부 미디어 쿼리로 존중하고, 기본값은 off입니다.

---

## 4. 데이터 수집

### 4.1 쿼리 (GraphQL)

`search`는 결과가 1000개로 제한되므로, `user.pullRequests(states: MERGED)` 커넥션을 `first: 100`으로 페이지네이션합니다.
정렬 필드는 CREATED_AT 또는 UPDATED_AT만 있으므로 `mergedAt` 기준 정렬은 수집 후 클라이언트에서 처리합니다.

```graphql
query($login: String!, $cursor: String) {
  user(login: $login) {
    pullRequests(states: MERGED, first: 100, after: $cursor,
                 orderBy: { field: CREATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        number
        title
        url
        mergedAt
        repository {
          nameWithOwner
          isPrivate
          isFork
          stargazerCount
          openGraphImageUrl
          usesCustomOpenGraphImage
          owner { login avatarUrl }
          primaryLanguage { name color }
        }
      }
    }
  }
}
```

### 4.2 정규화 모델 (`merges.json`)

```json
{
  "generatedAt": "2026-10-15T09:00:00Z",
  "user": "htjworld",
  "items": [
    {
      "id": "PR_kwDO...",
      "key": "owner/repo#123",
      "repo": "owner/repo",
      "owner": "owner",
      "title": "fix: ...",
      "url": "https://github.com/owner/repo/pull/123",
      "mergedAt": "2026-09-30T04:12:00Z",
      "isPrivate": false,
      "stars": 1234,
      "language": { "name": "Python", "color": "#3572A5" },
      "imageUrl": "https://..."
    }
  ]
}
```

- 이 파일은 **자동 생성 데이터**이고, 사람이 고치는 파일은 `config.yml` 하나뿐입니다. (7장 참고)
- 날짜는 `timezone` 옵션(기본 `Asia/Seoul`)으로 변환해서 표시합니다.

### 4.3 토큰과 권한

| 모드 | 필요한 토큰 | 비고 |
|---|---|---|
| `visibility: public` | 기본 `GITHUB_TOKEN`으로 충분 | 공개 데이터만 조회 |
| `visibility: all` | PAT 필요 (Secret으로 등록) | 클래식 PAT의 `repo` 스코프가 가장 단순 |

- fine-grained PAT는 한 번에 한 소유자(개인 또는 조직)로만 범위를 잡을 수 있어서, 여러 조직의 private 머지를 가져오려면 클래식 PAT가 편합니다. (구현 시 최신 GitHub 문서로 재확인)
- 조직이 SAML SSO를 쓰면 PAT를 해당 조직에 별도로 authorize 해야 합니다. README의 트러블슈팅에 적어둡니다.

### 4.4 private 레포 처리 (중요)

회사 레포 머지가 공개 README에 레포 이름으로 노출되면 사고가 됩니다. 그래서 `visibility: all`에서도 표시 방식을 따로 고르게 합니다.

```yaml
visibility: all
private:
  display: mask   # mask | hide | show
```

- `mask`(기본값): 자물쇠 스티커로 표시. 레포 이름, 오너 아바타, 링크, 제목을 모두 제거 (어차피 외부인은 링크를 못 열기도 함)
- `hide`: 아예 표시하지 않음
- `show`: 그대로 표시 (본인이 공개해도 되는 경우만)
- 마스킹된 항목은 `merges.json`에도 민감 정보를 저장하지 않고, 커밋되는 산출물 어디에도 이름이 남지 않게 합니다. 이 부분은 테스트로 고정합니다.

---

## 5. 필터링 (빼고 싶은 레포 선택)

```yaml
include:
  own: false          # 내 소유 레포의 머지 포함 여부 (기본값 false, 오픈소스 기여만 보여줌)
  owners: []          # 비우면 전체. 값이 있으면 해당 오너만 포함
exclude:
  repos:              # 정확한 이름 또는 glob
    - "my-company/*"
    - "someone/noisy-repo"
  prs:                # 개별 PR 제외
    - "owner/repo#123"
  titleContains: ["wip", "typo"]
  before: 2022-01-01  # 이 날짜 이전 제외
  minStars: 0         # 스타 수가 이보다 적은 레포 제외
```

- 처리 순서: 수집, include, exclude, private 처리, 정렬. 이 순서를 문서화하고 테스트합니다.
- 개별 스티커 수정은 `stickers` 섹션에서 합니다. (7장 참고)

---

## 6. 레이아웃

### 6.1 board (기본, MVP)

- `columns`(기본 10) 단위로 줄바꿈되는 스티커판
- 정렬: `order: asc`(오래된 것부터 채움, 실제 스티커판 느낌) 또는 `desc`
- 월이 바뀌는 지점에 작은 월 라벨 칩을 옵션으로 삽입 (`monthLabels: true`)
- `groupBy: pr`(PR마다 1장, 기본) 또는 `groupBy: repo`(레포마다 1장 + `xN` 뱃지)
- `groupBy: repo`일 때 링크는 `https://github.com/{repo}/pulls?q=is:pr+author:{user}+is:merged`로 연결합니다.

### 6.2 calendar (Phase 4)

- 월별 7열 날짜 그리드. 머지가 있는 날짜 칸에 스티커를 붙입니다.
- 같은 날 여러 건이면 작은 스티커를 겹쳐서 쌓고 `+N`을 표시합니다.

### 6.3 README 삽입 방식

README에 마커를 두고, 도구가 그 사이만 교체합니다.

```markdown
<!--MERGE-STICKERS:START-->
(자동 생성 영역)
<!--MERGE-STICKERS:END-->
```

생성되는 스니펫 예시:

```html
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/merge-stickers/header-dark.svg?v=ab12cd">
    <img src="assets/merge-stickers/header-light.svg?v=ab12cd" alt="42 merged PRs across 17 repos">
  </picture>
</p>
<p align="center">
  <a href="https://github.com/owner/repo/pull/123" title="owner/repo #123"><img src="assets/merge-stickers/stickers/a1b2c3.svg?v=ab12cd" width="72" alt="owner/repo #123"></a>
  <!-- 이하 스티커 반복 -->
</p>
```

- `alt`와 `title`을 넣어 접근성과 호버 설명을 확보합니다. (`title`이 GitHub 렌더링에서 유지되는지 구현 시 확인)
- 출력 방식은 `output.mode`로 선택: `html`(기본, 클릭 가능), `table`(마크다운 표), `sheet`(단일 SVG).

---

## 7. Claude Code로 직접 다듬기 (사용자 편집 경험)

설계 원칙: **자동 생성되는 것과 사람이 고치는 것을 파일 단위로 분리**합니다.

```
.merge-stickers/
  config.yml        사람이 편집. 도구가 절대 덮어쓰지 않음
  merges.json       자동 생성. 수집된 정규화 데이터
  cache/            이미지 캐시
assets/merge-stickers/
  header-light.svg
  header-dark.svg
  stickers/*.svg
  board.svg         (sheet 모드)
CLAUDE.md           Claude Code용 안내 (init이 생성)
```

- `merges.json`을 기준으로 **오프라인에서 재렌더링**할 수 있어야 합니다. (`npx merge-stickers render`는 네트워크 없이 동작)
  그래서 Claude Code가 config만 고치고 바로 결과를 확인할 수 있습니다.
- 개별 스티커 조정 문법:

```yaml
stickers:
  "owner/repo#123":
    shape: star-badge
    rotate: 8
    finish: holo
    image: ./assets/my-logo.png
    hidden: false
```

- `init`이 생성하는 `CLAUDE.md`에는 다음을 적습니다.
  - 수정 가능한 파일은 `.merge-stickers/config.yml`뿐이고, `assets/merge-stickers/` 아래는 생성물이라 직접 고치지 않는다.
  - 수정 후에는 `npx merge-stickers render`를 실행하고 `git diff --stat`으로 변경 범위를 확인한다.
  - private 레포 이름이 산출물에 남지 않았는지 검사하는 `npx merge-stickers check`를 실행한다.
- 선택 사항으로 `.claude/commands/curate.md` 커맨드를 함께 생성합니다.
  예시 요청: "회사 레포 PR은 전부 빼줘", "첫 번째 스티커만 별 모양으로 바꿔줘", "2023년 이전 건 숨겨줘"
- `schema/merge-stickers.schema.json`을 배포해서 에디터 자동완성과 Claude Code의 오타 방지를 돕습니다.
- `check` 명령은 CI에서도 돌립니다. private 이름 누출, 깨진 링크, 용량 초과를 검사합니다.

---

## 8. 설정 전체 예시

```yaml
# .merge-stickers/config.yml
user: htjworld
timezone: Asia/Seoul

visibility: public        # public | all
private:
  display: mask           # mask | hide | show

include:
  own: false
  owners: []
exclude:
  repos: []
  prs: []
  titleContains: []
  before: null
  minStars: 0

layout:
  type: board             # board | calendar
  columns: 10
  slots: auto             # auto | 숫자 | none
  order: asc              # asc | desc
  groupBy: pr             # pr | repo
  monthLabels: false

theme: paper              # paper | holo | midnight | minimal
sticker:
  size: 72
  variation: 0.6          # 0 ~ 1
  seed: htjworld
  image: auto             # auto | avatar | social | language
  showDate: false
  showCount: true
  special: true           # 첫 머지, 골드, NEW 등 의미 있는 장식
  animate: false

output:
  mode: html              # html | table | sheet
  dir: assets/merge-stickers
  readme: README.md

stickers: {}
```

워크플로우 예시:

```yaml
# .github/workflows/merge-stickers.yml
name: merge-stickers
on:
  schedule:
    - cron: "0 18 * * *"
  workflow_dispatch:
permissions:
  contents: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: htjworld/merge-stickers@v1
        with:
          token: ${{ secrets.GH_PAT }}   # public 모드면 생략하고 기본 토큰 사용
```

커밋 방식: 변경이 있을 때만 커밋합니다. 산출물을 메인 히스토리에 쌓고 싶지 않은 사람을 위해 `output.branch` 옵션(별도 브랜치에 커밋)도 고려합니다.

---

## 9. 기술 스택과 레포 구조

- 언어: TypeScript, Node 20 이상
- 수집: `@octokit/graphql`
- 이미지 처리: `sharp` (리사이즈, 크롭, 용량 압축)
- SVG 생성: 템플릿 문자열 기반 직접 생성 (무거운 의존성 없이 결과를 완전히 통제)
- 텍스트: 시스템 폰트 스택 사용. 도장이나 헤더처럼 폰트가 중요한 곳은 `opentype.js`로 path 변환
- 스키마 검증: `zod` (+ JSON Schema 내보내기)
- 테스트: `vitest`, SVG 스냅샷, `resvg`로 PNG 렌더 후 시각 회귀 비교
- 번들: `tsup`. GitHub Action은 컴파일된 JS를 포함한 JavaScript 액션으로 배포합니다.
- 같은 코어를 **Action**과 **CLI(npx)** 가 공유합니다.

```
merge-stickers/
  action.yml
  src/
    cli.ts
    config/        schema, load, defaults
    github/        client, queries, normalize
    curate/        filter, private-mask
    assets/        fetch-image, fallback-sticker, cache
    render/        seed, shapes, finishes, sticker, board, calendar, header, themes, readme
    index.ts
  schema/          merge-stickers.schema.json
  templates/       workflow.yml, config.yml, CLAUDE.md, curate.md
  examples/        샘플 merges.json, 테마별 결과물
  docs/            갤러리 이미지, 트러블슈팅
  test/
```

---

## 10. 단계별 작업 계획

### Phase 0. 디자인 검증 (가장 먼저)

- [ ] 샘플 데이터 10개로 스티커 1장을 SVG로 직접 그려서 GitHub README(라이트와 다크)에 올려 실제 렌더링 확인
- [ ] 다이컷 테두리, 그림자, 광택, 필 코너가 GitHub의 `<img>` SVG 렌더링에서 정상 표시되는지 확인
- [ ] 레포 이미지 base64 인라인 후 용량과 로딩 속도 확인
- [ ] 8가지 모양과 3가지 마감의 룩 확정
- [ ] 이름과 로고 후보 확정 (후보: `merge-stickers`, `pr-stickerbook`, `mergebook`)

완료 기준: 내가 봐도 "이건 붙이고 싶다"는 느낌의 보드 목업 1장이 나온다.

### Phase 1. 데이터 파이프라인 (MVP 1)

- [ ] config 스키마와 로더
- [ ] GraphQL 수집과 페이지네이션, 정규화, `merges.json` 저장
- [ ] include와 exclude 필터, private 마스킹
- [ ] 이미지 수집, 리사이즈, 캐시
- [ ] CLI: `fetch`, `render`, `check`

완료 기준: `npx merge-stickers fetch`로 내 계정의 모든 머지 PR이 `merges.json`에 들어간다.

### Phase 2. 렌더러 (MVP 2)

- [ ] 시드 PRNG와 변주 규칙
- [ ] 모양 8종, 마감 4종, 폴백 스티커
- [ ] 스티커 1장 SVG 생성 + 타일 캔버스
- [ ] 헤더(라이트와 다크), 빈 슬롯
- [ ] README 마커 삽입 (`html`, `table`, `sheet` 모드)
- [ ] 결정성 테스트 (같은 입력, 같은 출력)

완료 기준: 내 README에 클릭 가능한 스티커판이 붙고, 모든 스티커가 올바른 PR로 이동한다.

### Phase 3. 배포 형태 (MVP 3)

- [ ] GitHub Action 패키징과 변경 시에만 커밋
- [ ] `npx merge-stickers init` (워크플로우, config, 마커, `CLAUDE.md` 생성)
- [ ] 테마 4종 완성
- [ ] 문서: 빠른 시작 3단계, PAT 발급 가이드, SSO 트러블슈팅, private 안전 가이드

완료 기준: 새 레포에서 `init` 후 5분 안에 첫 보드가 생성된다.

### Phase 4. 확장

- [ ] calendar 레이아웃
- [ ] `groupBy: repo`와 카운트 뱃지
- [ ] 특별 스티커 (첫 머지, 골드, NEW)
- [ ] holo 반짝임 애니메이션 (옵션)
- [ ] GitHub Pages용 `index.html` (호버 툴팁, 필터)
- [ ] `.claude/commands/curate.md`

### Phase 5. 런칭 (스타 전략)

- [ ] 프로젝트 README: 상단에 히어로 이미지(내 보드 실제 결과), 설치 3줄, 테마 갤러리, 옵션 표
- [ ] 이 도구로 만든 내 프로필 README를 데모로 링크 (도그푸딩)
- [ ] 레포 social preview 이미지 제작, GitHub topics 설정 (`github-profile`, `readme`, `open-source`, `svg`, `github-actions`)
- [ ] 예시 갤러리 레포 또는 `examples/`에 테마별 결과물
- [ ] 홍보: GeekNews, dev.to, Reddit(r/opensource, r/github), X, awesome-github-profile-readme 류 리스트 PR
- [ ] 이슈 템플릿, `CONTRIBUTING.md`, MIT 라이선스, 릴리스 노트

### Phase 6. (선택) 웹 설정기

- [ ] 정적 사이트(Vercel 또는 GitHub Pages): 유저네임 입력, 실시간 미리보기, 옵션 선택 후 workflow와 config 복사
- [ ] 미리보기는 public 데이터만 사용 (비로그인). 토큰은 서버에 저장하지 않음
- [ ] 동적 SVG 엔드포인트(github-readme-stats 방식)는 클릭 불가, 레이트리밋, private 불가 문제가 있어서 기본 전략에서 제외

---

## 11. 서비스 형태에 대한 결정

| 방식 | 장점 | 단점 | 결정 |
|---|---|---|---|
| GitHub Action + CLI | 서버 비용 0, 토큰이 사용자 Secret에 머무름, 클릭 가능한 보드 가능 | 갱신이 하루 단위 | **채택 (기본)** |
| 호스팅 동적 SVG | 설치가 쉬움 | 클릭 불가, 레이트리밋, private 불가, 운영 비용 | 제외 |
| 웹 설정기 | 첫인상과 홍보에 유리 | 별도 개발 필요 | Phase 6 (선택) |

---

## 12. 리스크와 확인할 것

- [ ] GitHub `<img>` SVG에서 SVG 필터, CSS 애니메이션이 의도대로 렌더되는지 (Phase 0에서 가장 먼저 검증)
- [ ] 스티커 100개 이상일 때 README 로딩 성능. 필요하면 최근 N개만 보드에 표시하고 나머지는 접기 (`<details>`) 처리
- [ ] 이미지 용량 예산을 넘는 경우의 품질 저하 전략
- [ ] camo 캐시 갱신 지연. `?v=해시`로 충분한지 실제 확인
- [ ] fine-grained PAT 범위 제한과 SSO 동작을 최신 문서로 재확인
- [ ] 레포가 삭제되었거나 접근 불가인 PR의 처리 (폴백 스티커로 표시하고 링크는 유지)
- [ ] 봇이 머지했거나 스쿼시 머지된 PR이 내 PR로 정확히 잡히는지 (작성자 기준이라 잡히는 것이 정상. 직접 푸시된 커밋은 대상 아님)
- [ ] private 이름 누출 방지 테스트를 CI 필수 항목으로 고정

---

## 13. 완료의 정의 (v1.0)

1. 새 레포에서 `npx merge-stickers init` 후 5분 안에 보드가 README에 붙는다.
2. 모든 스티커가 라이트와 다크 모드에서 모두 예쁘게 보이고, 클릭하면 해당 머지 PR로 이동한다.
3. `visibility: public`과 `visibility: all`(마스킹)이 모두 동작하고, 마스킹된 레포 이름이 산출물 어디에도 남지 않는다.
4. exclude 규칙과 개별 스티커 수정이 `config.yml`만으로 동작하고, Claude Code가 그 파일만 고쳐서 결과를 바꿀 수 있다.
5. 같은 입력이면 항상 같은 출력이 나오고, 변경이 없는 날에는 커밋이 생기지 않는다.
6. 프로젝트 README만 봐도 "나도 붙이고 싶다"는 생각이 든다.
