import test from "node:test";
import assert from "node:assert/strict";
import { MEGA_MENUS, PRIMARY_NAV, TOPIC_LINKS, EXPLORE_LINKS, SECONDARY_LINKS, COMPANY_LINKS, NAV_DESCRIPTIONS } from "../lib/nav.ts";
import { CATEGORIES } from "../lib/categories.ts";

const KNOWN_STATIC_ROUTES = new Set([
  "/", "/about", "/contact", "/editorial-policy", "/metro", "/music", "/play",
  "/privacy", "/pulse", "/questions", "/saved", "/search", "/terms", "/topics", "/trending", "/community", "/tools",
]);

function isKnownRoute(href: string) {
  const slug = href.split("/").filter(Boolean)[0];
  return KNOWN_STATIC_ROUTES.has(href) || CATEGORIES.some((category) => category.slug === slug);
}

test("every top-level nav href resolves to a real category or known static route", () => {
  const allHrefs = [
    ...PRIMARY_NAV.map((link) => link.href),
    ...TOPIC_LINKS.map((link) => link.href),
    ...EXPLORE_LINKS.map((link) => link.href),
    ...SECONDARY_LINKS.map((link) => link.href),
    ...COMPANY_LINKS.map((link) => link.href),
  ];

  for (const href of allHrefs) {
    assert.ok(isKnownRoute(href), `${href} is not a known category or static route`);
  }
});

test("music navigation stays on a relevant editorial destination", () => {
  const musicLink = MEGA_MENUS.flatMap((menu) => menu.columns.flatMap((column) => column.links)).find((link) => link.label.includes("Music"));
  assert.deepEqual(musicLink, { label: "Music & Entertainment", href: "/culture" });
});

test("the same href always carries the same label across nav surfaces", () => {
  const labelByHref = new Map<string, string>();
  const allLinks = [...PRIMARY_NAV, ...TOPIC_LINKS, ...EXPLORE_LINKS, ...SECONDARY_LINKS];

  for (const { label, href } of allLinks) {
    const existing = labelByHref.get(href);
    if (existing) {
      assert.equal(label, existing, `"${href}" is labelled both "${existing}" and "${label}"`);
    } else {
      labelByHref.set(href, label);
    }
  }
});

test("mega menu columns have at most 5 links and a specific explore label", () => {
  for (const menu of MEGA_MENUS) {
    assert.ok(menu.columns.length <= 3, `${menu.label} has more than 3 columns`);
    for (const column of menu.columns) {
      assert.ok(column.links.length <= 5, `${column.title} has more than 5 links`);
      assert.notEqual(column.exploreLabel.trim().toLowerCase(), "view all", `${column.title} still uses vague "View All" wording`);
    }
  }
});

test("nav descriptions exist for every secondary and topic link", () => {
  for (const { href } of [...TOPIC_LINKS, ...SECONDARY_LINKS]) {
    assert.ok(NAV_DESCRIPTIONS[href], `missing NAV_DESCRIPTIONS entry for ${href}`);
  }
});
