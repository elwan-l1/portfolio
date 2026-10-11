import { RATE_LIMITS, RATE_WINDOW_MS } from "@/constants/limits";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

// one fixed window for every client, cleared at once so the map cannot grow without bound
let windowEnd = 0;
const hits = new Map<string, number>();

// the host's reverse proxy appends the visitor's ip last in x-forwarded-for
const clientIp = () =>
  getRequestHeader("x-forwarded-for")?.split(",").at(-1)?.trim() || getRequestIP() || "unknown";

export const allowed = (action: keyof typeof RATE_LIMITS) => {
  const now = Date.now();
  if (now >= windowEnd) {
    hits.clear();
    windowEnd = now + RATE_WINDOW_MS;
  }

  const key = `${action} ${clientIp()}`;
  const count = (hits.get(key) ?? 0) + 1;
  hits.set(key, count);
  return count <= RATE_LIMITS[action];
};
