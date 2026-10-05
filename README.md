# Portfolio

One page, four languages, content from MySQL. [TanStack Start](https://tanstack.com/start) on
Vite and Nitro.

## Run

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Production: `pnpm build`, then `pnpm start`. Both listen on port 2828.

## Why TanStack Start instead of Next.js

The site started on Next.js 16 (App Router). It moved to TanStack Start in October 2026 to
get a smaller bundle and a simpler stack. Both versions render the same page from the same DB.

### Measured difference

Same machine (Apple M5 Pro, 18 cores, Node 26), production build, page `/en`, medians of 5
Lighthouse runs, builds averaged over 3 clean runs, load test 10 connections for 10 s with
autocannon. Machine load was 2.6 for Next.js and 3.3 for TanStack Start.

| Metric                        | Next.js 16 | TanStack Start | Change |
| ----------------------------- | ---------- | -------------- | ------ |
| JS over the wire              | 171 KB     | 120 KB         | -30%   |
| HTML document                 | 18 KB      | 6.3 KB         | -65%   |
| Total transfer                | 227 KB     | 162 KB         | -29%   |
| Client JS on disk (gzip)      | 207 KB     | 155 KB         | -25%   |
| Clean build                   | 2536 ms    | 1445 ms        | -43%   |
| Dev cold start                | 1957 ms    | 1468 ms        | -25%   |
| Dev warm request              | 53 ms      | 14 ms          | -74%   |
| Dev server memory             | 1238 MB    | 765 MB         | -38%   |
| Production server memory      | 639 MB     | 554 MB         | -13%   |
| TTFB median                   | 6.8 ms     | 4.1 ms         | -41%   |
| Load throughput               | 308 req/s  | 1234 req/s     | 4x     |
| Load latency p99              | 42 ms      | 17 ms          | -60%   |
| Mobile LCP                    | 2508 ms    | 2165 ms        | -14%   |
| Mobile TBT                    | 58 ms      | 24 ms          | -59%   |
| Mobile first contentful paint | 1054 ms    | 1803 ms        | +71%   |
| Lighthouse score, mobile      | 77         | 77             | same   |
| Lighthouse score, desktop     | 100        | 100            | same   |
