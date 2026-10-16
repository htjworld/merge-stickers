# merge-stickers 기획서 (plan.md)

> 한 줄 소개: 내가 머지시킨 오픈소스 PR을 칭찬스티커판처럼 README에 붙여주는 도구

작성 목적: 구현은 직접 진행하고, 이 문서는 무엇을 어떤 순서로 만들지 정하는 기준 문서로 사용합니다.
핵심 목표는 두 가지입니다.

1. 실제로 내 프로필 README에 붙이고 싶을 만큼 예쁠 것 (GitHub 스타 획득의 핵심)
2. 설치가 30초 안에 끝날 것 (`npx merge-stickers init` 한 번)

> 2026-10-16 보강: 자료조사를 바탕으로 두 축을 끌어올렸습니다.
> (1) **"아무것도 안 해도 내 머지가 전부 들어온다"** 는 수집 경험 (4장, 4.5~4.8)
> (2) **캘린더 레이아웃의 미감** (6.2, 2.1, 2.2)
> 조사 출처는 부록 A에 정리했습니다. `[실측]`은 실제 API를 호출해서 확인한 내용입니다.

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

### 2.1 README에서 이미지를 이어 붙일 때의 한계 (캘린더 설계의 전제)

GitHub 마크다운 CSS(`github-markdown-css`) 기준으로 확인한 내용입니다.

- `<table>`은 셀마다 `padding: 6px 13px`, 1px 테두리, 짝수 행 배경색이 들어가고 `style`이 제거되므로 끌 수 없습니다. **그리드에 table을 쓰지 않습니다.**
- `<p>` 안에 `<img>`를 나열할 때 태그 사이 공백과 줄바꿈을 모두 없애야 가로 틈이 사라집니다. `align="top"`으로 베이스라인 틈을 줄여도 **줄 사이 약 8px 세로 틈은 남습니다.**
- `<picture>` 안의 `<source>`와 `<img>` 사이에도 공백이 없어야 합니다.
- 결론: 이미지 타일을 빈틈없이 맞붙여 하나의 달력처럼 보이게 하는 것은 불가능에 가깝습니다. 타일을 쓰려면 **틈이 디자인의 일부로 보이게** 만들어야 합니다 (6.2.2 참고).

### 2.2 다크 모드

- `<img>`로 넣은 SVG 내부의 `@media (prefers-color-scheme)`는 OS가 아니라 **임베딩한 페이지의 `color-scheme`** 을 따르는 것이 표준입니다. Firefox 105+, Chrome 129+는 지원하지만 **Safari(26.5까지)는 미지원**입니다.
- GitHub 공식 방식인 `<picture><source media="(prefers-color-scheme: dark)">`는 snk, 3d-contrib 등 인기 프로젝트가 모두 쓰는 검증된 방식입니다. 다만 GitHub 테마 설정과 OS 설정이 다를 때 어느 쪽을 따르는지는 미확인입니다.
- **결정**: 라이트와 다크 두 벌을 `<picture>`로 전환하고, 각 SVG 안에도 `@media` 블록을 백업으로 둡니다. 엇갈린 버전이 보여도 읽히도록 스티커는 순백 배경이 아닌 중간 톤 종이 위에 올립니다.

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

1. `stickers` 섹션에서 사용자가 지정한 이미지
2. 레포 커스텀 소셜 프리뷰 (`usesCustomOpenGraphImage`가 true일 때만)
3. 레포 로고 파일: 루트, `.github/`, `docs/`에서 `logo*.svg|png`를 찾음. GraphQL `object(expression: "HEAD:...")`로 트리를 한 쿼리에 받아서 추가 비용이 거의 없음. 기존 도구 중 이 방식을 쓰는 곳은 없어서 차별점이 됨
4. 레포 오너의 아바타 (`avatarUrl(size: 128)`, 항상 존재)
5. 폴백 스티커: 주요 언어 색상 배경 + 레포 이니셜

- `[실측]` moby, golang/go 같은 대형 레포도 `usesCustomOpenGraphImage: false`였고, 이때 `openGraphImageUrl`은 텍스트 카드(`opengraph.githubassets.com`)라 못생깁니다. 2번 조건을 반드시 지킵니다.
- 이미지는 레포 단위로 캐시합니다. PR이 아무리 많아도 다운로드는 레포 수만큼만 일어납니다.

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

`[실측]`으로 확인한 이 커넥션의 성질:

- 1000건 상한이 없습니다. 머지 PR 1,652건 계정을 끝까지 페이지네이션했고 비용은 **총 17포인트**였습니다.
- 아카이브된 레포의 PR도 포함됩니다.
- 이름이 바뀌거나 이전된 레포는 **현재 이름**으로 나옵니다 (예: `docker/docker` → `moby/moby`). 5장과 7장의 키 매칭에 영향이 있습니다 (4.8 참고).
- 삭제된 레포의 PR은 레포와 함께 사라지고, 어떤 API로도 복구할 수 없습니다. → `merges.json`에 한 번 들어간 항목은 다음 수집에서 사라져도 **지우지 않고 `gone: true`로 보존**합니다. 스티커판에서 스티커가 떨어져 나가는 경험은 최악이기 때문입니다.
- `search(is:pr author:X is:merged)`와 개수를 비교하면 거의 같지만, **Copilot coding agent가 대신 연 PR**은 search에만 잡혔습니다 (4.5 참고).

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
          owner { login avatarUrl(size: 128) }
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
      "imageUrl": "https://...",
      "source": "merged",
      "aliases": ["old-owner/old-repo#123"],
      "gone": false
    }
  ]
}
```

- 이 파일은 **자동 생성 데이터**이고, 사람이 고치는 파일은 `config.yml` 하나뿐입니다. (7장 참고)
- 날짜는 `timezone` 옵션(기본 `Asia/Seoul`)으로 변환해서 표시합니다. 캘린더는 이 변환된 날짜로 칸을 정합니다.
- `source`: `merged`(기본) | `copilot` | `landed` | `coauthored` (4.5 참고)
- `aliases`: 이전 수집과 같은 `id`인데 레포 이름이 달라졌으면 예전 키를 여기에 쌓습니다 (4.8 참고)
- `gone`: 이번 수집에서 사라진 항목 (삭제된 레포 등). 지우지 않고 보존합니다.

### 4.3 토큰과 권한

| 모드 | 필요한 토큰 | 비고 |
|---|---|---|
| `visibility: public` | 기본 `GITHUB_TOKEN` (가능 여부 Phase 0에서 검증) | 실패 시 스코프 없는 클래식 PAT |
| `visibility: all` | PAT 필요 (Secret으로 등록) | 클래식 PAT의 `repo` 스코프가 사실상 유일한 방법 |

- **미확인 1순위**: Actions의 `GITHUB_TOKEN`으로 GraphQL `user.pullRequests`를 읽을 수 있는지 자료가 엇갈립니다 (lowlighter/metrics는 불가라고 하고, profile-summary-cards는 허용). Phase 0에서 같은 계정을 PAT와 `GITHUB_TOKEN`으로 각각 수집해 개수를 비교합니다.
  - 막히면 토큰 없는 REST search로 폴백합니다 (asciimoth/prlist가 이 방식). 단 1000건 상한이 있고 비인증은 분당 10회라서, 머지가 1000건 미만인 사용자에게만 무설정 경로로 안내합니다.
- fine-grained PAT는 한 토큰이 resource owner 하나에만 묶여서 여러 조직이나 외부 협업 레포의 private PR을 못 가져옵니다. 공개 PR만 필요하면 fine-grained도 가능합니다.
- 조직이 SAML SSO를 쓰면 클래식 PAT를 조직마다 따로 authorize 해야 합니다. 승인이 빠졌을 때 GraphQL 결과가 조용히 걸러지는지 에러가 나는지는 미확인이라 Phase 0에서 확인하고, `fetch` 결과 요약에 "SSO 미승인으로 빠졌을 수 있는 조직"을 경고로 출력합니다.
- Rate limit: PAT는 시간당 5,000포인트, `GITHUB_TOKEN`은 레포당 시간당 1,000포인트입니다. 전체 수집이 수십 포인트라 어느 쪽이든 여유가 큽니다.

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

### 4.5 수집 완전성 보강 (옵션)

기본 수집(4.1)이 놓치는 경우를 옵션으로 메웁니다. 기본값은 모두 꺼두고, `fetch` 요약에서 "켜면 N건 더 잡힘"을 알려줘서 사용자가 존재를 알게 합니다.

| 옵션 | 잡아내는 것 | 방법 | 기본값 |
|---|---|---|---|
| `fetch.copilot: true` | 내가 Copilot coding agent에게 맡겨서 머지된 PR | search `is:pr author:X is:merged`와 4.1 결과의 차집합 | off |
| `fetch.landed: true` | GitHub에는 closed지만 실제로는 반영된 PR (Gerrit, 외부 rebase, squash 머지 흐름) | 아래 판별 절차 | off |
| `fetch.coauthored: true` | 남의 PR에 `Co-authored-by`로 들어간 기여 | commit search로 본문 검색. 이름 기반이라 오탐이 있음 | off |

`landed` 판별 절차 (`[실측]` golang/go #82123 사례로 검증):

1. `is:pr author:X is:closed is:unmerged` 목록을 가져옵니다.
2. PR 타임라인에서 같은 레포의 `ReferencedEvent.commit` 중 author가 X인 커밋을 찾습니다. `ClosedEvent.closer`는 null로 나와서 쓸 수 없습니다.
3. `GET /repos/{repo}/compare/{default}...{sha}`가 `behind` 또는 `identical`이면 기본 브랜치에 들어간 것으로 보고 머지로 칩니다.
4. 스티커에는 `landed` 표시(작은 도장)를 붙여 GitHub 기준 머지와 구분합니다.

`contributionsCollection`은 조회 범위가 1년으로 제한되고 머지 여부를 알 수 없어서 사용하지 않습니다.

### 4.6 갱신 전략: 매번 전체 수집

- `[실측]` 1,652건 전체를 다시 받아도 17포인트입니다. **API 비용 때문에 증분 수집을 할 이유가 없습니다.** ETag도 search와 GraphQL에서 지원되지 않습니다.
- 그래서 증분 커서 같은 상태를 두지 않고 매번 전체를 받습니다. 상태가 없으니 꼬일 일도 없습니다.
- 실제 비용은 이미지 다운로드와 커밋이므로 여기를 아낍니다.
  - 이미지는 레포 단위로 캐시합니다 (`.merge-stickers/cache/`, Actions에서는 `actions/cache`).
  - `merges.json`을 안정 정렬(mergedAt, id 순)해서 쓰고, 내용이 같으면 렌더도 커밋도 하지 않습니다.

### 4.7 무설정에 가까운 셋업

기존 도구들의 셋업 UX를 비교해 가장 좋은 점만 모읍니다 (부록 A).

- **사용자 자동 감지**: config에 `user`가 없으면 Actions에서는 `github.repository_owner`, 로컬에서는 토큰 소유자(`viewer.login`)를 씁니다. 프로필 레포(`username/username`)라면 config가 사실상 비어도 동작합니다.
- **로컬 토큰 탐색 순서**: `GH_TOKEN`/`GITHUB_TOKEN` 환경변수, 그다음 `gh auth token`, 그다음 GitHub device flow (브라우저에서 코드 입력. OAuth App에서 device flow만 켜면 client secret 없이 가능).
- **`init`이 끝까지 해줌**:
  1. 현재 레포와 사용자를 감지하고 config, workflow, README 마커를 생성
  2. 로컬에서 바로 첫 `fetch`와 `render`를 돌려 결과를 보여줌 (cron을 기다리지 않음)
  3. `visibility: all`을 골랐으면 `gh secret set GH_PAT`까지 대신 실행. 필요한 스코프가 미리 체크된 PAT 생성 URL(`https://github.com/settings/tokens/new?scopes=repo&description=merge-stickers`)을 띄워줌
  4. "머지 N건, 레포 M개, 제외된 내 레포 K건" 요약 출력
- **수집 결과 요약 리포트** (`fetch` 마지막 출력): 총 건수, 제외 규칙별로 빠진 건수, 옵션을 켜면 추가로 잡히는 건수, SSO 경고. "왜 내 PR이 안 보이지?"라는 이슈를 미리 막습니다.

### 4.8 레포 이름 변경에 강한 키

- `[실측]` 레포 이름이 바뀌면 `nameWithOwner`도 바뀌므로, config의 `"owner/repo#123"` 키가 조용히 안 맞게 됩니다.
- 내부 식별자는 PR 노드 `id`로 고정하고, `merges.json`에 예전 이름 별칭(`aliases`)을 쌓아둡니다. config 키는 현재 이름, 예전 이름, PR `id` 중 무엇으로 써도 매칭합니다.
- `check`는 아무것에도 매칭되지 않는 `stickers`, `exclude.prs` 키를 경고합니다.

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

### 6.2 calendar (미감 최우선 레이아웃)

조사 결과 GitHub에 "스티커 캘린더" 프로젝트는 없습니다. 히트맵(잔디), 3D 잔디, 뱀 정도뿐이라 **비어 있는 자리**입니다.
목표는 "스크린샷 찍어서 공유하고 싶은 다이어리 한 페이지"입니다.

#### 6.2.1 디자인 레퍼런스에서 가져올 규칙

| 레퍼런스 | 가져올 것 |
|---|---|
| 라디오 체조 도장 카드(ラジオ体操カード), 칭찬스티커판 | 스티커가 칸 경계를 살짝 넘고, 조금 비뚤고, 중심에서 어긋남. 이 불완전함이 매력의 핵심 |
| 호보니치, 미도리 다이어리 | 크림색 종이, 아주 옅은 격자, 헤더 위 와시 테이프 |
| Apple 피트니스 월간 뷰 | 격자선 없이 스티커 자체가 격자가 되는 정돈감 (minimal 테마) |
| Year in Pixels | 1년을 12열 × 31행으로 압축한 연간 뷰 |
| Duolingo, 스트릭 카드 | 큰 숫자 한두 개가 그림을 완성함. "이번 달 12 머지" 같은 통계 한 줄 |
| github-profile-3d-contrib | 깊이를 필터 대신 미리 계산한 3단 명암으로 표현. 어디서나 똑같이, 가볍게 렌더됨 |

구체 규칙:

- 격자선은 1px, 잉크 8% 불투명도. minimal 테마는 격자선 없음.
- 주말 열은 강조색 쪽으로 3% 틴트.
- 날짜 숫자는 칸 좌상단 12px, 잉크 55%. 빈 날은 숫자만 두고 빈 슬롯 그림을 그리지 않음 (보드의 빈 슬롯과 다른 점).
- **"오늘" 표시는 하지 않습니다.** 하루 한 번 갱신되는 이미지라서 오늘 표시는 금방 틀린 정보가 됩니다. 대신 우하단에 작은 "updated 10.16" 도장을 찍습니다.
- 같은 날 여러 건: 앞의 3장까지 부채꼴로 겹침. 오프셋 (0,0), (+6,-4), (-5,+5), 회전 -6도, +7도, -2도. 4건부터 우하단에 `+N` 알약(높이 18px, 강조색 배경, 흰 글씨).
- 머지가 있는 날이 연달아 이어지면 스티커 사이를 옅은 점선으로 잇습니다 (스트릭 연출).
- 스티커는 칸을 최대 12% 넘칠 수 있고, 회전은 ±8도, 위치는 ±3px 흔들림. 모두 시드 기반이라 결정적입니다.

#### 6.2.2 클릭과 미감을 둘 다 잡는 출력 방식

2.1의 제약 때문에 "빈틈없는 달력"과 "칸마다 클릭"은 동시에 안 됩니다. 그래서 세 가지 모드를 둡니다.

| 모드 | 구성 | 클릭 | 추천 |
|---|---|---|---|
| `link: search` (기본) | 한 달 = SVG 1장 (질감, 부채꼴, 손글씨 헤더까지 전부). 이미지 전체를 그 달의 GitHub 검색 결과로 링크 | 달 단위 | **기본값** |
| `link: strip` | 위 SVG + 그 아래에 그 달의 스티커를 클릭 가능한 한 줄로 나열 (`<a><img>`) | PR 단위 | 클릭이 중요한 사람 |
| `link: tiles` | 날짜 칸마다 SVG 1개. 각 칸을 **따로 잘린 종이 카드**처럼 그려서 사이 틈이 의도된 디자인으로 보이게 함 | PR 단위 | 실험적 옵션 |

- `search` 링크는 서버 없이 클릭을 살리는 가장 싼 방법입니다. 예: `https://github.com/pulls?q=is:pr+author:htjworld+is:merged+merged:2026-09-01..2026-09-30+-user:htjworld`. 다만 config의 exclude 규칙은 검색 링크에 반영되지 않습니다.
- `tiles`는 한 달에 이미지가 35~42개(다크 모드까지 하면 2배)라 camo 요청이 많고, 모바일에서 줄바꿈이 깨질 수 있어서 기본값으로 쓰지 않습니다.
- 완전한 인터랙션(호버하면 PR 제목, 연도 넘기기)은 GitHub Pages `index.html`에서 제공하고, `link: pages`로 이미지 링크를 거기로 걸 수 있습니다.

#### 6.2.3 뷰 종류

- `view: month` (기본): 한 달에 SVG 1장. README에는 최근 N개월만 펼치고 나머지는 `<details>` 안에 접어 둡니다.
- `view: strip`: 머지가 있는 달만 미니 달력 3개씩 한 줄로. 활동이 드문드문한 사람에게 빈 달이 이어지는 허전함을 없앱니다.
- `view: year`: Year in Pixels 형식 12열 × 31행, 14px 칸. 칸이 작아서 스티커 대신 레포 이미지를 원형 썸네일로 넣고, 여러 건이면 테두리를 두껍게 합니다.
- `months: active` (기본, 머지 있는 달만) | `12` | 숫자(최근 N개월).

#### 6.2.4 월간 뷰 치수 (초안, Phase 0에서 조정)

- viewBox 830 × 560, README에는 `width="100%"`로 넣습니다. (프로필 README 본문 폭이 830px 근처라는 가정은 Phase 0에서 확인)
- 바깥 여백 24px, 7열, 칸 104 × 80, 칸 사이 6px.
- 헤더 띠 96px.
  - 왼쪽: 월 이름을 손글씨 폰트 44px, 연도 18px 50% 불투명도.
  - 오른쪽: 통계 한 줄 "12 merges · 7 repos · 4-day streak".
  - 좌상단 모서리에 와시 테이프 한 조각 (-4도 회전, 사선 줄무늬 패턴, 40% 불투명도).
- 요일 라벨: 한 글자, 11px, 자간 0.08em, 잉크 45%. `weekStart: mon | sun`.
- 스티커: 64px 다이컷, 흰 테두리 4px, 그림자 `feDropShadow` dy=2, blur 2, 25%.
- 종이 질감: `feTurbulence` (baseFrequency 약 0.8, 1옥타브, `stitchTiles="stitch"`, 불투명도 0.04~0.07). camo를 거친 `<img>`에서 렌더되는지는 Phase 0에서 확인하고, 안 되면 질감 없이도 완성되게 디자인합니다.

#### 6.2.5 팔레트 토큰 (paper 테마)

| 토큰 | 라이트 | 다크 |
|---|---|---|
| paper | `#F6F7FB` | `#161B22` |
| ink | `#1F2433` | `#E6EDF3` |
| grid | ink 8% | ink 8% |
| weekend | `#F4EFE4` | `#1C222B` |
| accent | `#6C63FF` | `#8F89FF` |
| tape | `#FFC8DD` | `#7A3B55` |
| grain 불투명도 | 0.05 | 0.07 |

- 다크 종이색은 GitHub 다크 배경 `#0d1117`보다 한 단계 밝게 잡아서 "배경 위에 놓인 종이 한 장"으로 보이게 합니다.
- 테마 4종(3.5) 모두 같은 토큰 이름을 쓰고 값만 바꿉니다.

#### 6.2.6 타이포그래피

- 시스템 손글씨 폰트는 OS마다 완전히 달라서(Windows Segoe Print, macOS Bradley Hand, Android Chilanka, Linux는 cursive 폴백) 다이어리 느낌을 통제할 수 없습니다.
- 그래서 **OFL 폰트를 번들하고 opentype.js로 글자를 path로 변환**합니다. 쓰인 글자만 한 번씩 `<symbol>`로 정의하고 `<use>`로 재사용합니다 (숫자 0~9, 월과 요일 글자 합쳐 약 40자).
- 폰트 후보: 헤더와 `+N`은 손글씨(Caveat), 날짜 숫자는 깔끔한 둥근 글꼴. 한글 월 표기(`locale: ko`)용으로 Gaegu 또는 나눔손글씨 펜. 각 폰트 라이선스는 Google Fonts에서 재확인합니다.
- 용량 예상은 SVG당 15~40KB(미측정)로, base64 스티커 이미지보다 작습니다.

#### 6.2.7 모션 (선택, 기본 off)

스티커마다 400ms "붙는" 애니메이션 (scale 0.9→1 + 살짝 회전), 40ms씩 시차. `@keyframes`는 snk, streak-stats에서 `<img>` SVG 안에서도 동작함이 검증되어 있습니다. `prefers-reduced-motion`을 존중합니다.

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
user: htjworld            # 생략하면 자동 감지 (4.7)
timezone: Asia/Seoul

fetch:                    # 수집 완전성 보강 (4.5), 모두 기본 off
  copilot: false
  landed: false
  coauthored: false

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

calendar:                 # layout.type: calendar 일 때 (6.2)
  view: month             # month | strip | year
  months: active          # active | 12 | 숫자(최근 N개월)
  expanded: 3             # README에 펼쳐 둘 달 수. 나머지는 <details>
  link: search            # search | strip | tiles | pages | none
  weekStart: mon          # mon | sun
  locale: en              # en | ko
  tape: true
  texture: true

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
- [ ] **캘린더 월간 뷰 목업 1장** (6.2.4 치수, 6.2.5 팔레트)을 라이트와 다크로 만들어 README에 올려 보기
- [ ] `feTurbulence` 종이 질감이 camo를 거친 `<img>`에서 렌더되는지
- [ ] SVG 내부 `@media (prefers-color-scheme)`와 `<picture>`가 GitHub 테마 설정과 OS 설정 중 무엇을 따르는지 (Chrome, Firefox, Safari, 모바일 앱)
- [ ] 프로필 README 본문 실제 폭 측정 (830px 가정 확인)
- [ ] opentype.js path 변환 글자당 용량 측정
- [ ] **수집 검증**: 같은 계정을 PAT와 Actions `GITHUB_TOKEN`으로 각각 수집해 개수 비교 (4.3 미확인 1순위)
- [ ] SSO 미승인 조직의 PR이 GraphQL 결과에서 어떻게 보이는지

완료 기준: 내가 봐도 "이건 붙이고 싶다"는 느낌의 보드 목업 1장과 캘린더 목업 1장이 나오고, 기본 토큰 경로가 확정된다.

### Phase 1. 데이터 파이프라인 (MVP 1)

- [ ] config 스키마와 로더
- [ ] GraphQL 수집과 페이지네이션, 정규화, `merges.json` 저장
- [ ] `gone` 보존, `aliases` 누적, 안정 정렬 (4.2, 4.8)
- [ ] 사용자 자동 감지와 로컬 토큰 탐색 순서 (4.7)
- [ ] include와 exclude 필터, private 마스킹
- [ ] 이미지 수집 (로고 파일 탐색 포함), 리사이즈, 레포 단위 캐시
- [ ] `fetch` 결과 요약 리포트 (제외 사유별 건수, 옵션별 추가 건수, SSO 경고)
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
- [ ] `npx merge-stickers init` (워크플로우, config, 마커, `CLAUDE.md` 생성, 첫 렌더 즉시 실행, `gh secret set` 대행)
- [ ] calendar 월간 뷰 (`link: search`, `link: strip`). 미감이 핵심 차별점이라 Phase 4에서 앞당김
- [ ] 테마 4종 완성
- [ ] 문서: 빠른 시작 3단계, PAT 발급 가이드, SSO 트러블슈팅, private 안전 가이드

완료 기준: 새 레포에서 `init` 후 5분 안에 첫 보드가 생성된다.

### Phase 4. 확장

- [ ] calendar `strip`, `year` 뷰와 `link: tiles`
- [ ] 수집 보강 옵션 `fetch.copilot`, `fetch.landed`, `fetch.coauthored`
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
- [ ] `gone` 항목도 private 마스킹 규칙을 똑같이 따르는지 (과거 수집분에 이름이 남아 있을 수 있음)
- [ ] `fetch.landed`의 compare API 호출이 PR마다 생기므로, closed PR이 많은 사용자의 호출 수 상한
- [ ] `link: search` 검색 결과가 exclude 규칙을 반영하지 못해 보드와 개수가 다르게 보이는 문제 (문서로 안내)
- [ ] Safari에서 SVG 내부 다크 모드 미디어 쿼리가 무시되는 것 (2.2의 `<picture>` 이중화로 대응)

---

## 13. 완료의 정의 (v1.0)

1. 새 레포에서 `npx merge-stickers init` 후 5분 안에 보드가 README에 붙는다.
2. 모든 스티커가 라이트와 다크 모드에서 모두 예쁘게 보이고, 클릭하면 해당 머지 PR로 이동한다.
3. `visibility: public`과 `visibility: all`(마스킹)이 모두 동작하고, 마스킹된 레포 이름이 산출물 어디에도 남지 않는다.
4. exclude 규칙과 개별 스티커 수정이 `config.yml`만으로 동작하고, Claude Code가 그 파일만 고쳐서 결과를 바꿀 수 있다.
5. 같은 입력이면 항상 같은 출력이 나오고, 변경이 없는 날에는 커밋이 생기지 않는다.
6. 프로젝트 README만 봐도 "나도 붙이고 싶다"는 생각이 든다.
7. 별도 설정 없이 `fetch`한 결과가 GitHub 검색(`is:pr author:me is:merged -user:me`) 개수와 일치하고, 차이가 있으면 요약 리포트가 그 이유를 설명한다.
8. 캘린더 월간 뷰가 라이트와 다크 모드 모두에서 "다이어리 한 페이지"처럼 보이고, 클릭하면 그 달의 머지 목록으로 이동한다.

---

## 부록 A. 참고한 오픈소스와 자료

수집

| 프로젝트 | 방식 | 가져올 점 / 피할 점 |
|---|---|---|
| [lowlighter/metrics](https://github.com/lowlighter/metrics) (`notable`) | GraphQL `repositoriesContributedTo` | 아바타를 base64로 SVG에 인라인. PR 단위 목록은 없음 |
| [asciimoth/prlist](https://github.com/asciimoth/prlist) | 토큰 없는 REST search | 시크릿 0개, `repository_owner`로 사용자 자동 감지, `owner/*` glob 제외. 1000건 상한 |
| [coderstats/github-action-merged-pull-requests](https://github.com/coderstats/github-action-merged-pull-requests) | GraphQL | 최근 100건만 (페이지네이션 미구현) |
| [ParthJohri/github-mergedpr-readme](https://github.com/ParthJohri/github-mergedpr-readme) | REST search | 1000건 상한, 사용자명 하드코딩 |
| [jdockerty/contributed-to](https://github.com/jdockerty/contributed-to) | GraphQL 전체 + 본인 레포 제외 | 전체 수집 방향은 같음 |
| [anuraghazra/github-readme-stats](https://github.com/anuraghazra/github-readme-stats) | `repositoriesContributedTo` 개수만 | 참고할 것 없음 |

- GraphQL rate limit: https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api
- Search API 제한: https://docs.github.com/en/rest/search/search
- PR 머지 판정 원리: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges
- fine-grained PAT 제약: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- SSO용 PAT 승인: https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-a-personal-access-token-for-use-with-saml-single-sign-on
- Device flow: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow

캘린더와 렌더링

| 프로젝트/자료 | 가져올 점 |
|---|---|
| [yoshi389111/github-profile-3d-contrib](https://github.com/yoshi389111/github-profile-3d-contrib) | 필터 없이 3단 명암으로 깊이 표현, 테마마다 정적/애니메이션 두 벌 |
| [Platane/snk](https://github.com/Platane/snk) | `<picture>` + `-dark.svg` 이중화, `@keyframes` 동작 검증 |
| [lowlighter/metrics isocalendar](https://github.com/lowlighter/metrics/blob/master/source/plugins/isocalendar/README.md) | 격자 옆 큰 통계 숫자로 완성도 |
| [DenverCoder1/github-readme-streak-stats](https://github.com/DenverCoder1/github-readme-streak-stats) | 애니메이션 끄기 옵션, 로케일별 날짜 포맷 |
| [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) | table 패딩과 테두리, img 규칙 확인 |
| [jse.li: markdown tricks](https://blog.jse.li/posts/markdown/), [grahamthedev: README 반응형/다크](https://dev.to/grahamthedev/take-your-github-readme-to-the-next-level-responsive-and-light-and-dark-modes--3kpc) | 이미지 사이 공백 제거, 약 8px 줄 간격은 못 없앰 |
| [GitHub changelog: 이미지 테마 지정](https://github.blog/changelog/2022-08-15-specify-theme-context-for-images-in-markdown-ga/) | `<picture>` 공식 지원 |
| [caniuse: 상속된 color-scheme](https://caniuse.com/mdn-css_at-rules_media_prefers-color-scheme_respects-inherited-scheme), [WebKit 199134](https://bugs.webkit.org/show_bug.cgi?id=199134) | Safari에서 SVG 내부 다크 미디어 쿼리 미지원 |
| [Year in Pixels](https://www.archerandolive.com/blogs/news/creating-a-year-in-pixels-tracker-for-your-bullet-journal) | 연간 뷰 12 × 31 |
| [Duolingo 스트릭 디자인](https://blog.duolingo.com/streak-milestone-design-animation) | 연속 기록 연출 |
| [Codrops: SVG 종이 질감](https://tympanus.net/codrops/?p=37751) | `feTurbulence` 파라미터 |
| [modernfontstacks.com](https://modernfontstacks.com/) | 시스템 손글씨 폰트가 OS마다 다름을 확인 |
| [Caveat (OFL)](https://www.fontsquirrel.com/fonts/caveat) | 헤더 손글씨 폰트 후보 |
