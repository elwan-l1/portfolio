"use client";

import { useEffect, useRef, useState } from "react";

import { lambda } from "@/lib/lambda";
import { artAdvance, useBox, useFonts } from "@/lib/type";

/*
 * A real GLSL fragment shader drawn in text. It runs on the GPU once per
 * character and each frame is read
 * back and written out as glyphs: red says which glyph, green which ink.
 *
 */

const FRAG = `
precision highp float;

uniform float u_time;
uniform float u_lambda;   // the page's λ slider
uniform vec2 u_mouse;     // in characters
uniform vec3 u_drops[4];  // ripples: x, y, start time

#define PI 3.14159265

const vec2 CHAR = vec2(0.6, 1.0); // characters are 0.6 as wide as they are tall

float random(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(random(i), random(i + vec2(1.0, 0.0)), u.x),
             mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 st) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(st);
    st = st * 2.0 + 100.0; // shift, so the octaves don't line up
    a *= 0.5;
  }
  return v;
}

// taxicab distance: its circles are diamonds
float diamond(vec2 v) {
  return abs(v.x) + abs(v.y);
}

// how much of a ripple's front is passing here
float front(vec3 drop, vec2 st) {
  float age = u_time - drop.z;
  float d = diamond(st - drop.xy * CHAR);
  return smoothstep(5.0, 0.0, abs(d - age * 9.0)) * exp(-age * 0.4);
}

float weight(vec2 st) {
  // noise warped by noise
  vec2 p = st * 0.09;
  float t = u_time * 0.08;
  vec2 q = vec2(fbm(p + t), fbm(p - t + 5.2));
  float w = fbm(p + 1.8 * q) * 4.0 - 1.75;

  // plus the ripples
  for (int i = 0; i < 4; i++) {
    float d = diamond(st - u_drops[i].xy * CHAR);
    w += sin(d * 1.3 - u_time * 6.0) * front(u_drops[i], st);
  }
  return w;
}

void main() {
  vec2 st = gl_FragCoord.xy * CHAR;
  float w = weight(st);

  // the L1 penalty: take λ off every weight, anything that drops below zero is gone
  float lambda = 0.06 + 0.42 * u_lambda + 0.05 * sin(u_time * 0.7);
  for (int i = 0; i < 4; i++) lambda -= 0.45 * front(u_drops[i], st); // ripples lift it
  lambda *= smoothstep(2.0, 9.0, diamond(st - u_mouse * CHAR)); // and so does the mouse
  float s = abs(w) - max(lambda, 0.0);

  float glyph = 0.0;               // blank
  float ink = w > 0.0 ? 2.0 : 0.0; // pink or mauve

  if (s > 0.0) {
    // how much the weight changes from one character to the next
    vec2 g = vec2(weight(st + vec2(0.6, 0.0)), weight(st + vec2(0.0, 1.0))) - w;

    if (s < length(g)) {
      // less than a character from the blank: a stroke along the edge (- / | or backslash)
      g /= CHAR;
      float a = atan(g.y, g.x) + PI / 2.0;
      glyph = 1.0 + mod(floor(a / (PI / 4.0) + 0.5), 4.0);
    } else {
      // inside: denser the bigger the weight, and the biggest in white
      glyph = 5.0 + min(floor(s * 10.0 + random(st)), 7.0);
      if (s > 0.5) ink = 1.0;
    }
  }

  gl_FragColor = vec4(glyph, ink, 0.0, 255.0) / 255.0;
}
`;

const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

// glyph indices as the shader writes them: blank, the strokes - / | \, then eight densities
const GLYPHS = " -/|\\·:+*#%&@";
const INKS = ["#CBA6F7", "#FFFFFF", "#FFBFE9"];
const SIZE = 10; // px
const DROPS = 4;
const IDLE = 2600; // ms between drops nobody asked for
const FAR = -1e4;

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const program = (gl: WebGLRenderingContext) => {
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) ?? "link");
  gl.useProgram(p);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(p, name);
  return {
    time: u("u_time"),
    lambda: u("u_lambda"),
    mouse: u("u_mouse"),
    drops: u("u_drops"),
  };
};

type GPU = { gl: WebGLRenderingContext; u: ReturnType<typeof program> };
let gpu: GPU | null | undefined;

/** The context and compiled shader, made once for the page; null where WebGL is missing or the shader fails. */
const getGPU = () => {
  if (gpu !== undefined) return gpu;
  try {
    const gl = document.createElement("canvas").getContext("webgl", { antialias: false });
    gpu = gl && { gl, u: program(gl) };
  } catch {
    gpu = null;
  }
  return gpu;
};

/** One frame's cells as a line of runs per row, each run one span in its ink. */
const html = (px: Uint8Array, cols: number, rows: number) => {
  let out = "";
  let on = 0;
  for (let j = 0; j < rows; j++) {
    const row = (rows - 1 - j) * cols * 4; // GL's rows go bottom up
    let ink = -1;
    for (let i = 0; i < cols; i++) {
      const g = px[row + i * 4];
      const k = g ? px[row + i * 4 + 1] : ink; // a space joins whatever run it is in
      if (g) on++;
      if (k !== ink) {
        if (ink >= 0) out += "</span>";
        if (k >= 0) out += `<span style="color:${INKS[k]}">`;
        ink = k;
      }
      const ch = GLYPHS[g] ?? " ";
      out += ch === "<" ? "&lt;" : ch;
    }
    if (ink >= 0) out += "</span>";
    out += "\n";
  }
  return { out, on };
};

export const Shader = ({ fallback }: { fallback: string }) => {
  const ready = useFonts();
  const [box, { w, h }] = useBox<HTMLDivElement>();
  const pre = useRef<HTMLPreElement>(null);
  const cursor = useRef<[number, number]>([FAR, FAR]);
  const drops = useRef(new Float32Array(DROPS * 3).fill(-100));
  const dropped = useRef(0);
  const [stats, setStats] = useState({ lambda: 0, nonzero: 0 });
  const ok = getGPU() !== null;

  const cw = SIZE * artAdvance(ready);
  const cols = w ? Math.floor(w / cw) : 0;
  const rows = h ? Math.floor(h / SIZE) : 0;

  useEffect(() => {
    const g = getGPU();
    if (!g || !cols || !rows || !pre.current) return;
    const { gl, u } = g;
    gl.canvas.width = cols;
    gl.canvas.height = rows;
    gl.viewport(0, 0, cols, rows);
    const px = new Uint8Array(cols * rows * 4);
    const start = performance.now();
    drops.current.fill(-100); // their times ran on the last clock
    let raf = 0;
    let frame = 0;

    const drop = (x: number, y: number, t: number) => {
      const d = drops.current;
      const k = dropped.current++ % DROPS;
      d.set([x, y, t], k * 3);
    };
    let idle = 0;

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      // keep still while someone is selecting the text
      const sel = getSelection();
      const holding = sel && !sel.isCollapsed && pre.current && sel.containsNode(pre.current, true);
      if (!holding) {
        if (now - idle > IDLE) {
          idle = now;
          drop(Math.random() * cols, Math.random() * rows, t);
        }
        gl.uniform1f(u.time, t);
        gl.uniform1f(u.lambda, lambda.get());
        gl.uniform2f(u.mouse, ...cursor.current);
        gl.uniform3fv(u.drops, drops.current);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.readPixels(0, 0, cols, rows, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const { out, on } = html(px, cols, rows);
        if (pre.current) pre.current.innerHTML = out;
        if (frame++ % 12 === 0) setStats({ lambda: lambda.get(), nonzero: on / (cols * rows) });
      }
      if (!reduced()) raf = requestAnimationFrame(draw);
    };
    // with reduced motion: one still frame, a little way in so the field has formed
    if (reduced()) draw(start + 8000);
    else raf = requestAnimationFrame(draw);

    // a click drops a ripple where it lands
    const el = pre.current;
    // in characters, with y up as GL has it
    const at = (e: PointerEvent): [number, number] => {
      const r = el.getBoundingClientRect();
      const pad = getComputedStyle(el);
      return [
        (e.clientX - r.left - parseFloat(pad.paddingLeft)) / cw,
        rows - (e.clientY - r.top - parseFloat(pad.paddingTop)) / SIZE,
      ];
    };
    const move = (e: PointerEvent) => (cursor.current = at(e));
    const leave = () => (cursor.current = [FAR, FAR]);
    const down = (e: PointerEvent) => {
      idle = performance.now();
      drop(...at(e), (idle - start) / 1000);
      if (reduced()) draw(idle + 1200); // one still frame, the ripple a little way out
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", down);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", down);
    };
  }, [cols, rows, cw]);

  if (!ok)
    return <p className="text-lead m-0 leading-snug font-bold tracking-[-0.02em]">{fallback}</p>;

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <div ref={box} className="bg-crust tall:h-[240px] relative h-[200px] overflow-hidden">
        <pre
          ref={pre}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="img"
          aria-label="A GLSL shader drawn in text: a drifting field of weights that the L1 penalty zeroes, with diamond ripples"
          className="font-text absolute inset-0 m-0 cursor-crosshair leading-none whitespace-pre"
          style={{
            fontSize: SIZE,
            padding: `${(h - rows * SIZE) / 2}px ${(w - cols * cw) / 2}px`,
          }}
        />
      </div>
      <p className="font-text text-meta text-crust m-0 flex flex-wrap justify-between gap-x-3 whitespace-nowrap tabular-nums">
        <span>
          λ {stats.lambda.toFixed(2)} · {Math.round(stats.nonzero * 100)}% nonzero
        </span>
        <span className="opacity-60">click to drop</span>
      </p>
    </div>
  );
};
