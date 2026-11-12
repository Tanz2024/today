# BrisaStory Article Image Audit

Audited all 32 currently-published articles (draft-status articles are excluded from every
public listing already, so were skipped). Every unique image file was downloaded and
visually reviewed against its article's title/subject — not just checked for broken links.

Full machine-readable version: `content/image-review.json`.
Re-run anytime: `node scripts/audit-images.mjs --check-urls`.

## Summary

- 32 published articles, only **21 unique images** — 18 articles were sharing an image with
  at least one unrelated article.
- **1 image URL was completely broken (404)**, silently reused by 2 different articles.
- **4 images** are genuinely GOOD (clearly match their headline).
- **2 images** are WEAK-but-defensible (on-theme, but generic/could be sharper).
- **24 images** are BAD or DUPLICATE (visually unrelated, or reused across unrelated topics).
- **2 articles** have been switched to the neutral fallback graphic (see below) because their
  source image no longer loads at all.

## GOOD — no action needed

| Article | Why it works |
|---|---|
| What Does Dry Texting Mean? | Person on a bed looking at a sparse phone conversation — matches directly. |
| Best Games to Play With Friends When You're Bored | Two people, two controllers, shared screen — co-op gaming, on brief. |
| Culture and Lifestyle Are More Than Just a Vibe | Friends together looking out at a view — real social/culture moment. |
| How to Plan Your First Trip Without Overspending | Map, camera, field notes, backpack flatlay — literal trip-planning scene. |

## WEAK — on-theme but generic

| Article | Current image | Note |
|---|---|---|
| How to Build a Music and Video Night That Does Not Flop | Stadium concert crowd | Reads as a live show, not a home movie/music night. Recommend a couch/living-room scene. |
| How to Stop Impulse Buying Online | Neon arcade/slot-machine room | Thematically adjacent (impulse spending) but risks reading as gambling, not online shopping. |

## MISSING (broken link) — fixed to neutral fallback

Both of these pointed at the exact same Unsplash URL, which now 404s:

| Article | Was | Now |
|---|---|---|
| Got Your First Salary? Here's What to Do With It | `photo-1614680376573-...` (404) | `/images/fallback-editorial.svg`, flagged for review |
| First Time Sex: What You Should Actually Know | same broken URL | `/images/fallback-editorial.svg`, flagged for review |

## BAD / DUPLICATE

**Article: What Does Dry Texting Mean? — shares its image with:** ~~Why Is Everyone Saying '67'?~~
Image is GOOD for dry-texting, WEAK for '67' (a phone-in-hand shot works loosely for internet slang, but wasn't chosen for it specifically). Recommend a distinct image for '67'.

**Article: What Is a Situationship? / ChatGPT vs Gemini for Students**
Current image: neon "81 NEON" shopfront at night.
Status: BAD (both). Reason: unrelated to a relationship story or an AI-tools comparison — pure aesthetic filler.

**Article: First Week of University / Left on Delivered: What Does It Actually Mean?**
Current image: abstract orange/blue liquid-metal gradient.
Status: BAD (both). Reason: communicates nothing about campus life or texting.

**Article: How to Make Friends at University**
Current image: pink-toned water ripple abstract.
Status: BAD. Reason: no students, no campus, no friendship visible.

**Article: How to Study Without Burning Yourself Out**
Current image: retro Game Boy/Commodore/cassette desk still life.
Status: BAD. Reason: reads as gaming nostalgia, not study burnout.

**Article: How to Use AI for Studying Without Cheating / How Do You Know If You're Ready for Sex?**
Current image: neon nightlife street with parked motorbikes.
Status: BAD (both). Reason: no connection to studying/AI or to the sex-health topic.

**Article: Why Old Songs Keep Going Viral Again**
Current image: generic close-up microphone.
Status: BAD. Reason: brief specifically calls for OLD MUSIC + MODERN INTERNET (vinyl/cassette + phone/streaming); a microphone implies live performance, which this article isn't about.

**Article: Gaming and Vibing: How to Make a Game Night Actually Fun**
Current image: solo gamer at a competitive/esports-style setup, alone.
Status: BAD. Reason: article is explicitly about gaming *with friends*; image shows one person, competitive context, not a casual shared game night.

**Article: What Does 'Lowkenuinely' Mean? / How Much Should You Save Each Month? / How to Split Rent and Bills Fairly With Friends / How to Budget as a Student Without Hating Your Life / Signs Someone Likes You Over Text (That Aren't Just Vibes)**
Current image: retro-futuristic desk toy + Coke can + neon "Z" logo (same photo, 5 articles).
Status: BAD (all five). Reason: this is the single worst offender — one aesthetic still-life image standing in for a slang explainer, three separate money/budgeting articles, and a texting-signals article. None of the five subjects are represented.

**Article: What Is Aura Farming? / Can You Get Pregnant From Pre-Cum?**
Current image: pink sunset with silhouetted fishermen on a pier.
Status: BAD (both). Reason: no connection to internet slang or to a sexual-health question.

**Article: What Does 🥀 Mean in Texting?**
Current image: retro CRT monitor + Coke can + neon plant scene.
Status: BAD. Reason: same "aesthetic filler" problem — nothing about emoji or texting.

**Article: How to Stop Impulse Buying Online / When Should You Get Tested for STIs?**
Current image: dark neon arcade/slot-machine room.
Status: WEAK for impulse-buying (see above), BAD for STI testing — no connection at all, and pairing a gambling-adjacent image with a health topic is a bad look regardless of relevance.

**Article: First Date Guide: What to Wear, Talk About & Do After**
Current image: wall of reflective CDs.
Status: BAD. Reason: brief explicitly calls this out — no people, no date, no cafe/restaurant context.

**Article: Can You Get Pregnant During Your Period?**
Current image: moody pink/grey storm clouds.
Status: BAD. Reason: pure abstract mood shot, no connection to the topic; sex-health content should be neutral and educational, not atmospheric.

**Article: How to Travel With Friends Without Ruining the Friendship**
Current image: one person walking alone down a European alley.
Status: WEAK→BAD. Reason: the article is specifically about group dynamics; the image shows a solo traveler, which undercuts the headline.

**Article: What to Pack for a 3-Day Trip**
Current image: Yosemite valley landscape with a "Boxed Water Is Better" branded product held in frame.
Status: BAD. Reason: this is a product/ad photo, not a packing scene, and includes visible third-party branding — should never have been used editorially.

## What changed in the codebase (not just content)

- `types/article.ts` — added optional `imageConcept`, `imageKeywords`, `imageMood`,
  `imageSourceType`, `needsImageReview` fields. Fully optional, nothing existing breaks.
- `lib/images.ts` — new single image-resolution helper (`resolveImage`). Falls back to a
  neutral local SVG (`public/images/fallback-editorial.svg`) only when an article has no
  working `image` at all — never swaps in another stock photo automatically.
- `lib/articles.ts` — every `Article` now passes through `resolveImage()` once, at the
  source. Since `ArticleCard`, `Hero`, category pages, `RelatedArticles`, `SearchClient`,
  `FranchiseSection`, `WtfSection`, `CategoryGrid`, and `ArticleView` all consume `Article`
  objects built here, this is the "one consistent image resolution strategy" — no component
  has its own fallback logic to get out of sync.
- `scripts/audit-images.mjs` — re-runnable audit: duplicates, missing image/alt, flagged
  articles, and (with `--check-urls`) live broken-link detection via HEAD requests.
- `content/image-review.json` — machine-readable replacement manifest for all 28 flagged
  articles (26 mismatched + 2 broken), each with a recommended concept/keywords/mood for
  sourcing or generating the real replacement photo.
- 28 article `.mdx` files — added the metadata fields above; **only the 2 broken-image
  articles had their actual `image` value changed** (to the neutral fallback). The other 26
  keep their existing (real, loading) photo untouched — swapping every mismatched image to a
  gray placeholder would itself be a large visible redesign, which was out of scope here. The
  manifest is what a human/editorial pass should work from to source real replacements.

## Known gap not fixed here

`components/layout/Header.tsx` (desktop mega-menu "Featured" panels) hardcodes its own
image URLs rather than reading them from `lib/articles.ts`, so two of its entries
(`why-old-songs-go-viral-again`, `how-to-make-friends-at-university`) point at the same
BAD images flagged above, and won't pick up future fixes automatically. Left untouched here
to avoid touching the mega-menu system in an unrelated task — worth wiring through the same
`resolveImage` path in a follow-up.
