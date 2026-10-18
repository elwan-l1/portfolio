import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { Locale, PrismaClient, ToolCategory } from "../generated/prisma/client";
import { generateArt } from "./art";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const projects = [
  {
    slug: "morph-32",
    name: "morph-32",
    year: 2026,
    url: "https://github.com/elwan-l1/morph-32",
    description:
      "New LLM quantization method: 32 weights stored as 3 sign planes + 1 FP16 scale, decoded on Apple GPUs.",
  },
  {
    slug: "pathsta",
    name: "pathsta",
    year: 2026,
    url: "https://github.com/elwan-l1/pathsta",
    description:
      "macOS app that turns Finder’s path bar into a text field: type or paste a path, Tab-complete, Return.",
  },
  {
    slug: "l1",
    name: "l1",
    year: 2026,
    url: "https://github.com/elwan-l1/l1",
    description:
      "My everyday CLI in Go: pulls gitignore templates, pushes and pulls files to S3, backs up my configs.",
  },
  {
    slug: "gopher-dungeon",
    name: "gopher-dungeon",
    year: 2026,
    url: "https://github.com/elwan-l1/gopher-dungeon",
    description:
      "3D tic-tac-toe where every cell is a room: a raycaster written from scratch in Go (DDA), run as WASM.",
  },
  {
    slug: "ai-matters",
    name: "AI-MATTERS",
    year: 2026,
    kind: "bachelor thesis",
    description:
      "Pipeline that shrinks LLMs for local use (pruning, FP8/INT4, QLoRA) and measures quality, speed, energy.",
  },
  {
    slug: "honics",
    name: "Honics",
    year: 2026,
    kind: "semester project",
    description:
      "Honeypots posing as industrial PLCs (extended Conpot, Modbus) on Kubernetes, to study real attackers.",
  },
];

const interests = [
  {
    slug: "design",
    glyph: "*",
    name: "Design",
    text: "Interfaces that feel inevitable: few colours, one typeface, nothing extra.",
  },
  {
    slug: "shaders",
    glyph: "~",
    name: "Shaders",
    text: "Tiny programs that run once per pixel and turn a bit of math into light.",
  },
  {
    slug: "modular-synth",
    glyph: "#",
    name: "Modular synth",
    text: "Oscillators, filters and cables, patched until something drifts.",
  },
  {
    slug: "homelab",
    glyph: "$",
    name: "Homelab",
    text: "A few machines at home running my own services, and breaking in new ways.",
  },
  {
    slug: "3d-printing",
    glyph: "=",
    name: "3D printing",
    text: "Things built up layer by layer, mostly small fixes for stuff around the house.",
  },
  {
    slug: "fpv",
    glyph: "^",
    name: "FPV",
    text: "Flying small drones through goggles, seeing exactly what the drone sees.",
  },
];

const links = [
  { label: "github", url: "https://github.com/elwan-l1" },
  { label: "linkedin", url: "https://www.linkedin.com/in/elwan-mayencourt" },
  { label: "codevs", url: "https://codevs.ch" },
];

const tools = {
  [ToolCategory.app]: [
    "Docker",
    "VS Code",
    "Ghostty",
    "Termius",
    "Obsidian",
    "Arc",
    "Figma",
    "Codex",
    "Claude",
  ],
  [ToolCategory.stack]: [
    "Python",
    "uv",
    "TypeScript",
    "Vite",
    "Tailwind",
    "React",
    "PHP",
    "Go",
    "Swift",
    "Next.js",
    "Postgres",
    "Metal",
  ],
};

const blogPost = {
  slug: "how-this-site-works",
  title: "How this site works",
  excerpt:
    "A tour of this portfolio, its style and what it can do, written with every piece of markdown the blog supports.",
  tags: ["meta", "design", "markdown"],
  publishedAt: new Date("2026-10-08T09:00:00Z"),
  body: `This site is my portfolio: one page in four languages, and this blog. This post is a tour of how it is built, why it looks the way it does and what it can do. It also uses every piece of markdown the blog supports, so it doubles as the page I check the styling against.

## What it is

The home page is a single screen of panels: who I am, what I use, my projects, my interests and a way to reach me. It is built with [TanStack Start](https://tanstack.com/start), React 19 and **TypeScript in strict mode**, styled with _Tailwind CSS 4_, and every word on it comes from a MySQL database through \`Prisma\`. It used to be a ~~Next.js~~ app until I moved it over.

All of it fits on one screen on purpose. The idea is that you can read the whole thing in one go, the way you would read a business card, and open a panel when something catches your eye.

### The rules it follows

1. Every colour comes from **Catppuccin Mocha**[^1], straight from the theme, never invented.
2. Every letter is monospace.
3. Art is drawn with real characters, not images.
4. Nothing is see-through: no opacity, no faded copies of a colour.
5. Text lives in the database, one row per language, so the code never holds copy.

#### Why monospace

A monospace font puts every character on a grid. That grid is what lets the art, the labels and the text line up with each other, and it gives the whole site the feel of a terminal that has been tidied up.

## The look

- **Fonts**
  - Martian Mono for the interface and the headings, like the ones on this page
  - Noto Sans Mono for the art and for the text you are reading now
- **Colours**
  - \`base\`, \`mantle\` and \`crust\` for the surfaces, darkest last
  - \`mauve\` and \`pink\` for accents, \`text\` and its quieter steps for words
- **Art**: skeletons, eyes and logos built from \`@\`, \`#\`, \`$\` and blocks like \`▓\`

> If something can be drawn with characters, it is drawn with characters.
>
> That one rule explains most of the design.

### Art as text

Each figure is stored in a small text format of my own. The first line names the art, its size and its three colours. The second describes which colour each run of glyphs takes. Every line after that is a row, where a number stands for that many spaces:

~~~
eye-study 144 58 #CBA6F7 #FFFFFF #FFBFE9
~~~

The colours come from the theme, declared once as tokens:

~~~css
@theme static {
  --color-mauve: #cba6f7;
  --color-pink: #f5c2e7;
  --color-base: #1e1e2e;
  --color-mantle: #181825;
  --color-crust: #11111b;
}
~~~

## What it can do

- [x] Speak English, French, German and Italian, picked from your browser
- [x] Leave a trail of glitching glyphs behind the cursor
- [x] Open panels on my homelab, 3D printer, shaders, logos and FPV
- [x] Run this blog, with tags, search and a most viewed order
- [ ] Draw diagrams in posts, maybe one day

### The cursor

Move the mouse and it leaves a short trail of glyphs. They come from a tiny alphabet and three colours:

~~~ts
export const CHARS = "L1█";
const COLORS = ["#CBA6F7", "#FFFFFF", "#FFBFE9"];
~~~

Touch a word on the home page that is marked for it, and a glitch runs through its letters.

### Languages

Open the bare address and you are sent to your own language. The server reads what your browser asks for and picks the closest of the four:

~~~ts
const getLocale = (request: Request) => {
  const headers = { "accept-language": request.headers.get("accept-language") ?? "en" };
  const languages = new Negotiator({ headers }).languages();

  return match(languages, [...LANGUAGES], defaultLocale);
};
~~~

## The blog

Posts are written in markdown and kept in the database. The server turns them into HTML once, with code coloured on the way, so the page that reaches you is already finished. Each post gets its own small piece of generated text art, the one at the top of this page.

### How big the text is

Before settling on the size of this text, I measured how other blogs set theirs. Monospace runs about a third wider than an ordinary font, so the same number of pixels reads much larger:

| Site        |  Body text | Line height | Characters a line |
| :---------- | ---------: | :---------: | ----------------: |
| Medium      | 20px serif |    32px     |                77 |
| dev.to      |  18px sans |    27px     |                79 |
| PlanetScale |  16px mono |    24px     |                76 |
| This blog   |  15px mono |   25.5px    |                76 |

The change itself was small:

~~~diff
- font-size: clamp(1.0625rem, 0.95rem + 0.25vw, 1.1875rem);
- line-height: 1.75;
+ font-size: clamp(0.875rem, 0.8rem + 0.2vw, 0.9375rem);
+ line-height: 1.7;
~~~

### Code

Code blocks are coloured on the server, for the languages I use most. A few from this project:

~~~sh
pnpm db:up && pnpm db:migrate && pnpm db:seed
~~~

~~~json
{
  "dev": "vite dev",
  "build": "vite build",
  "start": "PORT=2828 node --env-file-if-exists=.env .output/server/index.mjs"
}
~~~

~~~yaml
services:
  mysql:
    image: mysql:9.7
    ports:
      - "127.0.0.1:3306:3306"
~~~

~~~sql
CREATE TABLE blog_post_sources (
    post_id INTEGER NOT NULL,
    source VARCHAR(32) NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (post_id, source)
);
~~~

That last table counts where readers come from[^2].

### The dust behind this page

Look at the margins. Each side holds a thin dust of \`·\`, \`+\` and the odd \`@\`, coloured along a gradient from pink at the edge of the screen to the darkest surface by the text, so it seems to sink into the page. Each side is drawn from its own edge, so resizing the window never moves it:

~~~ts
const grain = (x: number, y: number, side: number) => {
  if (hash(x, y, 41 + side * 50) > DUST) return null;
  const r = hash(x, y, 42 + side * 50);
  return r < 0.85 ? "·" : r < 0.95 ? "+" : "@";
};
~~~

When you open a post, both sides slide apart to give the text room, and they slide back when you return to the list.

---

## Under the hood

1. Your request reaches a small Node server.
   - Without a language in the address, it sends you to yours.
   - Pages it renders go out compressed.
2. The page asks the server for its data.
3. Prisma reads it from MySQL, running in Docker.
4. The page is rendered to HTML on the server, then comes alive in your browser.
   1. The art fades in.
   2. The cursor trail starts listening.

Everything runs on ***one machine***, and a full reset is three commands away.

[^1]: A pastel theme for the dark, with four flavours. Mocha is the darkest. <https://catppuccin.com>

[^2]: Only a count per source, like a search engine or a link from another site. Nothing about you is stored, and the numbers are not shown on the page.
`,
};

const homelab = {
  switch: { name: "GS728TP", spec: "Netgear, 28-port PoE+", ports: 28 },
  machines: [
    {
      name: "proxmox",
      port: 1,
      speed: 1000,
      monitorId: 1,
      spec: "Ryzen 5 3600XT · 32 GB DDR5",
    },
    {
      name: "snapy",
      port: 2,
      speed: 1000,
      monitorId: 2,
      spec: "FX-8350 · 32 GB DDR3",
    },
    {
      name: "mac-mini",
      port: 3,
      speed: 1000,
      monitorId: 3,
      spec: "M4 · 24 GB",
    },
    {
      name: "ts-233",
      port: 4,
      speed: 1000,
      monitorId: 4,
      spec: "QNAP NAS · 8 TB",
    },
  ],
};

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const [position, project_] of projects.entries()) {
      const { slug, name, year, description, url = null, kind = null } = project_;
      const project = await tx.project.upsert({
        where: { slug },
        create: { slug, name, year, url, position },
        update: { name, year, url, position },
      });
      await tx.projectTranslation.upsert({
        where: {
          projectId_locale: { projectId: project.id, locale: Locale.en },
        },
        create: { projectId: project.id, locale: Locale.en, kind, description },
        update: { kind, description },
      });
    }

    // an interest dropped from the list goes, its translations with it
    await tx.interest.deleteMany({ where: { slug: { notIn: interests.map(({ slug }) => slug) } } });
    for (const [position, { slug, glyph, name, text }] of interests.entries()) {
      const interest = await tx.interest.upsert({
        where: { slug },
        create: { slug, glyph, position },
        update: { glyph, position },
      });
      await tx.interestTranslation.upsert({
        where: {
          interestId_locale: { interestId: interest.id, locale: Locale.en },
        },
        create: { interestId: interest.id, locale: Locale.en, name, text },
        update: { name, text },
      });
    }

    for (const [position, { label, url }] of links.entries()) {
      await tx.link.upsert({
        where: { label },
        create: { label, url, position },
        update: { url, position },
      });
    }

    for (const [category, names] of Object.entries(tools) as [ToolCategory, string[]][]) {
      for (const [position, name] of names.entries()) {
        await tx.tool.upsert({
          where: { category_name: { category, name } },
          create: { category, name, position },
          update: { position },
        });
      }
    }

    const { tags, ...post } = blogPost;
    const art = generateArt(post.slug);
    await tx.blogPost.upsert({
      where: { slug: post.slug },
      create: { ...post, art, tags: { create: tags.map((tag) => ({ tag })) } },
      update: { ...post, art, tags: { deleteMany: {}, create: tags.map((tag) => ({ tag })) } },
    });

    const networkSwitch = await tx.switch.upsert({
      where: { name: homelab.switch.name },
      create: homelab.switch,
      update: { spec: homelab.switch.spec, ports: homelab.switch.ports },
    });
    for (const { name, ...machine } of homelab.machines) {
      await tx.machine.upsert({
        where: { name },
        create: { name, ...machine, switchId: networkSwitch.id },
        update: { ...machine, switchId: networkSwitch.id },
      });
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
