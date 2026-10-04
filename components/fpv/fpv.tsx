"use client";

import { useEffect, useRef, useState } from "react";

import { artAdvance, useBox, useFonts } from "@/lib/type";

import { instruct, Quad, type Sticks } from "./flight";
import { camera, HUD_ROWS, osd, render, video } from "./view";
import { GAPS, LINE, PILOT, walls, type V3 } from "./world";

/*
 * FPV freestyle in the bando, drawn in text (view.ts), in the card. The quad
 * flies the demo line by itself; click and the sticks are yours, Escape
 * hands them back. The visitor flies acro, as FPV Kamikaze Drone and Delta
 * Force map it to a keyboard and mouse: the mouse is the right stick (pitch
 * and roll), A and D yaw. The throttle is W: it rises while W is held and
 * falls back when it is let go, so hovering is a matter of feathering it.
 */

const FONT = 8; // px, a cell of the view
const SENS = 0.2; // deg the quad turns per pixel of mouse
const YAW = 4; // rad/s at full A or D
const HOVER = 0.35; // W gets the throttle to about a hover almost at once,
const QUICK = 3.5; // this fast (per second),
const RISE = 1.4; // then keeps pushing it up this fast while held
const FALL = 1.6; // throttle per second once it is let go
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export const Fpv = () => {
  const ready = useFonts();
  const [box, { w, h }] = useBox<HTMLButtonElement>();
  const feed = useRef<HTMLPreElement>(null);
  const hud = useRef<HTMLPreElement>(null);
  const [flying, setFlying] = useState(false);

  const cw = FONT * artAdvance(ready);
  const cols = w ? Math.floor(w / cw) : 0;
  const rows = h ? Math.floor(h / FONT) : 0;
  const hudSize = h / HUD_ROWS;
  const hudCols = w ? Math.floor(w / (hudSize * artAdvance(ready))) : 0;

  useEffect(() => {
    const el = box.current;
    if (!el || !cols || !rows) return;
    const quad = new Quad();
    quad.reset();
    const keys = new Set<string>();
    const mouse = { dx: 0, dy: 0 };
    let yaw = 0; // the A and D stick, eased
    let throttle = 0;
    let live = false; // the sticks are the visitor's
    let next = 0; // the demo's next point on its line
    let crashed = -1;
    let bumped = 0;
    let letGo = 0;
    let message = { text: "", until: 0 };
    const found = new Set<number>();
    const passed = new Map<number, number>();
    let raf = 0;
    let last = performance.now();

    const say = (text: string, ms = 1600) => (message = { text, until: performance.now() + ms });
    const reset = () => {
      quad.reset();
      throttle = 0;
    };
    const engage = (on: boolean) => {
      if (on === live) return;
      live = on;
      setFlying(on);
      keys.clear();
      if (on) {
        // the visitor starts where pilots do: on the pad, throttle down
        reset();
        say("HOVER AT 30% THR", 3000);
        if (!raf) raf = requestAnimationFrame(draw); // with reduced motion the demo stands still until now
      } else {
        letGo = performance.now();
        // the demo picks its line back up at the nearest point
        const far = (p: V3) => Math.hypot(...p.map((x, k) => x - quad.p[k]));
        next = LINE.reduce((b, p, i) => (far(p) < far(LINE[b]) ? i : b), 0);
      }
    };

    const onLock = () => engage(document.pointerLockElement === el);
    // the click hands the sticks over at once; locking the pointer, where the browser allows it, keeps the mouse in
    const onClick = () => {
      if (live) return;
      engage(true);
      try {
        (el.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => {});
      } catch {
        // no pointer lock here: fly on the mouse as it moves over the page
      }
    };
    const onMove = (e: MouseEvent) => {
      if (!live) return;
      mouse.dx += e.movementX;
      mouse.dy += e.movementY;
    };
    const onKey = (e: KeyboardEvent) => {
      // Escape lets go of the sticks, and only that: the card stays open
      if (e.code === "Escape" && (live || performance.now() - letGo < 500)) {
        e.stopImmediatePropagation();
        if (live && !document.pointerLockElement) engage(false);
        return;
      }
      if (!live || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type === "keyup") return void keys.delete(e.code);
      keys.add(e.code);
      if (e.code === "KeyR") reset();
    };
    el.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onLock);
    document.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);

    /**
     * The visitor's sticks. The mouse is a stick that is only off centre while
     * it moves: what it travels, the quad turns, and a still mouse holds the
     * attitude. Mouse forward is stick forward, nose down.
     */
    const sticks = (dt: number): Sticks => {
      const key = (...codes: string[]) => (codes.some((c) => keys.has(c)) ? 1 : 0);
      const rate = (SENS * Math.PI) / 180 / Math.max(dt, 1 / 240);
      const cap = (x: number) => Math.max(-35, Math.min(35, x * rate));
      const [pitch, roll] = [cap(-mouse.dy), cap(mouse.dx)];
      mouse.dx = mouse.dy = 0;
      yaw += (key("KeyD") - key("KeyA") - yaw) * (1 - Math.exp(-dt / 0.07));
      throttle = Math.min(
        1,
        Math.max(0, throttle + (key("KeyW") ? (throttle < HOVER ? QUICK : RISE) : -FALL) * dt),
      );
      return { pitch, roll, yaw: yaw * YAW, throttle };
    };

    /** The demo's sticks: an instructor that flies the same quad towards the next point on the line. */
    const autopilot = (): Sticks => {
      const to = LINE[next].map((x, k) => x - quad.p[k]) as V3;
      if (Math.hypot(...to) < 2.5) next = (next + 1) % LINE.length;
      const aim = {
        yaw: Math.atan2(-to[0], -to[2]),
        pitch: Math.atan2(to[1], Math.hypot(to[0], to[2])),
      };
      return instruct(quad, aim, 10);
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (crashed >= 0 && now - crashed > 1100) {
        crashed = -1;
        reset();
        next = 0;
      }
      if (crashed < 0)
        for (const e of quad.step(dt, live ? sticks(dt) : autopilot())) {
          if (e.kind === "crash") crashed = now;
          if (e.kind === "bump") bumped = now;
          if (e.kind === "gap" && live && now > (passed.get(e.index) ?? 0)) {
            passed.set(e.index, now + 2500);
            found.add(e.index);
            say(`${GAPS[e.index].name} ${found.size}/${GAPS.length}`);
          }
        }

      const cam = camera(quad);

      // the video link, from the pilot's head: distance, and whatever is in the way
      const dist = Math.hypot(...quad.p.map((x, k) => x - PILOT[k]));
      const rssi = -30 - 20 * Math.log10(Math.max(dist, 1)) - 7 * walls(PILOT, quad.p);
      let quality = Math.min(1, Math.max(0, (rssi + 95) / 18));
      if (crashed >= 0) quality = 0;
      if (now - bumped < 90) quality *= 0.4;

      if (feed.current) feed.current.innerHTML = video(render(cam, cols, rows), cols, quality);
      if (hud.current) {
        const text = osd(hudCols, {
          volts: `${quad.volts.toFixed(1)}V`,
          time: `${Math.floor(quad.air / 60)}:${String(Math.floor(quad.air % 60)).padStart(2, "0")}`,
          mode: live ? "ACRO" : "AUTO",
          thr: live ? `THR ${Math.round(throttle * 100)}` : "",
          gaps: live ? `GAPS ${found.size}/${GAPS.length}` : "",
          message: now < message.until ? message.text : undefined,
          warning:
            crashed >= 0
              ? "CRASH"
              : Math.floor(now / 400) % 2
                ? undefined
                : !live
                  ? "CLICK TO FLY"
                  : quad.grounded && throttle < 0.25
                    ? "HOLD W TO TAKE OFF"
                    : undefined,
          rssi: `${Math.round(rssi)}DBM`,
          speed: `${Math.round(Math.hypot(...quad.v) * 3.6)}KM/H`,
        });
        // the OSD rides the same signal: characters drop out as it fades
        const drop = (1 - quality) ** 2 * 0.7;
        hud.current.textContent = [...text]
          .map((ch) => (ch.trim() && Math.random() < drop ? "▒" : ch))
          .join("");
      }
      raf = live || !reduced() ? requestAnimationFrame(draw) : 0;
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      if (document.pointerLockElement === el) document.exitPointerLock();
      el.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", onLock);
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
    };
  }, [box, cols, rows, hudCols]);

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <button
        ref={box}
        type="button"
        aria-label="An FPV drone game drawn in text: click to take the sticks, Escape to let go"
        className={`bg-crust tall:h-[240px] relative block h-[200px] w-full overflow-hidden border-0 p-0 text-left ${flying ? "cursor-none" : "cursor-pointer"}`}
      >
        <pre
          ref={feed}
          aria-hidden
          // the frame is rewritten many times a second: a click on its text would lose its target between
          // press and release, so the click goes to the card instead
          className="font-text pointer-events-none absolute inset-0 m-0 leading-none whitespace-pre"
          style={{
            fontSize: FONT,
            padding: `${(h - rows * FONT) / 2}px ${(w - cols * cw) / 2}px`,
          }}
        />
        {/* the OSD: white with a dark outline, as the MAX7456 chip on a quad draws it */}
        <pre
          ref={hud}
          aria-hidden
          className="font-text pointer-events-none absolute inset-0 m-0 leading-none whitespace-pre"
          style={{
            fontSize: hudSize,
            color: "#FFFFFF",
            textShadow: "0 0 2px #11111b, 1px 1px 0 #11111b, -1px -1px 0 #11111b",
          }}
        />
      </button>
      <p className="font-text text-meta text-crust m-0 flex flex-wrap justify-between gap-x-3 whitespace-nowrap">
        <span>{flying ? "W throttle · A D yaw · R pad" : "acro · mouse + W A D"}</span>
        <span className="opacity-60">{flying ? "esc lets go" : "click to fly"}</span>
      </p>
    </div>
  );
};
