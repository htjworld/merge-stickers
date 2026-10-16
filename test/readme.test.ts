import { expect, test } from "vitest";
import { firstImage } from "../src/github/readme.js";

test("배지를 건너뛰고 첫 이미지를 고른다 (picture 안 img, 상대경로는 raw URL로)", () => {
  const md = `<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png">
    <img src="assets/logo.png" width="220">
  </picture>
</p>
<img src="https://img.shields.io/badge/x-y-blue">`;
  expect(firstImage(md, "o/r")).toBe("https://raw.githubusercontent.com/o/r/HEAD/assets/logo.png");
});

test("마크다운 이미지, 앞쪽 배지 건너뛰기, 이미지가 없으면 null", () => {
  expect(firstImage("[![CI](https://github.com/o/r/actions/workflows/ci.yml/badge.svg)](x)\n![logo](./docs/l.svg)", "o/r"))
    .toBe("https://raw.githubusercontent.com/o/r/HEAD/docs/l.svg");
  expect(firstImage("![a](https://example.com/a.png)", "o/r")).toBe("https://example.com/a.png");
  expect(firstImage("no images here", "o/r")).toBeNull();
});
