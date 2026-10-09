const KNOWN = {
  chatgpt: ["chatgpt.com", "chat.openai.com", "chatgpt"],
  claude: ["claude.ai", "claude"],
  perplexity: ["perplexity.ai", "perplexity"],
  gemini: ["gemini.google.com", "bard.google.com", "gemini"],
  copilot: ["copilot.microsoft.com", "copilot"],
  phind: ["phind.com", "phind"],

  google: ["google.com", "google"],
  bing: ["bing.com", "bing"],
  duckduckgo: ["duckduckgo.com", "duck.ai", "duckduckgo"],
  brave: ["search.brave.com", "brave.com", "brave"],
  ecosia: ["ecosia.org", "ecosia"],
  kagi: ["kagi.com", "kagi"],
  startpage: ["startpage.com", "startpage"],
  qwant: ["qwant.com", "qwant"],
  yahoo: ["yahoo.com", "yahoo"],
  baidu: ["baidu.com", "baidu"],
  yandex: ["yandex.com", "yandex.ru", "yandex"],

  x: ["x.com", "twitter.com", "t.co", "twitter", "x"],
  facebook: ["facebook.com", "fb.com", "facebook", "fb"],
  instagram: ["instagram.com", "instagram"],
  linkedin: ["linkedin.com", "lnkd.in", "linkedin"],
  reddit: ["reddit.com", "redd.it", "reddit"],
  hackernews: ["news.ycombinator.com", "hackernews", "hacker-news", "hn"],
  lobsters: ["lobste.rs", "lobsters"],
  bluesky: ["bsky.app", "bsky.social", "bluesky"],
  mastodon: ["mastodon.social", "mastodon"],
  threads: ["threads.net", "threads.com", "threads"],
  youtube: ["youtube.com", "youtu.be", "youtube"],
  discord: ["discord.com", "discord.gg", "discord"],
  slack: ["slack.com", "slack"],
  telegram: ["t.me", "telegram.org", "telegram"],
  whatsapp: ["whatsapp.com", "wa.me", "whatsapp"],
  pinterest: ["pinterest.com", "pin.it", "pinterest"],
  tiktok: ["tiktok.com", "tiktok"],
  quora: ["quora.com", "quora"],

  github: ["github.com", "github"],
  gitlab: ["gitlab.com", "gitlab"],
  stackoverflow: ["stackoverflow.com", "stackexchange.com"],
  medium: ["medium.com", "medium"],
  devto: ["dev.to", "devto"],
  hashnode: ["hashnode.com", "hashnode.dev", "hashnode"],
  substack: ["substack.com", "substack"],
  wikipedia: ["wikipedia.org", "wikipedia"],
  producthunt: ["producthunt.com", "producthunt"],

  gmail: ["mail.google.com", "gmail"],
  outlook: ["outlook.live.com", "outlook.office.com", "outlook.office365.com", "outlook"],
  proton: ["mail.proton.me", "proton.me"],

  newsletter: ["newsletter"],
  email: ["email", "e-mail"],
  rss: ["rss", "feed"],
};

// country domains that are the same site
const PATTERNS: [RegExp, keyof typeof KNOWN][] = [
  [/^google\.(?:com?\.)?[a-z]{2,3}$/, "google"],
  [/^yandex\.[a-z.]+$/, "yandex"],
  [/^yahoo\.[a-z.]+$/, "yahoo"],
];

const ALIASES = new Map(
  Object.entries(KNOWN).flatMap(([key, aliases]) => aliases.map((alias) => [alias, key] as const)),
);

export const sourceOfName = (name: string) => ALIASES.get(name);

// `old.reddit.com` tries itself, then `reddit.com`
export const sourceOfHost = (host: string) => {
  const labels = host.replace(/^www\./, "").split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    const rest = labels.slice(i).join(".");
    const found = ALIASES.get(rest) ?? PATTERNS.find(([pattern]) => pattern.test(rest))?.[1];
    if (found) return found;
  }
};
