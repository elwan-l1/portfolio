import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { Locale, PrismaClient, ToolCategory } from "../generated/prisma/client";

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
    slug: "creative-coding",
    glyph: "#",
    name: "Creative coding",
    text: "Code as a sketchbook: small experiments made to be looked at, not shipped.",
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

const blogPosts = [
  {
    slug: "32-weights-in-96-bits",
    title: "32 weights in 96 bits",
    excerpt: "Rebuilding a sign plane with one rotation and an XOR.",
  },
];

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

    for (const post of blogPosts) {
      await tx.blogPost.upsert({
        where: { slug: post.slug },
        create: post,
        update: { title: post.title, excerpt: post.excerpt },
      });
    }

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
