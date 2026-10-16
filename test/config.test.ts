import { expect, test } from "vitest";
import { configSchema } from "../src/config/schema.js";

test("빈 config는 기본값으로 채워진다", () => {
  const c = configSchema.parse({});
  expect(c.visibility).toBe("public");
  expect(c.private.display).toBe("mask");
  expect(c.layout.columns).toBe(10);
});

test("알 수 없는 키와 잘못된 값은 거부한다", () => {
  expect(configSchema.safeParse({ visibilty: "all" }).success).toBe(false);
  expect(configSchema.safeParse({ private: { display: "x" } }).success).toBe(false);
});

test("템플릿 config.yml은 유효하고, 워크플로우 입력과 액션 입력이 서로 맞는다", async () => {
  const { readFileSync } = await import("node:fs");
  const { parse } = await import("yaml");
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const c = configSchema.parse(parse(read("templates/config.yml").replace("__VISIBILITY__", "public")));
  expect(c.header.colors.merged).toBe("auto");
  expect(c.sticker.color).toBe("unique");

  const wf = parse(read("templates/workflow.yml")) as any;
  const action = parse(read("action.yml")) as any;
  const dispatch = Object.keys(wf.on.workflow_dispatch.inputs);
  const passed = Object.keys(wf.jobs.build.steps[1].with).filter((k) => k !== "token");
  expect(passed.sort()).toEqual(dispatch.sort()); // 폼의 모든 입력이 액션으로 전달된다
  for (const k of passed) expect(action.inputs).toHaveProperty(k); // 액션이 모두 받는다
  expect(wf.on.workflow_dispatch.inputs.third_color.description).toContain("Run workflow"); // 설정창 아래 안내
});
