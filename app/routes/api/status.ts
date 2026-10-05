import { MOCK, read, type Heartbeats } from "@/lib/status";

import { createFileRoute } from "@tanstack/react-router";

// homelab status from Uptime Kuma, fetched here so the Kuma URL stays private and needs no CORS
const status = async () => {
  const { KUMA_URL, KUMA_SLUG } = process.env;
  if (!KUMA_URL || !KUMA_SLUG) return Response.json(read(MOCK));

  const response = await fetch(
    `${KUMA_URL.replace(/\/$/, "")}/api/status-page/heartbeat/${KUMA_SLUG}`,
  );
  if (!response.ok)
    return Response.json({ error: `kuma answered ${response.status}` }, { status: 502 });
  return Response.json(read((await response.json()) as Heartbeats));
};

export const Route = createFileRoute("/api/status")({
  server: { handlers: { GET: status } },
});
