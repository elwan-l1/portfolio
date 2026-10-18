/*
 * The sound of the synth. Five modules, each a Web Audio graph with named
 * jacks. A cable between two jacks is a real connect and disconnect, except
 * the polyphonic ones (LOOPS PIT and GATE, VCO VOX): those are read each time
 * LOOPS plays a note, because each note is its own voice.
 *
 * The default patch was tuned against eurorack ambient recordings: a drone on
 * Db2 whose partials carry most of the energy below 1 kHz, the seven sung
 * loops of Eno's Music for Airports 2/1 above it, slow irregular movement,
 * and a thin layer of noise for air.
 */

const ROOT = 69.3; // Hz, Db2

// Music for Airports 2/1, as Teropa rebuilt it: note Hz, loop period s, first entry s
const LOOPS = [
  [349.23, 19.7, 4.0],
  [415.3, 17.8, 8.1],
  [523.25, 21.3, 5.6],
  [554.37, 22.1, 12.6],
  [622.25, 18.4, 9.2],
  [698.46, 20.0, 14.1],
  [830.61, 17.7, 3.1],
] as const;

// Eno's own sung loops, never in step with each other
const PERIODS = [23.5, 25.875, 29.9375];
const PHASES = [0, 1.3, 2.1];
const RANDOM_STEP = 9.7; // s between the random out's levels
const RANDOM_LEVELS = 10;

export type Signal = "cv" | "pitch" | "gate" | "audio";

export const PORTS = {
  "lfo.1": { dir: "out", signal: "cv" },
  "lfo.2": { dir: "out", signal: "cv" },
  "lfo.3": { dir: "out", signal: "cv" },
  "lfo.rnd": { dir: "out", signal: "cv" },
  "loops.pit": { dir: "out", signal: "pitch" },
  "loops.gate": { dir: "out", signal: "gate" },
  "vco.pit": { dir: "in", signal: "pitch" },
  "vco.cut": { dir: "in", signal: "cv" },
  "vco.wid": { dir: "in", signal: "cv" },
  "vco.drn": { dir: "out", signal: "audio" },
  "vco.vox": { dir: "out", signal: "audio" },
  "vco.nse": { dir: "out", signal: "audio" },
  "lpg.in": { dir: "in", signal: "audio" },
  "lpg.gate": { dir: "in", signal: "gate" },
  "lpg.out": { dir: "out", signal: "audio" },
  "space.in1": { dir: "in", signal: "audio" },
  "space.in2": { dir: "in", signal: "audio" },
  "space.in3": { dir: "in", signal: "audio" },
  "space.time": { dir: "in", signal: "cv" },
} as const satisfies Record<string, { dir: "in" | "out"; signal: Signal }>;

export type Port = keyof typeof PORTS;
export type Cable = { from: Port; to: Port };

export const DEFAULT_CABLES: Cable[] = [
  { from: "lfo.rnd", to: "vco.cut" },
  { from: "lfo.2", to: "vco.wid" },
  { from: "lfo.3", to: "space.time" },
  { from: "loops.pit", to: "vco.pit" },
  { from: "loops.gate", to: "lpg.gate" },
  { from: "vco.vox", to: "lpg.in" },
  { from: "vco.drn", to: "space.in1" },
  { from: "lpg.out", to: "space.in2" },
  { from: "vco.nse", to: "space.in3" },
];

type Range = { label: string; min: number; max: number; log?: boolean; value: number };

export const KNOBS = {
  "lfo.rate": { label: "RATE", min: 0.25, max: 4, log: true, value: 1 },
  "lfo.depth": { label: "DEPTH", min: 0, max: 1, value: 1 },
  "loops.spread": { label: "SPRD", min: 0.5, max: 2, log: true, value: 1 },
  "loops.hold": { label: "HOLD", min: 0.5, max: 8, log: true, value: 3.5 },
  "vco.cut": { label: "CUT", min: 150, max: 4000, log: true, value: 1100 },
  "vco.res": { label: "RES", min: 0.5, max: 14, log: true, value: 4 },
  "vco.wid": { label: "WIDTH", min: 0, max: 30, value: 7 },
  "vco.wave": { label: "WAVE", min: 0, max: 1, value: 0.7 },
  "vco.sub": { label: "SUB", min: 0, max: 0.5, value: 0.1 },
  "vco.nse": { label: "NOISE", min: 0, max: 0.12, value: 0.035 },
  "lpg.rise": { label: "RISE", min: 0.02, max: 6, log: true, value: 1.6 },
  "lpg.fall": { label: "FALL", min: 0.3, max: 16, log: true, value: 6.5 },
  "lpg.open": { label: "OPEN", min: 300, max: 10000, log: true, value: 6500 },
  "lpg.level": { label: "LEVEL", min: 0, max: 0.4, value: 0.09 },
  "space.time": { label: "TIME", min: 0.08, max: 2, log: true, value: 0.79 },
  "space.fdbk": { label: "FDBK", min: 0, max: 0.85, value: 0.42 },
  "space.size": { label: "SIZE", min: 1, max: 15, log: true, value: 9 },
  "space.mix": { label: "MIX", min: 0, max: 1, value: 0.55 },
} as const satisfies Record<string, Range>;

export type Knob = keyof typeof KNOBS;
export type Values = Record<Knob, number>;

export const defaults = () =>
  Object.fromEntries(Object.entries(KNOBS).map(([id, k]) => [id, k.value])) as Values;

/** A knob's value at `pos` (0 to 1 of its turn). */
export const fromPos = (k: Range, pos: number) =>
  k.log ? k.min * (k.max / k.min) ** pos : k.min + (k.max - k.min) * pos;

/** How far round a knob is (0 to 1) at value `x`. */
export const toPos = (k: Range, x: number) =>
  k.log ? Math.log(x / k.min) / Math.log(k.max / k.min) : (x - k.min) / (k.max - k.min);

export type Lights = {
  /** The four LFO outs, -1 to 1. */
  lfo: number[];
  /** Each loop's note, 1 as it starts, fading to 0 by the end of its hold. */
  loops: number[];
  /** Output level, RMS. */
  level: number;
};

export const DARK: Lights = { lfo: [0, 0, 0, 0], loops: LOOPS.map(() => 0), level: 0 };

const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A stereo reverb tail: noise decaying 60 dB over `seconds`, its highs dying faster than its lows. */
const tail = (ctx: BaseAudioContext, seconds: number, rand: () => number) => {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buffer.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / ctx.sampleRate;
      lp += (0.9 * Math.exp(-t / (seconds * 0.35)) + 0.04) * (rand() * 2 - 1 - lp);
      d[i] = lp * Math.exp((-6.9 * t) / seconds) * Math.min(1, t / 0.02);
    }
  }
  return buffer;
};

/** Pink noise (Paul Kellet's filter), stereo. */
const pink = (ctx: BaseAudioContext, seconds: number, rand: () => number) => {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buffer.getChannelData(c);
    let [b0, b1, b2] = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const w = rand() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
  }
  return buffer;
};

/** The random out at time `t`: glides between `levels` with a cosine, looping. */
const randomAt = (levels: number[], t: number) => {
  const x = t / RANDOM_STEP;
  const k = Math.floor(x);
  const f = (1 - Math.cos(Math.PI * (x - k))) / 2;
  return levels[k % levels.length] * (1 - f) + levels[(k + 1) % levels.length] * f;
};

export type Engine = ReturnType<typeof createEngine>;

/**
 * Builds the synth on `ctx` with knobs at `values`, silent until `fadeIn`.
 * Nothing is patched: connect the cables, then call `schedule` every so
 * often to play the loops due before a given time.
 */
export const createEngine = (ctx: AudioContext, values: Values) => {
  const rand = mulberry(7);
  const t0 = ctx.currentTime + 0.05;
  const glide = (param: AudioParam, x: number, time = 0.05) =>
    param.setTargetAtTime(x, ctx.currentTime, time);
  // jacks backed by a node; the polyphonic ones have none
  const ins: Partial<Record<Port, AudioNode>> = {};
  const outs: Partial<Record<Port, AudioNode>> = {};
  const patched = new Map<Port, Port>(); // input -> output
  const from = (input: Port) => patched.get(input);
  const into = (output: Port) => [...patched].find(([, o]) => o === output)?.[0];

  // ---- LFO: three slow sines at Eno's periods, and a smooth random level ----
  const sines = PERIODS.map((period, i) => {
    const osc = new OscillatorNode(ctx, { frequency: values["lfo.rate"] / period });
    const phase = PHASES[i];
    osc.setPeriodicWave(
      ctx.createPeriodicWave(
        new Float32Array([0, Math.sin(phase)]),
        new Float32Array([0, Math.cos(phase)]),
      ),
    );
    osc.start(t0);
    return osc;
  });
  const levels = Array.from({ length: RANDOM_LEVELS }, () => rand() * 2 - 1);
  const RATE = 3000; // the lowest rate a buffer may have; this signal moves over seconds
  const steps = ctx.createBuffer(1, RATE * RANDOM_STEP * RANDOM_LEVELS, RATE);
  const step = steps.getChannelData(0);
  for (let i = 0; i < step.length; i++) step[i] = randomAt(levels, i / RATE);
  const random = new AudioBufferSourceNode(ctx, {
    buffer: steps,
    loop: true,
    playbackRate: values["lfo.rate"],
  });
  random.start(t0);
  const lfoOuts = [...sines, random].map((source, i) => {
    const out = new GainNode(ctx, { gain: values["lfo.depth"] });
    source.connect(out);
    outs[(["lfo.1", "lfo.2", "lfo.3", "lfo.rnd"] as const)[i]] = out;
    return out;
  });

  // ---- SPACE: three inputs into a filtered stereo echo and a long reverb ----
  const master = new GainNode(ctx, { gain: 0 });
  const limiter = new DynamicsCompressorNode(ctx, {
    threshold: -6,
    knee: 6,
    ratio: 12,
    attack: 0.01,
    release: 0.5,
  });
  const meter = new AnalyserNode(ctx, { fftSize: 1024 });
  master.connect(limiter).connect(meter).connect(ctx.destination);
  const sum = new GainNode(ctx);
  for (const port of ["space.in1", "space.in2", "space.in3"] as const) {
    const input = new GainNode(ctx);
    input.connect(sum);
    ins[port] = input;
  }
  const dry = new GainNode(ctx, { gain: 1 - values["space.mix"] * 0.5 });
  sum.connect(dry).connect(master);

  const time = values["space.time"];
  const echoL = new DelayNode(ctx, { maxDelayTime: 3, delayTime: time });
  const echoR = new DelayNode(ctx, { maxDelayTime: 3, delayTime: time * 1.43 });
  const wow = new GainNode(ctx, { gain: 0.004 }); // s of delay per unit of CV: tape wow
  wow.connect(echoL.delayTime);
  wow.connect(echoR.delayTime);
  ins["space.time"] = wow;
  // the repeats lose their lows and highs as they go round, like tape
  const tone = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 2200, Q: 0.5 });
  const feedback = new GainNode(ctx, { gain: values["space.fdbk"] });
  sum
    .connect(new BiquadFilterNode(ctx, { type: "highpass", frequency: 120, Q: 0.5 }))
    .connect(tone);
  tone.connect(echoL).connect(feedback);
  tone.connect(echoR).connect(feedback).connect(tone);
  const sides = new ChannelMergerNode(ctx, { numberOfInputs: 2 });
  echoL.connect(sides, 0, 0);
  echoR.connect(sides, 0, 1);
  const echo = new GainNode(ctx, { gain: 0.5 });
  sides.connect(echo).connect(master);

  const reverb = new ConvolverNode(ctx, { buffer: tail(ctx, values["space.size"], rand) });
  const lowCut = new BiquadFilterNode(ctx, { type: "highpass", frequency: 180, Q: 0.5 });
  const wet = new GainNode(ctx, { gain: values["space.mix"] });
  sum.connect(lowCut);
  echo.connect(lowCut);
  lowCut
    .connect(new DelayNode(ctx, { delayTime: 0.03 }))
    .connect(reverb)
    .connect(wet)
    .connect(master);

  // ---- VCO: the drone (two detuned saws and a sub through a resonant 24 dB lowpass), noise, and the loop voices ----
  const cut = values["vco.cut"];
  const filters = [
    new BiquadFilterNode(ctx, { type: "lowpass", frequency: cut, Q: 0.7 }),
    new BiquadFilterNode(ctx, { type: "lowpass", frequency: cut, Q: values["vco.res"] }),
  ];
  const sweep = new GainNode(ctx, { gain: cut * 0.5 }); // Hz of cutoff per unit of CV
  for (const f of filters) sweep.connect(f.frequency);
  ins["vco.cut"] = sweep;
  const drift = new GainNode(ctx); // pulls the saws apart and together
  ins["vco.wid"] = drift;
  const saws = [-1, 1].map((side) => {
    const saw = new OscillatorNode(ctx, {
      type: "sawtooth",
      frequency: ROOT,
      detune: (side * values["vco.wid"]) / 2,
    });
    drift.connect(new GainNode(ctx, { gain: side * 4 })).connect(saw.detune);
    saw
      .connect(new GainNode(ctx, { gain: 0.5 }))
      .connect(new StereoPannerNode(ctx, { pan: side * 0.35 }))
      .connect(filters[0]);
    saw.start(t0);
    return saw;
  });
  const sub = new OscillatorNode(ctx, { frequency: ROOT / 2 });
  const subLevel = new GainNode(ctx, { gain: values["vco.sub"] });
  sub.connect(subLevel).connect(filters[0]);
  sub.start(t0);
  const warmth = new WaveShaperNode(ctx, {
    curve: Float32Array.from(
      { length: 1025 },
      (_, i) => Math.tanh(1.5 * (i / 512 - 1)) / Math.tanh(1.5),
    ),
    oversample: "2x",
  });
  const drone = new GainNode(ctx, { gain: 0 });
  drone.gain.setValueAtTime(0, t0);
  drone.gain.linearRampToValueAtTime(0.75, t0 + 6);
  filters[0].connect(filters[1]).connect(warmth).connect(drone);
  outs["vco.drn"] = drone;

  const noise = new AudioBufferSourceNode(ctx, { buffer: pink(ctx, 7.3, rand), loop: true });
  const air = new GainNode(ctx, { gain: values["vco.nse"] });
  noise
    .connect(new BiquadFilterNode(ctx, { type: "highpass", frequency: 1800, Q: 0.5 }))
    .connect(new BiquadFilterNode(ctx, { type: "lowpass", frequency: 9000, Q: 0.5 }))
    .connect(air);
  noise.start(t0);
  outs["vco.nse"] = air;

  // the voices: a sine with WAVE's share of saw harmonics on top
  const shape = () =>
    ctx.createPeriodicWave(
      new Float32Array(17),
      Float32Array.from({ length: 17 }, (_, k) =>
        k === 0 ? 0 : k === 1 ? 1 : values["vco.wave"] / k,
      ),
    );
  let wave = shape();

  // ---- LPG: a level and a lowpass that follow one vactrol-like envelope, so notes darken as they fade ----
  const gateOut = new GainNode(ctx, { gain: values["lpg.level"] });
  outs["lpg.out"] = gateOut;
  // anything patched into IN (not the voices) goes through one shared gate
  const shared = {
    lp: new BiquadFilterNode(ctx, { type: "lowpass", frequency: 120, Q: 0.4 }),
    vca: new GainNode(ctx, { gain: 0 }),
  };
  const gateIn = new GainNode(ctx);
  gateIn.connect(shared.lp).connect(shared.vca).connect(gateOut);
  ins["lpg.in"] = gateIn;
  const strike = (gate: typeof shared, t: number, level: number, hold: number) => {
    const rise = values["lpg.rise"] / 3;
    const fall = values["lpg.fall"] / 4;
    gate.vca.gain.setTargetAtTime(level, t, rise);
    gate.vca.gain.setTargetAtTime(0, t + hold, fall);
    gate.lp.frequency.setTargetAtTime(Math.max(120, values["lpg.open"] * level), t, rise);
    gate.lp.frequency.setTargetAtTime(120, t + hold, fall);
  };

  // ---- LOOPS: each note on its own period ----
  const next = LOOPS.map(([, , entry]) => t0 + entry * values["loops.spread"]);
  const played = LOOPS.map(() => -Infinity);

  const play = (k: number, t: number) => {
    const hold = values["loops.hold"];
    const level = 0.75 + 0.25 * rand();
    const pan = (rand() - 0.5) * 1.2;
    const detune = (rand() - 0.5) * 6;
    played[k] = t;
    const gated = from("lpg.gate") === "loops.gate";
    if (gated) strike(shared, t, 1, hold);
    const to = into("vco.vox");
    const input = to && ins[to];
    if (from("vco.pit") !== "loops.pit" || !input) return;
    if (to === "lpg.in" && !gated) return; // a gate that never opens

    const osc = new OscillatorNode(ctx, { frequency: LOOPS[k][0], detune });
    osc.setPeriodicWave(wave);
    osc.start(t);
    const panner = new StereoPannerNode(ctx, { pan });
    if (to === "lpg.in") {
      const voice = {
        lp: new BiquadFilterNode(ctx, { type: "lowpass", frequency: 120, Q: 0.4 }),
        vca: new GainNode(ctx, { gain: 0 }),
      };
      strike(voice, t, level, hold);
      osc.connect(voice.lp).connect(voice.vca).connect(panner).connect(gateOut);
      osc.stop(t + hold + values["lpg.fall"] * 1.6);
    } else {
      // straight into SPACE: no gate to shape it, so a plain organ-like note
      const vca = new GainNode(ctx, { gain: 0 });
      vca.gain.setTargetAtTime(level * 0.12, t, 0.02);
      vca.gain.setTargetAtTime(0, t + hold, 0.3);
      osc.connect(vca).connect(panner).connect(input);
      osc.stop(t + hold + 2);
    }
  };

  const levelData = new Float32Array(meter.fftSize);
  let reverbTimer = 0;

  const apply: Partial<Record<Knob, (x: number) => void>> = {
    "lfo.rate": (x) => {
      sines.forEach((osc, i) => glide(osc.frequency, x / PERIODS[i]));
      glide(random.playbackRate, x);
    },
    "lfo.depth": (x) => lfoOuts.forEach((out) => glide(out.gain, x)),
    "vco.cut": (x) => {
      for (const f of filters) glide(f.frequency, x);
      glide(sweep.gain, x * 0.5);
    },
    "vco.res": (x) => glide(filters[1].Q, x),
    "vco.wid": (x) => saws.forEach((saw, i) => glide(saw.detune, ((i ? 1 : -1) * x) / 2)),
    "vco.wave": () => (wave = shape()),
    "vco.sub": (x) => glide(subLevel.gain, x),
    "vco.nse": (x) => glide(air.gain, x),
    "lpg.level": (x) => glide(gateOut.gain, x),
    "space.time": (x) => {
      glide(echoL.delayTime, x, 0.3);
      glide(echoR.delayTime, x * 1.43, 0.3);
    },
    "space.fdbk": (x) => glide(feedback.gain, x),
    "space.mix": (x) => {
      glide(wet.gain, x);
      glide(dry.gain, 1 - x * 0.5);
    },
    // a new tail takes a moment to compute: wait until the knob settles
    "space.size": (x) => {
      clearTimeout(reverbTimer);
      reverbTimer = window.setTimeout(() => (reverb.buffer = tail(ctx, x, rand)), 250);
    },
  };

  return {
    connect: ({ from, to }: Cable) => {
      patched.set(to, from);
      if (ins[to]) outs[from]?.connect(ins[to]);
    },
    disconnect: ({ from, to }: Cable) => {
      patched.delete(to);
      if (ins[to]) outs[from]?.disconnect(ins[to]);
    },
    /** Sets knob `id` to `x` (values the engine was built with change too). */
    turn: (id: Knob, x: number) => {
      values[id] = x;
      apply[id]?.(x);
    },
    /** Plays every loop note due before `until` (context time). */
    schedule: (until: number) =>
      LOOPS.forEach(([, period], k) => {
        while (next[k] < until) {
          play(k, next[k]);
          next[k] += period * values["loops.spread"];
        }
      }),
    lights: (): Lights => {
      const now = ctx.currentTime;
      const t = (now - t0) * values["lfo.rate"];
      const depth = values["lfo.depth"];
      meter.getFloatTimeDomainData(levelData);
      let energy = 0;
      for (const s of levelData) energy += s * s;
      return {
        lfo: [
          ...PERIODS.map((p, i) => depth * Math.sin((2 * Math.PI * t) / p + PHASES[i])),
          depth * randomAt(levels, t),
        ],
        // a note scheduled ahead is not lit yet
        loops: played.map((at) =>
          at > now ? 0 : Math.max(0, 1 - (now - at) / values["loops.hold"]),
        ),
        level: Math.sqrt(energy / levelData.length),
      };
    },
    fadeIn: () => master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.8),
    fadeOut: () => master.gain.setTargetAtTime(0, ctx.currentTime, 0.4),
  };
};
