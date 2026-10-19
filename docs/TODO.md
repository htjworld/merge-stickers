# TODO

## 1. 크롬 연결 (Claude가 대신 올리게 하려면 먼저)
- [ ] 크롬의 Claude 확장이 **htjworld@gmail.com**(Claude Code와 같은 계정)으로 로그인됐는지 확인
- [ ] 확장 설치/켜짐 확인: https://claude.ai/chrome
- [ ] 크롬 완전히 재시작 → Claude Code를 `claude --chrome`으로 열기
- 2026-10-19 기준 증상: 도구는 보이는데 연결된 브라우저 목록이 비어 있음 ("Browser extension is not connected")

## 2. 가입 (전부 htjworld로)
- [ ] Hacker News: https://news.ycombinator.com/login → Create Account (`htjworld`는 비어 있음, 10-19 확인)
- [ ] Reddit: https://www.reddit.com/register (새 계정은 카르마 제한으로 글이 자동 삭제될 수 있음)
- [ ] GeekNews: https://news.hada.io → GitHub 로그인
- [ ] 각 프로필 소개란에 `https://github.com/htjworld` 적기

## 3. 홍보 글 올리기 (영어)
올리는 시간: 한국 시간 밤 10시~자정 (미국 오전). 처음 몇 시간은 댓글에 빨리 답하기. 올리기 전에 내 말투로 조금 손보기.

### Hacker News
- [ ] https://news.ycombinator.com/submit
  - title: `Show HN: Merge Stickers – Turn your merged open-source PRs into a sticker board`
  - url: `https://github.com/htjworld/merge-stickers` (text는 비우기)
- [ ] 올린 글에 첫 댓글:

```
Hi HN, I made this after a few of my PRs got merged into CPython and Spring Boot. The contribution graph turned a couple of squares greener and that was it. I wanted something closer to a sticker book.

It's a GitHub Action. Once a week it collects every PR you authored that got merged into a repo you don't own, and redraws a board in your profile README. Each sticker uses the project's own logo and links to the PR. It levels up the more you get merged into the same repo: white, color, bronze, silver, gold, platinum, diamond.

Some things that were fun to work around:

- GitHub READMEs strip CSS and most layout, so the board is dozens of small SVG pieces placed edge to edge. Each one comes in a light and a dark version via <picture>.
- Safari draws a 0x0 SVG as a 300x150 broken-image box, so pieces that should vanish at narrow widths are a 1x1 PNG at 1000x density.
- Private PRs are opt-in and show as lock stickers with no names. Every run ends with a check that fails the build if a private repo name would end up in the README or the images.

Public PRs work with the default GITHUB_TOKEN, so setup is two marker lines and one workflow file. MIT licensed. My profile is the live demo: https://github.com/htjworld

Feedback welcome, especially on the tier thresholds.
```

### Reddit (r/github, 올리기 전에 서브 규칙 확인)
- [ ] https://www.reddit.com/r/github/submit
  - title: `I made a GitHub Action that turns your merged PRs into a sticker board for your profile`
  - body:

```
Every time a PR of mine got merged into a big project, my contribution graph got one square greener. That was the whole celebration. So I built a sticker book instead.

**Merge Stickers** collects every PR you got merged into repos you don't own and puts them on your profile README as stickers:

- Each sticker uses the project's own logo and links to the PR
- Stickers level up per repo: 1st merge is white, 10th is bronze, 50th is diamond (metal tiers shine)
- Light and dark mode
- Private work PRs are opt-in and show as lock stickers with names stripped
- Runs weekly as a GitHub Action. No server, no signup, no token needed for public PRs

Setup: add two marker lines to your profile README, add one workflow file, press Run workflow.

Repo: https://github.com/htjworld/merge-stickers
Live demo (my profile): https://github.com/htjworld

Would love to see your boards, drop a link if you try it!
```

- [ ] 자동 삭제되면 신규 계정 받아주는 다른 서브레딧 찾기 (r/opensource, r/SideProject 등)

### GeekNews
- [ ] 상단 글쓰기
  - title: `Show GN: Merge Stickers – Turn your merged open-source PRs into a sticker board on your GitHub profile`
  - url: `https://github.com/htjworld/merge-stickers`
  - body:

```
A GitHub Action that collects the open-source PRs you got merged and shows them as a sticker board in your profile README.

- Collects every merged PR you authored in repos you don't own, across your whole history
- Each sticker uses the project's logo and links to the PR
- Tiers by merges per repo: white → color → bronze (10) → silver (20) → gold (30) → platinum (40) → diamond (50)
- Private PRs are opt-in, shown as lock stickers with names removed; every run checks that no private name leaks
- Light and dark mode; the board is SVG pieces tiled edge to edge, because READMEs don't allow CSS
- Public PRs work with the default GITHUB_TOKEN: two marker lines plus one workflow file
- MIT licensed, published on the GitHub Marketplace
```

### 그 다음
- [ ] awesome-github-profile-readme 류 목록에 PR (예: abhisheknaiidu/awesome-github-profile-readme)

## 4. GitHub Sponsors
- [ ] https://github.com/sponsors/accounts → 신청 (승인까지 며칠)
- [ ] 소개 글:

```
I build small open-source tools for developers, like Merge Stickers, which turns your merged PRs into a sticker board on your GitHub profile. Sponsorship keeps these tools free, maintained, and growing.
```

- [ ] 후원 단계: 월 $3, $10 + 일회성 후원 켜기
- [ ] Stripe에 은행 계좌, 세금 서류는 **W-8BEN** (한국 거주자)
- [ ] 승인 후 `.github/FUNDING.yml` 추가 (`github: htjworld`). 승인 전에 넣으면 버튼이 빈 페이지로 감

## 5. 자잘한 것
- [ ] 마켓플레이스 화면을 v1.0.1로: https://github.com/htjworld/merge-stickers/releases/edit/v1.0.1 에서 "Publish this Action to the GitHub Marketplace" 체크 → Update release

## 6. README 데모 스티커판
- [ ] 새 머지가 생기면 README 맨 위 데모판 수동 갱신 (마켓플레이스 규칙상 이 레포엔 워크플로를 못 둬서 자동 갱신 안 됨)
  - `npm run build && node dist/cli.js fetch && node dist/cli.js render` → `README.md`, `assets/demo/` 커밋
  - 설정은 `.merge-stickers/config.yml` (출력 `assets/demo`, 버튼은 README의 Settings / Install로 연결)
- [x] 스티커 툴팁에 PR 제목과 머지 날짜 추가 (10-19, PR 모드만. repo 묶음 모드는 그대로)
  - 지금: `python/cpython #149246`
  - 바꾸면: `python/cpython #149246 · <PR 제목> · merged 2026-09-12`
  - 위치: `src/render/board.ts`의 `toTiles`가 만드는 `alt`(= `title`). private은 지금처럼 이름 없이 둘 것
  - 모든 사용자 판에 적용되니 릴리스(v1.0.x) + `v1` 태그 이동까지
