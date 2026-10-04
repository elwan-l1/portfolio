import { contact, crossed, PAD, type V3 } from "./world";

/*
 * A 5-inch freestyle quad as Betaflight flies it in acro: the sticks ask for
 * rotation rates, never angles. Thrust pushes along the quad's own up, air
 * drags harder on its flat top than its nose, and a 6S pack sags under load.
 * The demo flies it through an instructor that works the same sticks.
 */

export type Quat = [w: number, x: number, y: number, z: number];

export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const unit = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const norm = (q: Quat): Quat => {
  const l = Math.hypot(...q);
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
};
const mul = (a: Quat, b: Quat): Quat => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];

export const rotate = ([w, x, y, z]: Quat, v: V3): V3 => {
  const c = cross([x, y, z], v);
  const cc = cross([x, y, z], c);
  return [
    v[0] + 2 * (w * c[0] + cc[0]),
    v[1] + 2 * (w * c[1] + cc[1]),
    v[2] + 2 * (w * c[2] + cc[2]),
  ];
};

/** The rotation whose columns are right, up and back. */
const basis = (r: V3, u: V3, b: V3): Quat => {
  const tr = r[0] + u[1] + b[2];
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    return norm([s / 4, (u[2] - b[1]) / s, (b[0] - r[2]) / s, (r[1] - u[0]) / s]);
  }
  if (r[0] > u[1] && r[0] > b[2]) {
    const s = Math.sqrt(1 + r[0] - u[1] - b[2]) * 2;
    return norm([(u[2] - b[1]) / s, s / 4, (u[0] + r[1]) / s, (b[0] + r[2]) / s]);
  }
  if (u[1] > b[2]) {
    const s = Math.sqrt(1 + u[1] - r[0] - b[2]) * 2;
    return norm([(b[0] - r[2]) / s, (u[0] + r[1]) / s, s / 4, (b[1] + u[2]) / s]);
  }
  const s = Math.sqrt(1 + b[2] - r[0] - u[1]) * 2;
  return norm([(r[1] - u[0]) / s, (b[0] + r[2]) / s, (b[1] + u[2]) / s, s / 4]);
};

// ---- the quad ---------------------------------------------------------------------

const G = 9.81;
const TWR = 9; // thrust to weight: a punchy freestyle build
const IDLE = 0.012; // air mode keeps the motors turning at zero throttle
const MOTOR = 0.028; // s for the motors to spool
const PID = 0.016; // s for the rate controller to catch up with the sticks
const DRAG: V3 = [0.03, 0.075, 0.022]; // per metre, along right, up and back
const RADIUS = 0.13; // m, centre to prop tips
const CRASH = 8; // m/s into a wall and the props are gone

/** Rates in rad/s about the quad's own axes (nose down, nose right, right side down), and throttle 0 to 1. */
export type Sticks = { pitch: number; yaw: number; roll: number; throttle: number };
export type Event = { kind: "crash" } | { kind: "bump" } | { kind: "gap"; index: number };

export class Quad {
  p: V3 = [...PAD];
  v: V3 = [0, 0, 0];
  q: Quat = [1, 0, 0, 0];
  w: V3 = [0, 0, 0]; // body rates about right, up, back
  motor = 0; // thrust as a share of the most there is
  used = 0; // mAh from a 1300 mAh pack
  volts = 25.2;
  air = 0; // s flown
  wash = 0; // how hard it sits in its own prop wash, 0 to 1
  grounded = true;

  reset() {
    Object.assign(this, {
      p: [PAD[0], RADIUS, PAD[2]],
      v: [0, 0, 0],
      q: [1, 0, 0, 0],
      w: [0, 0, 0],
    });
    Object.assign(this, { motor: 0, used: 0, volts: 25.2, air: 0, grounded: true });
  }

  axes(): [V3, V3, V3] {
    return [rotate(this.q, [1, 0, 0]), rotate(this.q, [0, 1, 0]), rotate(this.q, [0, 0, 1])];
  }

  /** What the air does to it, in m/s². */
  drag(axes = this.axes()): V3 {
    const speed = Math.hypot(...this.v);
    const out: V3 = [0, 0, 0];
    axes.forEach((axis, k) => {
      const along = dot(this.v, axis);
      for (let c = 0; c < 3; c++) out[c] -= DRAG[k] * speed * along * axis[c];
    });
    return out;
  }

  private get power() {
    return Math.min(1, (this.volts / 24) ** 1.6); // a tired pack pushes less
  }

  /** The throttle that gives `accel` m/s² of thrust: the motor curve, backwards. */
  throttleFor(accel: number) {
    const share = Math.min(1, Math.max(0, accel / (TWR * G * this.power)));
    return (-0.15 + Math.sqrt(0.0225 + 3.4 * share)) / 1.7;
  }

  /** Runs `dt` seconds on, in steps short enough never to skip through a wall. */
  step(dt: number, sticks: Sticks): Event[] {
    const n = Math.max(4, Math.ceil((dt * Math.hypot(...this.v)) / 0.06));
    const out: Event[] = [];
    for (let i = 0; i < n && !out.some((e) => e.kind === "crash"); i++)
      out.push(...this.tick(dt / n, sticks));
    return out;
  }

  private tick(dt: number, s: Sticks): Event[] {
    const [right, up, back] = this.axes();
    const out: Event[] = [];

    // motors: thrust ∝ throttle², current follows thrust, voltage sags under it
    const want = Math.max(IDLE, (0.85 * s.throttle ** 2 + 0.15 * s.throttle) * this.power);
    this.motor += (want - this.motor) * (1 - Math.exp(-dt / MOTOR));
    const amps = 1.2 + 118 * this.motor ** 1.25;
    this.used += (amps * dt) / 3.6;
    this.volts = 6 * (4.2 - 0.6 * Math.min(1, this.used / 1300)) - amps * 0.018;

    // rates: catch up with the sticks, and shake when falling through its own wash
    this.wash =
      Math.min(1, Math.max(0, (-dot(this.v, up) - 2.5) / 7)) * Math.min(1, this.motor * 5);
    const shake = () => this.wash * 9 * (Math.random() - 0.5);
    const target: V3 = [-s.pitch + shake(), -s.yaw + shake() / 2, -s.roll + shake()];
    for (let a = 0; a < 3; a++) this.w[a] += (target[a] - this.w[a]) * (1 - Math.exp(-dt / PID));
    const rate = Math.hypot(...this.w);
    if (rate > 1e-6 && (!this.grounded || this.motor > 0.06)) {
      const h = (rate * dt) / 2;
      const k = Math.sin(h) / rate;
      this.q = norm(mul(this.q, [Math.cos(h), this.w[0] * k, this.w[1] * k, this.w[2] * k]));
    }

    const thrust = this.motor * TWR * G;
    const drag = this.drag([right, up, back]);
    const from: V3 = [...this.p];
    for (let c = 0; c < 3; c++) {
      this.v[c] += (up[c] * thrust + drag[c] - (c === 1 ? G : 0)) * dt;
      this.p[c] += this.v[c] * dt;
    }
    this.air += dt;
    for (const index of crossed(from, this.p)) out.push({ kind: "gap", index });

    // the props are a ball: slow knocks bounce and scrape, fast ones end the flight
    this.grounded = false;
    for (let i = 0; i < 3; i++) {
      const c = contact(this.p, RADIUS);
      if (!c) break;
      for (let k = 0; k < 3; k++) this.p[k] += c.n[k] * c.depth;
      if (c.n[1] > 0.7) this.grounded = true;
      const vn = dot(this.v, c.n);
      if (vn >= 0) continue;
      if (-vn > CRASH) return [...out, { kind: "crash" }];
      if (-vn > 1.2) out.push({ kind: "bump" });
      const keep = Math.exp(-dt * (c.n[1] > 0.7 && this.motor < 0.12 ? 12 : 3));
      for (let k = 0; k < 3; k++)
        this.v[k] = (this.v[k] - (vn > -1 ? 1 : 1.35) * vn * c.n[k]) * keep;
      for (let k = 0; k < 3; k++) this.w[k] += Math.min(-vn, 6) * 2.5 * (Math.random() - 0.5);
    }
    return out;
  }
}

// ---- the instructor --------------------------------------------------------------

/** Where to go: a heading and an angle above the horizon, in radians. */
export type Aim = { yaw: number; pitch: number };

const GRIP = 2.2; // how hard it closes the gap to the speed asked for, per second
const PULL = 28; // m/s², the most it asks of the quad: about a 70° bank
const SNAP = 9; // how fast it turns to the attitude it wants, per second

/**
 * The sticks that fly the quad along `aim` at `speed` m/s, for the demo. It
 * flies the real quad, so it banks into turns, noses down to speed up and
 * overshoots if asked too much; it only does the stick work.
 */
export const instruct = (quad: Quad, aim: Aim, speed: number): Sticks => {
  const heading: V3 = [-Math.sin(aim.yaw), 0, -Math.cos(aim.yaw)];
  const want = [
    heading[0] * Math.cos(aim.pitch),
    Math.sin(aim.pitch),
    heading[2] * Math.cos(aim.pitch),
  ].map((x) => x * speed) as V3;
  if (quad.grounded) want[1] = Math.max(want[1], 2); // off the ground before anything else
  let acc = [0, 1, 2].map((k) => (want[k] - quad.v[k]) * GRIP) as V3;
  const hard = Math.hypot(...acc);
  if (hard > PULL) acc = acc.map((x) => (x * PULL) / hard) as V3;
  acc[1] = Math.max(acc[1], -0.8 * G); // it never flips over to push down: dives fall on gravity

  // thrust has to cover that, gravity and drag; the quad's up goes along it, its nose along the heading
  const drag = quad.drag();
  const thrust = [0, 1, 2].map((k) => acc[k] - drag[k] + (k === 1 ? G : 0)) as V3;
  const need = Math.hypot(...thrust);
  const [, up, back] = quad.axes();
  const u = need > 2 ? unit(thrust) : up;
  let f = [0, 1, 2].map((k) => heading[k] - u[k] * dot(heading, u)) as V3;
  if (Math.hypot(...f) < 0.05) f = [-back[0], -back[1], -back[2]];
  const r = unit(cross(unit(f), u));
  f = cross(u, r);

  // the turn from here to there, as body rates
  let e = mul([quad.q[0], -quad.q[1], -quad.q[2], -quad.q[3]], basis(r, u, [-f[0], -f[1], -f[2]]));
  if (e[0] < 0) e = [-e[0], -e[1], -e[2], -e[3]];
  const s = Math.hypot(e[1], e[2], e[3]);
  const k = s > 1e-6 ? (2 * Math.atan2(s, e[0]) * SNAP) / s : 0;
  const cap = (x: number) => Math.max(-15, Math.min(15, x * k));
  return { pitch: -cap(e[1]), yaw: -cap(e[2]), roll: -cap(e[3]), throttle: quad.throttleFor(need) };
};
