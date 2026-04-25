"use client";

import { useEffect, useRef } from "react";

import {
  ASCII_VIDEO_FPS,
  ASCII_VIDEO_FRAMES,
} from "@/lib/ascii-video";

import {
  layout,
  measureNaturalWidth,
  prepareWithSegments,
} from "@chenglou/pretext";

const FRAME_DURATION_MS = 1000 / ASCII_VIDEO_FPS;
const ASCII_FONT_SIZE = 12;
const ASCII_LINE_HEIGHT = 9;
const ASCII_FONT_FAMILY =
  'Consolas, "Liberation Mono", "Courier New", monospace';
const ASCII_FONT = `${ASCII_FONT_SIZE}px ${ASCII_FONT_FAMILY}`;

export function AsciiVideoPlayer() {
  const preRef = useRef<HTMLPreElement>(null);
  const lastFrameIndex = useRef(0);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const prepared = prepareWithSegments(ASCII_VIDEO_FRAMES[0], ASCII_FONT, {
      whiteSpace: "pre-wrap",
    });
    const width = Math.ceil(measureNaturalWidth(prepared));
    const { height } = layout(prepared, width, ASCII_LINE_HEIGHT);

    pre.style.minHeight = `${Math.ceil(height)}px`;
    pre.style.width = `${width}px`;
  }, []);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;
    const preElement = pre;

    let animationFrameId = 0;
    const startedAt = performance.now();
    preElement.textContent = ASCII_VIDEO_FRAMES[0];

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const nextFrameIndex =
        Math.floor(elapsed / FRAME_DURATION_MS) % ASCII_VIDEO_FRAMES.length;

      if (nextFrameIndex !== lastFrameIndex.current) {
        lastFrameIndex.current = nextFrameIndex;
        preElement.textContent = ASCII_VIDEO_FRAMES[nextFrameIndex];
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <pre
      ref={preRef}
      aria-label="Animated ASCII video"
      className="select-text whitespace-pre"
      style={{
        fontFamily: ASCII_FONT_FAMILY,
        fontSize: ASCII_FONT_SIZE,
        lineHeight: `${ASCII_LINE_HEIGHT}px`,
      }}
    />
  );
}
