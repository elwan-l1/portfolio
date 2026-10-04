// Uptime Kuma's public status page API:
// GET {KUMA_URL}/api/status-page/heartbeat/{KUMA_SLUG}
// -> { heartbeatList: { [monitorId]: Beat[] }, uptimeList: { "<monitorId>_24": 0..1 } }
// fetched on the server by app/api/status/route.ts, MOCK until both variables are set

type Beat = { status: 0 | 1 | 2 | 3; time: string; msg: string; ping: number | null };
export type Heartbeats = {
  heartbeatList: Record<string, Beat[]>;
  uptimeList: Record<string, number>;
};

/** Kuma's codes: 0 down, 1 up, 2 pending, 3 maintenance. */
export type State = "up" | "down" | "pending" | "maintenance";
export type Status = { state: State; beats: State[]; ping: number | null; uptime: number | null };

/** How many recent heartbeats to keep per monitor. */
export const BEATS = 12;

const STATES: State[] = ["down", "up", "pending", "maintenance"];

// made-up history: up, except for the given steps back from now
const history = (id: number, downs: number[] = []): Beat[] =>
  Array.from({ length: 24 }, (_, k) => ({
    status: downs.includes(23 - k) ? 0 : 1,
    time: `2026-09-25 ${String(k).padStart(2, "0")}:00:00`,
    msg: "",
    ping: downs.includes(23 - k) ? null : 2 + ((id * 7 + k) % 5),
  }));

export const MOCK: Heartbeats = {
  heartbeatList: {
    "1": history(1, [9]),
    "2": history(2, [0, 1, 2, 6]),
    "3": history(3),
    "4": history(4, [15]),
  },
  uptimeList: { "1_24": 0.995, "2_24": 0.873, "3_24": 1, "4_24": 0.998 },
};

/** The newest heartbeat of each monitor, by monitor id. */
export const read = (data: Heartbeats) => {
  const out: Record<number, Status> = {};
  for (const [id, beats] of Object.entries(data.heartbeatList)) {
    const last = beats.at(-1);
    if (!last) continue;
    out[Number(id)] = {
      state: STATES[last.status] ?? "pending",
      beats: beats.slice(-BEATS).map((beat) => STATES[beat.status] ?? "pending"),
      ping: last.ping,
      uptime: data.uptimeList[`${id}_24`] ?? null,
    };
  }
  return out;
};
