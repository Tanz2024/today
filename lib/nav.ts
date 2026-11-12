// Single source of truth for site navigation: header, mega menus, mobile
// drawer, footer, and search "explore" links all read from here so labels
// and hrefs can't drift between surfaces.

export type NavLink = { label: string; href: string };
export type NavColumn = { title: string; href: string; exploreLabel: string; links: NavLink[] };
export type FeaturedPrimary = { title: string; href: string; image: string; category: string; readingTime: string };
export type MegaMenu = {
  label: string;
  href: string;
  columns: NavColumn[];
  featured: { primary: FeaturedPrimary; secondary: NavLink[] };
};

export const FOR_YOU: NavLink = { label: "Editor's Picks", href: "/" };
export const TRAVEL: NavLink = { label: "Travel", href: "/travel" };
export const STYLE: NavLink = { label: "Style", href: "/style" };
export const ABOUT: NavLink = { label: "About", href: "/about" };

export const MEGA_MENUS: MegaMenu[] = [
  {
    label: "Culture",
    href: "/culture",
    columns: [
      {
        title: "CULTURE & TRENDS",
        href: "/culture",
        exploreLabel: "Explore Culture",
        links: [
          { label: "Internet Culture", href: "/culture" },
          { label: "Explore Culture", href: "/culture" },
        ],
      },
      {
        title: "MUSIC & ENTERTAINMENT",
        href: "/culture",
        exploreLabel: "Explore Culture",
        links: [
          { label: "Music & Entertainment", href: "/culture" },
          { label: "Culture", href: "/culture" },
        ],
      },
      {
        title: "GAMING",
        href: "/gaming",
        exploreLabel: "Explore Gaming",
        links: [
          { label: "What to Play", href: "/play/what-to-play" },
          { label: "Multiplayer", href: "/play/multiplayer" },
          { label: "Gaming Culture", href: "/play/gaming-culture" },
        ],
      },
    ],
    featured: {
      primary: {
        title: "Why Old Songs Keep Going Viral Again",
        href: "/entertainment/why-old-songs-go-viral-again",
        image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
        category: "Music",
        readingTime: "3 min read",
      },
      secondary: [
        { label: "What Is Aura Farming?", href: "/culture/what-is-aura-farming" },
        { label: "Best Games to Play With Friends", href: "/gaming/best-games-to-play-with-friends" },
        { label: "What Does 67 Mean?", href: "/culture/what-does-67-mean" },
      ],
    },
  },
  {
    label: "Relationships",
    href: "/relationships",
    columns: [
      {
        title: "RELATIONSHIPS",
        href: "/relationships",
        exploreLabel: "Explore Relationships",
        links: [
          { label: "Dating", href: "/relationships" },
          { label: "Texting & Communication", href: "/relationships" },
          { label: "Friendships", href: "/relationships" },
        ],
      },
      {
        title: "RELATIONSHIPS",
        href: "/relationships",
        exploreLabel: "Explore Relationships",
        links: [
          { label: "Confidence & Self-Esteem", href: "/relationships" },
          { label: "Relationships", href: "/relationships" },
          { label: "Sleep & Burnout", href: "/relationships" },
        ],
      },
      {
        title: "HEALTH & BODY",
        href: "/sex-health",
        exploreLabel: "Explore Health",
        links: [
          { label: "Sexual Health", href: "/sex-health" },
          { label: "Body Questions", href: "/sex-health" },
          { label: "Health Explained", href: "/questions" },
        ],
      },
    ],
    featured: {
      primary: {
        title: "What Does Dry Texting Mean?",
        href: "/relationships/what-does-dry-texting-mean",
        image: "https://images.pexels.com/photos/7343000/pexels-photo-7343000.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        category: "Relationships",
        readingTime: "6 min read",
      },
      secondary: [
        { label: "What Is a Situationship?", href: "/relationships/what-is-a-situationship" },
        { label: "Should I Double-Text?", href: "/questions/should-i-double-text" },
        { label: "How Do You Know If You're Ready for Sex?", href: "/sex-health/how-to-know-if-you-are-ready-for-sex" },
      ],
    },
  },
  {
    label: "Campus",
    href: "/campus",
    columns: [
      {
        title: "CAMPUS LIFE",
        href: "/campus",
        exploreLabel: "Explore Study & AI",
        links: [
          { label: "First Year", href: "/campus" },
          { label: "Student Life", href: "/campus" },
          { label: "Social Life", href: "/campus" },
        ],
      },
      {
        title: "STUDY & AI",
        href: "/campus",
        exploreLabel: "Explore Campus",
        links: [
          { label: "Study Skills", href: "/campus" },
          { label: "AI for Students", href: "/campus" },
          { label: "Exams & Productivity", href: "/campus" },
        ],
      },
  {
        title: "MONEY & WORK",
        href: "/money",
        exploreLabel: "Explore Money",
        links: [
          { label: "Budgeting", href: "/money" },
          { label: "Saving", href: "/money" },
          { label: "Careers & First Salary", href: "/money" },
        ],
      },
    ],
    featured: {
      primary: {
        title: "How to Make Friends at University When Everyone Already Seems to Have a Group",
        href: "/campus/how-to-make-friends-at-university",
        image: "https://images.unsplash.com/photo-1585834697738-983d6f0365bc?auto=format&fit=crop&w=1200&q=80",
        category: "Campus",
        readingTime: "6 min read",
      },
      secondary: [
        { label: "How to Use AI for Studying Without Cheating", href: "/campus/how-to-use-ai-for-studying" },
        { label: "First Week of University", href: "/campus/first-week-university-guide" },
        { label: "Got Your First Salary? Here's What to Do", href: "/money/what-to-do-with-first-salary" },
      ],
    },
  },
  {
    label: "Travel",
    href: "/travel",
    columns: [
      { title: "CITY LIFE", href: "/travel", exploreLabel: "Explore City Life", links: [
        { label: "Food & Drink", href: "/travel?filter=Food" },
      ] },
      { title: "TRAVEL", href: "/travel", exploreLabel: "Explore Travel", links: [
        { label: "Weekend Trips", href: "/travel?filter=Weekend%20Trips" },
        { label: "Budget Travel", href: "/travel?filter=Budget%20Travel" },
      ] },
      { title: "DESTINATIONS", href: "/travel", exploreLabel: "Explore Destinations", links: [
        { label: "Malaysia", href: "/travel?filter=Malaysia" },
      ] },
    ],
    featured: {
      primary: { title: "What Really Happens at Kellie’s Castle After Dark?", href: "/travel/what-really-happens-at-kellies-castle-after-dark", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Kellie%27s_Castle.jpg/1280px-Kellie%27s_Castle.jpg", category: "Travel", readingTime: "7 min read" },
      secondary: [
        { label: "Vietnam for First-Timers", href: "/travel/travelling-vietnam-first-timer-guide" },
        { label: "How to Pack for Three Days", href: "/travel/what-to-pack-for-a-3-day-trip" },
      ],
    },
  },
  {
    label: "Style",
    href: "/style",
    columns: [
      { title: "STYLE", href: "/style", exploreLabel: "Explore Style", links: [
        { label: "Outfits", href: "/style" },
        { label: "Budget Style", href: "/style?filter=Budget%20Style" },
        { label: "Personal Style", href: "/style?filter=Personal%20Style" },
      ] },
      { title: "BEAUTY", href: "/style", exploreLabel: "Explore Beauty", links: [
        { label: "Skincare", href: "/style?filter=Skincare" },
        { label: "Beauty", href: "/style" },
        { label: "Fragrance", href: "/style?filter=Fragrance" },
      ] },
      { title: "MEN", href: "/style", exploreLabel: "Explore Men's Style", links: [
        { label: "Men's Style", href: "/style" },
        { label: "Grooming", href: "/style" },
        { label: "Accessories", href: "/style" },
      ] },
    ],
    featured: {
      primary: { title: "Affordable Fragrances That Smell More Expensive Than They Are", href: "/style/affordable-fragrances-that-smell-expensive", image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=80", category: "Style & Beauty", readingTime: "6 min read" },
      secondary: [
        { label: "Beginner Skincare for Oily Skin", href: "/style/beginner-skincare-oily-acne-prone-skin" },
        { label: "How to Choose a Sunscreen", href: "/style/how-to-choose-non-greasy-sunscreen" },
      ],
    },
  },
];

const AI_MENU_LABELS = new Set(["Culture", "Campus"]);

// Desktop and mobile share the same desk-level menu source.
export const PRIMARY_NAV: NavLink[] = [
  FOR_YOU,
  ...MEGA_MENUS.filter((menu) => AI_MENU_LABELS.has(menu.label)).map((menu) => ({ label: menu.label, href: menu.href })),
];

// Reachable without hunting through the footer, per the nav architecture.
export const SECONDARY_LINKS: NavLink[] = [
  { label: "Questions", href: "/questions" },
  { label: "Play", href: "/play" },
  { label: "Pulse", href: "/pulse" },
];

// Footer "Explore" group.
export const EXPLORE_LINKS: NavLink[] = [FOR_YOU, { label: "Saved stories", href: "/saved" }, ...SECONDARY_LINKS];

// Footer "Topics" group / topic-level nav — same labels+hrefs as the mega menus.
export const TOPIC_LINKS: NavLink[] = [
  ...MEGA_MENUS.filter((menu) => AI_MENU_LABELS.has(menu.label)).map((menu) => ({ label: menu.label, href: menu.href })),
  { label: "Money", href: "/money" },
];

// Footer "BrisaStory" group.
export const COMPANY_LINKS: NavLink[] = [
  ABOUT,
  { label: "Tools", href: "/tools" },
  { label: "Editorial Policy", href: "/editorial-policy" },
  { label: "Contact", href: "/contact" },
];

// One-line descriptions for surfaces (search, homepage grid) that want more
// than a bare label — keyed by href so it can't disagree with TOPIC_LINKS/SECONDARY_LINKS.
export const NAV_DESCRIPTIONS: Record<string, string> = {
  "/relationships": "Relationships, dating and figuring out where you stand.",
  "/community": "Share a perspective, experience or idea with readers around the world.",
  "/culture": "Internet culture, trends, entertainment and music worth your time.",
  "/campus": "University life, study advice, AI and your first paychecks.",
  "/money": "Budgeting, saving and practical advice for your first paychecks.",
  "/travel": "First trips, smart packing and going somewhere new.",
  "/style": "Skincare, fragrance and personal style that feels like you.",
  "/questions": "Straight answers to the things everyone is wondering.",
  "/play": "Games, group-chat prompts and low-stakes ways to have fun.",
  "/pulse": "What's trending across BrisaStory right now.",
};
