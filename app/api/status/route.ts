import { MOCK, read, type Heartbeats } from "@/lib/status";

import { connection } from "next/server";

// homelab status from Uptime Kuma, fetched here so the Kuma URL stays private and needs no CORS
export const GET = async () => {
  await connection();
  const { KUMA_URL, KUMA_SLUG } = process.env;
  if (!KUMA_URL || !KUMA_SLUG) return Response.json(read(MOCK));

  const response = await fetch(
    `${KUMA_URL.replace(/\/$/, "")}/api/status-page/heartbeat/${KUMA_SLUG}`,
    {
      next: { revalidate: 30 },
    },
  );
  if (!response.ok)
    return Response.json({ error: `kuma answered ${response.status}` }, { status: 502 });
  return Response.json(read((await response.json()) as Heartbeats));
};
