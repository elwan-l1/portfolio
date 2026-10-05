import { useEffect, useMemo, useRef, useState } from "react";

import { CHARS } from "@/components/trail";

import type { HomeContent } from "@/lib/content.server";
import { BEATS, type Status } from "@/lib/status";

const TICK = 90; // ms per animation step
const NAME = 9; // cells for a machine's name
const REST = 6; // steps a packet waits at each end
const GLITCH = 10_000; // ms between a dead machine's glitches, give or take JITTER
const JITTER = 4_000;
const BURST = 8; // steps a glitch lasts
const DEAD = "(x_x)";
const POLL = 60_000; // ms, Kuma checks every 60 s by default

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

type Lab = NonNullable<HomeContent["homelab"]>;
type Machine = Lab["machines"][number];
type Cell = [row: number, col: number];

/**
 * The homelab as a text diagram: the switch and its row of port LEDs, a wire
 * from each machine's port to the machine, its heartbeats and uptime, its specs
 * underneath. Wires turn in order of port, so they never cross.
 */
const layout = (lab: Lab) => {
  // highest port first: its wire turns off first, the rest keep going down past it
  const order = [...lab.machines].sort((a, b) => b.port - a.port);
  // port p's LED sits in column p: the panel it is on starts a cell early
  const cols = order.map((m) => m.port);
  const nameCol = Math.max(...cols) + 3;
  const grid: string[][] = [];
  const row = () => (grid.push([]), grid.length - 1);
  const put = (r: number, c: number, s: string) => [...s].forEach((ch, k) => (grid[r][c + k] = ch));

  put(row(), 0, `${lab.name} · ${lab.spec}`);
  const portsRow = row();
  put(row(), 0, ""); // the drop from the ports before the first turn
  const paths: Cell[][] = [];
  const turns: number[] = [];

  order.forEach((m, i) => {
    const col = cols[i];
    const below = cols.slice(i + 1); // wires still on their way down
    const r = row();
    turns.push(r);
    for (const c of below) put(r, c, "│");
    put(r, col, "└");
    put(r, col + 1, "─".repeat(nameCol - col - 2));
    const spec = row();
    for (const c of below) put(spec, c, "│");
    put(spec, nameCol, m.spec);
    const path: Cell[] = [];
    for (let k = portsRow + 1; k < r; k++) path.push([k, col]);
    for (let c = col; c < nameCol - 1; c++) path.push([r, c]);
    paths.push(path);
  });
  // the vertical wires in the rows above their turn
  paths.forEach((path) => path.forEach(([r, c]) => grid[r][c] === undefined && (grid[r][c] = "│")));

  return { order, cols, grid, portsRow, paths, nameCol, turns };
};

/** Where a packet is along a path of `length` cells at step `t`, or null while it rests. */
const packet = (i: number, length: number, t: number) => {
  const period = 2 * (length + REST) + i * 3;
  const phase = (t + i * 7) % period;
  if (phase < length) return phase;
  const back = phase - length - REST;
  return back >= 0 && back < length ? length - 1 - back : null;
};

const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

const nextGlitch = () => Math.round((GLITCH + (Math.random() * 2 - 1) * JITTER) / TICK);

// recent heartbeats, oldest first: full bar for up, hollow for anything else
const strip = (s?: Status) =>
  (s?.beats ?? [])
    .map((b) => (b === "up" ? "▮" : "▯"))
    .join("")
    .padStart(BEATS, " ");

const percent = (s?: Status) =>
  s?.state === "down"
    ? DEAD.padStart(6)
    : s?.uptime == null
      ? "  –  "
      : `${(s.uptime * 100).toFixed(1)}%`.padStart(6);

const describe = (s?: Status) =>
  s
    ? [
        s.state,
        s.uptime !== null && `${(s.uptime * 100).toFixed(1)}% up over 24 h`,
        s.ping !== null && `${s.ping} ms`,
      ]
        .filter(Boolean)
        .join(", ")
    : "no status yet";

const statusOf = (status: Record<number, Status>, m: Machine) =>
  m.monitorId === null ? undefined : status[m.monitorId];

/** Every monitor's status, refreshed every minute. Empty until the first answer. */
const useStatus = () => {
  const [status, setStatus] = useState<Record<number, Status>>({});
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/status")
        .then((r) =>
          r.ok ? (r.json() as Promise<Record<number, Status>>) : Promise.reject(r.status),
        )
        .then((data) => live && setStatus(data))
        .catch(() => {}); // keep the last known status
    load();
    const id = setInterval(load, POLL);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);
  return status;
};

/**
 * A live machine's wire carries packets and its port LED blinks with them. A
 * machine that is down fades, its port goes dark, its uptime turns into a dead
 * face, and now and then its characters turn into the cursor trail's.
 */
export const Homelab = ({ lab }: { lab: Lab }) => {
  const status = useStatus();
  const dead = useMemo(
    () =>
      new Set(lab.machines.filter((m) => statusOf(status, m)?.state === "down").map((m) => m.id)),
    [lab, status],
  );
  // the clock reads the dead machines through a ref, so it keeps running when they change
  const deadNow = useRef(dead);
  useEffect(() => {
    deadNow.current = dead;
  }, [dead]);
  const [{ t, glitching }, setFrame] = useState({ t: 0, glitching: new Set<number>() });
  useEffect(() => {
    if (reduced()) return;
    let step = 0;
    const schedule = new Map<number, { next: number; until: number }>();
    const id = setInterval(() => {
      step++;
      const now = new Set<number>();
      for (const machine of deadNow.current) {
        const g = schedule.get(machine) ?? { next: step + nextGlitch(), until: -1 };
        if (step >= g.next) {
          g.until = step + BURST;
          g.next = step + nextGlitch();
        }
        schedule.set(machine, g);
        if (step <= g.until) now.add(machine);
      }
      setFrame({ t: step, glitching: now });
    }, TICK);
    return () => clearInterval(id);
  }, []);

  // a dead machine's text, with some characters swapped while it glitches
  const glitched = (machine: number, text: string, r: number) =>
    !glitching.has(machine) || !dead.has(machine)
      ? text
      : [...text]
          .map((ch, c) =>
            ch !== " " && hash(t, r, c) < 0.45
              ? CHARS[Math.floor(hash(c, t, r) * CHARS.length)]
              : ch,
          )
          .join("");

  const { order, cols, grid, portsRow, paths, nameCol, turns } = layout(lab);
  const lines = grid.map((r) => [...r].map((ch) => ch ?? " "));
  const busy = new Set<number>();
  const down = new Set<number>();
  paths.forEach((path, i) => {
    const s = statusOf(status, order[i]);
    const [r] = path[path.length - 1];
    if (s?.state === "down") down.add(cols[i]);
    else {
      const at = packet(i, path.length, t);
      if (at !== null) {
        const [ar, ac] = path[at];
        lines[ar][ac] = "■";
        busy.add(cols[i]);
      }
    }
    while (lines[r].length < nameCol) lines[r].push(" ");
    lines[r].splice(nameCol, Infinity, ...`${order[i].name.padEnd(NAME)}${strip(s)} ${percent(s)}`);
  });
  // each port's LED: green at 1 Gb/s, amber at 10/100, blinking with traffic, dark with no link
  const leds = Array.from({ length: lab.ports }, (_, p) => {
    const c = p + 1;
    const m = order[cols.indexOf(c)];
    if (!m || down.has(c) || (busy.has(c) && t % 2)) return "text-surface1";
    return m.speed === 1000 ? "text-green" : "text-peach";
  });
  lines[portsRow] = [" ", ...leds.map(() => "▪"), " "]; // the panel is a cell wider on each side
  const widest = Math.max(...lines.map((l) => l.length));

  return (
    // the widest line sets the size: never larger than body text, smaller when the card is narrow
    <div className="@container">
      <pre
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-label={`${lab.name} switch: ${order
          .map((m) => `${m.name} on port ${m.port}, ${describe(statusOf(status, m))} (${m.spec})`)
          .join("; ")}`}
        className="font-text text-crust m-0 leading-snug whitespace-pre"
        style={{ fontSize: `min(var(--text-body), ${100 / (widest * 0.6)}cqw)` }}
      >
        {lines.map((line, r) => {
          if (r === portsRow)
            return (
              <span key={r}>
                <span className="bg-crust">
                  {" "}
                  {leds.map((led, c) => (
                    <span key={c} className={led}>
                      ▪
                    </span>
                  ))}{" "}
                </span>
                {"\n"}
              </span>
            );
          // a machine's own text: dimmed when it is down, glitching now and then
          const i = turns.indexOf(r) >= 0 ? turns.indexOf(r) : turns.indexOf(r - 1);
          if (i < 0) return line.join("") + "\n";
          const m = order[i];
          const isSpec = turns[i] !== r;
          const own = line.slice(nameCol).join("");
          return (
            <span key={r} title={isSpec ? undefined : describe(statusOf(status, m))}>
              {line.slice(0, nameCol).join("")}
              <span className={dead.has(m.id) ? "opacity-35" : isSpec ? "opacity-65" : undefined}>
                {glitched(m.id, own, r)}
              </span>
              {"\n"}
            </span>
          );
        })}
      </pre>
    </div>
  );
};
