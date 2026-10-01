"use client";

import { useEffect, useRef, useState } from "react";

import { measureNaturalWidth, prepareWithSegments } from "@chenglou/pretext";

const ASCII_VIDEO_WIDTH = 160;
const ASCII_VIDEO_HEIGHT = 58;
const ASCII_VIDEO_FPS = 24;
const ASCII_VIDEO_OPACITY_LEVELS = 16;
const ASCII_VIDEO_FRAME_SIZE = ASCII_VIDEO_WIDTH * ASCII_VIDEO_HEIGHT;
const ASCII_VIDEO_SOURCES = [{ url: "/ascii-video.txt.br", compression: "brotli" }] as const;
const ASCII_VIDEO_OPACITY_SOURCES = [
  { url: "/ascii-video-opacity.txt.br", compression: "brotli" },
] as const;
const ASCII_VIDEO_FETCH_CACHE: RequestCache =
  process.env.NODE_ENV === "development" ? "no-cache" : "force-cache";

const FRAME_DURATION_MS = 1000 / ASCII_VIDEO_FPS;

const ASCII_FONT_SIZE = 12;
const ASCII_LINE_HEIGHT = 9;
const ASCII_LETTER_SPACING = -1;

const ASCII_FONT_FAMILY = 'Consolas, "Liberation Mono", "Courier New", monospace';

const ASCII_FONT = `${ASCII_FONT_SIZE}px ${ASCII_FONT_FAMILY}`;

const HTTP_ENCODINGS = {
  brotli: "br",
} as const;

const OPACITY_DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

type AsciiVideoData = {
  frameCount: number;
  opacity: string;
  text: string;
};

type AsciiVideoSource = {
  compression: "brotli";
  url: string;
};

type CompressionFormat = ConstructorParameters<typeof DecompressionStream>[0];
type BrotliModule = {
  decompress: (input: Uint8Array) => Uint8Array;
};

let brotliModulePromise: Promise<BrotliModule> | null = null;

function validatePayload(text: string) {
  if (text.length === 0 || text.length % ASCII_VIDEO_FRAME_SIZE !== 0) {
    throw new Error("Invalid ASCII video payload.");
  }

  return text;
}

function canDecompress(compression: AsciiVideoSource["compression"]) {
  if (!("DecompressionStream" in globalThis)) return false;

  try {
    new DecompressionStream(compression as CompressionFormat);
    return true;
  } catch {
    return false;
  }
}

async function getBrotliModule() {
  if (brotliModulePromise) return brotliModulePromise;

  brotliModulePromise = import("brotli-dec-wasm").then((module) => module.default);

  return brotliModulePromise;
}

async function decodeBrotli(bytes: Uint8Array) {
  const brotli = await getBrotliModule();
  const decompressed = brotli.decompress(bytes);
  return new TextDecoder().decode(decompressed);
}

async function readAsciiVideoPayload(source: AsciiVideoSource, signal: AbortSignal) {
  const response = await fetch(source.url, {
    cache: ASCII_VIDEO_FETCH_CACHE,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Could not load ASCII video: ${response.status}`);
  }

  const contentEncoding = response.headers.get("content-encoding");

  if (contentEncoding === HTTP_ENCODINGS[source.compression]) {
    return validatePayload(await response.text());
  }

  if (canDecompress(source.compression)) {
    if (!response.body) {
      throw new Error("ASCII video response did not include a body.");
    }

    const stream = response.body.pipeThrough(
      new DecompressionStream(source.compression as CompressionFormat),
    );

    return validatePayload(await new Response(stream).text());
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  if (source.compression === "brotli") {
    return validatePayload(await decodeBrotli(bytes));
  }

  throw new Error("Unsupported ASCII video compression.");
}

async function loadPayload(sources: readonly AsciiVideoSource[], signal: AbortSignal) {
  let lastError: unknown;

  for (const source of sources) {
    if (signal.aborted) return null;

    try {
      return await readAsciiVideoPayload(source, signal);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No supported ASCII video source.");
}

async function loadAsciiVideo(signal: AbortSignal) {
  const [text, opacity] = await Promise.all([
    loadPayload(ASCII_VIDEO_SOURCES, signal),
    loadPayload(ASCII_VIDEO_OPACITY_SOURCES, signal),
  ]);

  if (!text || !opacity) return null;
  if (text.length !== opacity.length) {
    throw new Error("ASCII payload size mismatch.");
  }

  return {
    frameCount: text.length / ASCII_VIDEO_FRAME_SIZE,
    text,
    opacity,
  };
}

function opacityForLevel(level: number) {
  const opacity = level / (ASCII_VIDEO_OPACITY_LEVELS - 1);
  return Math.pow(opacity, 1.15);
}

function getFallbackAsciiWidth() {
  return ASCII_VIDEO_WIDTH * ASCII_FONT_SIZE;
}

function measureAsciiWidth() {
  if (typeof window === "undefined") {
    return getFallbackAsciiWidth();
  }

  const prepared = prepareWithSegments("M".repeat(ASCII_VIDEO_WIDTH), ASCII_FONT, {
    whiteSpace: "pre-wrap",
    letterSpacing: ASCII_LETTER_SPACING,
  });

  return Math.ceil(measureNaturalWidth(prepared));
}

function updateAsciiVideoFrame(rows: HTMLSpanElement[], video: AsciiVideoData, frameIndex: number) {
  const start = frameIndex * ASCII_VIDEO_FRAME_SIZE;
  const end = start + ASCII_VIDEO_FRAME_SIZE;

  const frame = video.text.slice(start, end);
  const opacityFrame = video.opacity.slice(start, end);

  for (let rowIndex = 0; rowIndex < ASCII_VIDEO_HEIGHT; rowIndex += 1) {
    const rowStart = rowIndex * ASCII_VIDEO_WIDTH;
    const row = frame.slice(rowStart, rowStart + ASCII_VIDEO_WIDTH);
    const opacityRow = opacityFrame.slice(rowStart, rowStart + ASCII_VIDEO_WIDTH);

    for (let level = 1; level < ASCII_VIDEO_OPACITY_LEVELS; level += 1) {
      const digit = OPACITY_DIGITS[level];
      let text = "";

      for (let index = 0; index < ASCII_VIDEO_WIDTH; index += 1) {
        text += opacityRow[index] === digit ? row[index] : " ";
      }

      const elementIndex = rowIndex * (ASCII_VIDEO_OPACITY_LEVELS - 1) + (level - 1);

      const element = rows[elementIndex];
      if (element) element.textContent = text;
    }
  }
}

export function AsciiVideoPlayer() {
  const rowRefs = useRef<HTMLSpanElement[]>([]);
  const lastFrameIndex = useRef(0);
  const videoRef = useRef<AsciiVideoData | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [width, setWidth] = useState<number>(getFallbackAsciiWidth());

  const height = ASCII_LINE_HEIGHT * ASCII_VIDEO_HEIGHT;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWidth(measureAsciiWidth());
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    let animationFrameId = 0;
    let startedAt = 0;

    loadAsciiVideo(abortController.signal)
      .then((video) => {
        if (!video || abortController.signal.aborted) return;

        videoRef.current = video;
        lastFrameIndex.current = 0;
        setLoadError(null);
        updateAsciiVideoFrame(rowRefs.current, video, 0);
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) return;

        if (error instanceof Error) {
          setLoadError(error.message);
          return;
        }

        setLoadError("Could not load ASCII video.");
      });

    const tick = (now: number) => {
      const video = videoRef.current;

      if (!video) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      if (!startedAt) startedAt = now;

      const elapsed = now - startedAt;
      const nextFrameIndex = Math.floor(elapsed / FRAME_DURATION_MS) % video.frameCount;

      if (nextFrameIndex !== lastFrameIndex.current) {
        lastFrameIndex.current = nextFrameIndex;
        updateAsciiVideoFrame(rowRefs.current, video, nextFrameIndex);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      abortController.abort();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      aria-label="Animated ASCII video"
      className="relative block overflow-hidden text-white"
      style={{
        width,
        height,
        font: ASCII_FONT,
        lineHeight: `${ASCII_LINE_HEIGHT}px`,
        letterSpacing: `${ASCII_LETTER_SPACING}px`,
        whiteSpace: "pre",
      }}
    >
      {loadError ? (
        <span className="absolute top-0 left-0 text-xs text-red-400">{loadError}</span>
      ) : null}
      {Array.from({ length: ASCII_VIDEO_HEIGHT }).map((_, rowIndex) =>
        Array.from({ length: ASCII_VIDEO_OPACITY_LEVELS - 1 }).map((_, levelIndex) => {
          const level = levelIndex + 1;
          const refIndex = rowIndex * (ASCII_VIDEO_OPACITY_LEVELS - 1) + levelIndex;

          return (
            <span
              key={`${rowIndex}-${level}`}
              ref={(element) => {
                if (element) rowRefs.current[refIndex] = element;
              }}
              aria-hidden="true"
              className="absolute left-0 block"
              style={{
                top: rowIndex * ASCII_LINE_HEIGHT,
                opacity: opacityForLevel(level),
              }}
            />
          );
        }),
      )}
    </div>
  );
}
