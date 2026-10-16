import { z } from "zod";

const shape = z.enum(["circle", "squircle", "rounded-square", "hexagon", "star-badge", "shield", "cloud", "scallop"]);
export const TIERS = ["white", "color", "bronze", "silver", "gold", "platinum", "diamond"] as const;
const tier = z.enum(TIERS);
const finish = z.enum(["glossy", "matte", "holo", "foil"]);

export const configSchema = z.object({
  user: z.string().optional(),
  timezone: z.string().default("Asia/Seoul"),
  fetch: z.object({
    copilot: z.boolean().default(false),
    landed: z.boolean().default(false),
    coauthored: z.boolean().default(false),
  }).prefault({}),
  visibility: z.enum(["public", "all"]).default("public"),
  private: z.object({ display: z.enum(["mask", "hide", "show"]).default("mask") }).prefault({}),
  include: z.object({
    own: z.boolean().default(false),
    owners: z.array(z.string()).default([]),
  }).prefault({}),
  exclude: z.object({
    repos: z.array(z.string()).default([]),
    prs: z.array(z.string()).default([]),
    titleContains: z.array(z.string()).default([]),
    before: z.coerce.date().nullable().default(null),
    minStars: z.number().default(0),
  }).prefault({}),
  layout: z.object({
    type: z.enum(["board", "calendar"]).default("board"),
    columns: z.number().int().positive().default(10),
    slots: z.union([z.literal("auto"), z.literal("none"), z.number().int().positive()]).default("auto"),
    order: z.enum(["asc", "desc"]).default("asc"),
    groupBy: z.enum(["pr", "repo"]).default("repo"),
    monthLabels: z.boolean().default(false),
  }).prefault({}),
  calendar: z.object({
    view: z.enum(["month", "strip", "year"]).default("month"),
    months: z.union([z.literal("active"), z.number().int().positive()]).default("active"),
    expanded: z.number().int().positive().default(3),
    link: z.enum(["search", "strip", "tiles", "pages", "none"]).default("search"),
    weekStart: z.enum(["mon", "sun"]).default("mon"),
    locale: z.enum(["en", "ko"]).default("en"),
    tape: z.boolean().default(true),
    texture: z.boolean().default(true),
  }).prefault({}),
  header: z.object({ stat: z.enum(["stars", "since", "latest", "owners"]).default("stars") }).prefault({}),
  theme: z.enum(["paper", "holo", "midnight", "minimal"]).default("paper"),
  sticker: z.object({
    size: z.number().positive().default(72),
    variation: z.number().min(0).max(1).default(0.6),
    seed: z.string().optional(),
    image: z.enum(["auto", "readme", "social", "avatar", "language"]).default("auto"),
    tier: z.union([z.literal("auto"), tier]).default("auto"),
    thresholds: z.object({
      bronze: z.number().int().positive().default(10),
      silver: z.number().int().positive().default(20),
      gold: z.number().int().positive().default(30),
      platinum: z.number().int().positive().default(40),
      diamond: z.number().int().positive().default(50),
    }).prefault({}),
    showDate: z.boolean().default(false),
    showCount: z.boolean().default(true),
    special: z.boolean().default(true),
    animate: z.boolean().default(true),
  }).prefault({}),
  output: z.object({
    mode: z.enum(["html", "table", "sheet"]).default("html"),
    dir: z.string().default("assets/merge-stickers"),
    readme: z.string().default("README.md"),
  }).prefault({}),
  stickers: z.record(z.string(), z.object({
    shape: shape.optional(),
    rotate: z.number().optional(),
    finish: finish.optional(),
    tier: tier.optional(),
    image: z.string().optional(),
    hidden: z.boolean().optional(),
  })).default({}),
}).strict();

export type Config = z.infer<typeof configSchema>;
