import assert from "node:assert/strict";
import test from "node:test";
import { EDITION_SIZE, editionHeading, planHomepage, type HomepageStory } from "../lib/homepage-edition.ts";

let counter = 0;
function story(overrides: Partial<HomepageStory> = {}): HomepageStory {
  counter += 1;
  return { slug: `story-${counter}`, aiTopic: "ai-companies", contentKind: "news", ...overrides };
}

const slugs = (stories: HomepageStory[]) => stories.map((item) => item.slug);

test("the edition is the six newest stories, in order", () => {
  const stories = Array.from({ length: 10 }, () => story());
  const plan = planHomepage(stories);
  assert.equal(EDITION_SIZE, 6);
  assert.deepEqual(slugs(plan.edition), slugs(stories.slice(0, 6)));
});

test("an editor-flagged hero leads the edition and is not repeated", () => {
  const stories = Array.from({ length: 8 }, () => story());
  stories[4] = story({ homepageHero: true });
  const plan = planHomepage(stories);
  assert.equal(plan.edition[0].slug, stories[4].slug);
  assert.equal(plan.edition.length, 6);
  assert.equal(new Set(slugs(plan.edition)).size, 6);
  assert.deepEqual(slugs(plan.edition.slice(1)), [stories[0], stories[1], stories[2], stories[3], stories[5]].map((item) => item.slug));
});

test("no story appears in more than one band", () => {
  const stories = [
    ...Array.from({ length: 6 }, () => story()),
    story({ aiTopic: "ai-models" }),
    story({ contentKind: "guide" }),
    story(),
    story({ aiTopic: "ai-models" }),
    story({ contentKind: "review" }),
    story({ aiTopic: "ai-models", contentKind: "explainer" }),
    story(),
  ];
  const plan = planHomepage(stories);
  const all = [...plan.edition, ...plan.latest, ...plan.models, ...plan.guides];
  assert.equal(new Set(slugs(all)).size, all.length);
  assert.equal(all.length, stories.length);
});

test("bands hold the right kind of story and are capped", () => {
  const stories = [
    ...Array.from({ length: 6 }, () => story()),
    ...Array.from({ length: 5 }, () => story({ aiTopic: "ai-models" })),
    ...Array.from({ length: 5 }, () => story({ contentKind: "guide" })),
    ...Array.from({ length: 9 }, () => story()),
  ];
  const plan = planHomepage(stories);
  assert.equal(plan.models.length, 3);
  assert.ok(plan.models.every((item) => item.aiTopic === "ai-models"));
  assert.equal(plan.guides.length, 3);
  assert.ok(plan.guides.every((item) => item.contentKind !== "news"));
  assert.equal(plan.latest.length, 6);
  assert.ok(plan.latest.every((item) => item.contentKind === "news"));
});

test("a small catalogue yields a short edition and empty bands", () => {
  const plan = planHomepage([story(), story()]);
  assert.equal(plan.edition.length, 2);
  assert.deepEqual([plan.latest, plan.models, plan.guides], [[], [], []]);
  assert.deepEqual(planHomepage([]), { edition: [], latest: [], models: [], guides: [] });
});

test("the heading never claims more stories than are shown", () => {
  assert.equal(editionHeading(6), "The six AI stories to read now");
  assert.equal(editionHeading(3), "The three AI stories to read now");
  assert.equal(editionHeading(1), "The AI story to read now");
});
