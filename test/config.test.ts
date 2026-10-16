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
