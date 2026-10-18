import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

import { artAdvance, useBox, useFitted, useFonts } from "@/lib/type";

import {
  createEngine,
  DARK,
  DEFAULT_CABLES,
  defaults,
  fromPos,
  KNOBS,
  PORTS,
  toPos,
  type Engine,
  type Knob,
} from "./engine";
import { COLS, compose, fits, hit, html, ROWS, type RackState } from "./rack";

/*
 * A small modular synth in the card, drawn in text (rack.ts) and played by
 * Web Audio (engine.ts). It comes patched; POWER starts it. Drag a jack to
 * move or pull its cable, drag from a free jack to patch a new one, drag a
 * knob up or down to turn it, double click a knob to set it back.
 */

const AHEAD = 0.6; // s of loop notes scheduled in advance
const TICK = 200; // ms between scheduling passes
const FRAME = 66; // ms between redraws while it plays: about 15 a second is plenty for text
const TURN = 160; // px of drag for a knob's full turn
const FADE = 1500; // ms for the sound to die away before the context closes

type Sound = { ctx: AudioContext; engine: Engine; timer: number; frame: number };

export const Synth = () => {
  const ready = useFonts();
  const fitted = useFitted();
  const [box, { w, h }] = useBox<HTMLDivElement>();
  const screen = useRef<HTMLPreElement>(null);
  const rack = useRef<RackState>({
    values: defaults(),
    cables: [...DEFAULT_CABLES],
    held: null,
    turning: null,
    power: false,
    lights: DARK,
  });
  const sound = useRef<Sound>(null);
  const knob = useRef<{ id: Knob; y: number; pos: number }>(null);
  const [on, setOn] = useState(false);

  const advance = artAdvance(ready);
  // as big as fits, in whole device pixels, or hairlines show between the rows
  const fit = Math.min(w / (COLS * advance), fitted ? h / ROWS : Infinity);
  const size = w ? Math.floor(fit * devicePixelRatio) / devicePixelRatio : 0;

  const draw = () => {
    if (screen.current) screen.current.innerHTML = html(compose(rack.current));
  };

  const powerOff = () => {
    const playing = sound.current;
    if (!playing) return;
    sound.current = null;
    clearInterval(playing.timer);
    clearTimeout(playing.frame);
    playing.engine.fadeOut();
    setTimeout(() => playing.ctx.close(), FADE);
    rack.current.power = false;
    rack.current.lights = DARK;
    setOn(false);
    draw();
  };

  const powerOn = () => {
    // created in the click, so the browser lets it play
    const ctx = new AudioContext();
    const engine = createEngine(ctx, rack.current.values);
    for (const cable of rack.current.cables) engine.connect(cable);
    engine.fadeIn();
    engine.schedule(ctx.currentTime + AHEAD);
    const playing: Sound = {
      ctx,
      engine,
      timer: window.setInterval(() => engine.schedule(ctx.currentTime + AHEAD), TICK),
      frame: 0,
    };
    sound.current = playing;
    rack.current.power = true;
    setOn(true);
    const glow = () => {
      if (sound.current !== playing) return;
      rack.current.lights = engine.lights();
      draw();
      playing.frame = window.setTimeout(() => requestAnimationFrame(glow), FRAME);
    };
    glow();
  };

  const power = () => (sound.current ? powerOff() : powerOn());

  // drawn once it is there, silent in a hidden tab, and gone with the panel
  useEffect(() => {
    draw();
    const onVisibility = () =>
      document.hidden ? sound.current?.ctx.suspend() : sound.current?.ctx.resume();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      powerOff();
    };
  }, []);

  /** The pointer's position in cells. */
  const cell = (e: MouseEvent<HTMLPreElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / (size * advance), (e.clientY - r.top) / size];
  };
  const under = (e: MouseEvent<HTMLPreElement>) => {
    const [x, y] = cell(e);
    return hit(Math.floor(x), Math.floor(y));
  };

  const turn = (id: Knob, x: number) => {
    if (sound.current) sound.current.engine.turn(id, x);
    else rack.current.values[id] = x;
  };

  const onPointerDown = (e: PointerEvent<HTMLPreElement>) => {
    const target = under(e);
    if (!target) return;
    if ("power" in target) return power();
    const state = rack.current;
    if ("knob" in target) {
      knob.current = {
        id: target.knob,
        y: e.clientY,
        pos: toPos(KNOBS[target.knob], state.values[target.knob]),
      };
      state.turning = target.knob;
    } else {
      // a plugged jack gives up its cable, which stays in its other jack; a free one starts a new cable
      const cable = state.cables.find((c) => c.from === target.port || c.to === target.port);
      if (cable) {
        sound.current?.engine.disconnect(cable);
        state.cables = state.cables.filter((c) => c !== cable);
      }
      const fixed = !cable ? target.port : cable.from === target.port ? cable.to : cable.from;
      state.held = { fixed, at: cell(e) };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    draw();
  };

  const onPointerMove = (e: PointerEvent<HTMLPreElement>) => {
    const state = rack.current;
    if (knob.current) {
      const { id, y, pos } = knob.current;
      turn(id, fromPos(KNOBS[id], Math.max(0, Math.min(1, pos + (y - e.clientY) / TURN))));
    } else if (state.held) state.held.at = cell(e);
    else {
      const target = under(e);
      e.currentTarget.style.cursor = !target ? "" : "knob" in target ? "ns-resize" : "pointer";
      return;
    }
    draw();
  };

  const onPointerUp = (e: PointerEvent<HTMLPreElement>) => {
    const state = rack.current;
    const held = state.held;
    knob.current = null;
    state.turning = null;
    state.held = null;
    const target = under(e);
    // dropped on a jack it fits, it goes in, pushing out whatever was there; anywhere else it is gone
    if (held && target && "port" in target && fits(held.fixed, target.port)) {
      const taken = state.cables.find((c) => c.from === target.port || c.to === target.port);
      if (taken) {
        sound.current?.engine.disconnect(taken);
        state.cables = state.cables.filter((c) => c !== taken);
      }
      const cable =
        PORTS[held.fixed].dir === "out"
          ? { from: held.fixed, to: target.port }
          : { from: target.port, to: held.fixed };
      state.cables.push(cable);
      sound.current?.engine.connect(cable);
    }
    draw();
  };

  const onDoubleClick = (e: MouseEvent<HTMLPreElement>) => {
    const target = under(e);
    if (!target || !("knob" in target)) return;
    turn(target.knob, KNOBS[target.knob].value);
    draw();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div ref={box} className="flex min-h-0 flex-1 items-center justify-center">
        <pre
          ref={screen}
          aria-hidden
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
          className="font-text m-0 touch-none leading-none whitespace-pre select-none"
          style={{ fontSize: size, visibility: size ? "visible" : "hidden" }}
        />
      </div>
      <p className="font-text text-meta text-crust m-0 flex flex-wrap justify-between gap-x-3 whitespace-nowrap">
        <span>{on ? "drag knobs and cables" : "click POWER to play"}</span>
        <span>{on ? "POWER stops" : "drag to patch"}</span>
      </p>
      <button type="button" aria-pressed={on} onClick={power} className="sr-only">
        Modular synth sound
      </button>
    </div>
  );
};
