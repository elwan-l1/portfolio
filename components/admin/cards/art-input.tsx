import { useState } from "react";

import { toAscii } from "@/lib/art";
import { ART_ADVANCE } from "@/lib/card-svg";

import { MAX_ART, TEXT as t } from "@/constants/cards";

type Params = { cols: number; cutoff: number; dust: number; invert: boolean };

const DEFAULTS: Params = { cols: 64, cutoff: 0.12, dust: 0.045, invert: false };

const CELLS = 24;

const convert = (image: ImageBitmap, { cols: wanted, cutoff, dust, invert }: Params) => {
  // a cell is ART_ADVANCE wide for 1 tall; tall images get fewer columns to stay inside MAX_ART rows
  const ratio = (image.height / image.width) * ART_ADVANCE;
  const cols = Math.max(1, Math.min(wanted, Math.floor(MAX_ART / ratio)));
  const rows = Math.max(1, Math.round(cols * ratio));

  const context = new OffscreenCanvas(cols, rows).getContext("2d")!;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, cols, rows);
  const { data } = context.getImageData(0, 0, cols, rows);

  const levels = Array.from({ length: cols * rows }, (_, i) => {
    const lum = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
    return (invert ? 1 - lum : lum) * (data[i * 4 + 3] / 255);
  });
  // stretched to the full range so dim photos still reach the dense glyphs
  const low = Math.min(...levels);
  const span = Math.max(...levels) - low || 1;
  return toAscii(
    levels.map((level) => (level - low) / span),
    cols,
    cutoff,
    dust,
  );
};

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

const Slider = ({ label, value, min, max, step, onChange }: SliderProps) => {
  const filled = Math.round(((value - min) / (max - min)) * CELLS);
  return (
    <label className="text-meta text-overlay1 focus-within:text-pink flex flex-col gap-1">
      <span>
        {label} <span className="text-text tabular-nums">{value}</span>
      </span>
      <span className="relative block py-1">
        <span aria-hidden className="font-text block leading-none whitespace-pre">
          <span className="text-pink">{"█".repeat(filled)}</span>
          <span className="text-overlay0">{"░".repeat(CELLS - filled)}</span>
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="absolute inset-0 m-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </span>
    </label>
  );
};

export const ArtInput = ({ onChange }: { onChange: (art: string) => void }) => {
  const [image, setImage] = useState<ImageBitmap>();
  const [params, setParams] = useState(DEFAULTS);

  const update = (next: Params, picked = image) => {
    setParams(next);
    setImage(picked);
    if (picked) onChange(convert(picked, next));
  };

  const pick = async (file?: File) => {
    if (file) update(params, await createImageBitmap(file));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* a file input takes dropped files too, so it covers the whole zone */}
      <label className="text-meta text-subtext0 hover:text-pink hover:border-pink focus-within:border-pink border-surface1 relative border border-dashed px-4 py-6 text-center">
        {t.dropImage}
        <input
          type="file"
          accept="image/*"
          onChange={(event) => pick(event.target.files?.[0])}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-x-6 gap-y-3">
        <Slider
          label={t.width}
          value={params.cols}
          min={16}
          max={MAX_ART}
          step={1}
          onChange={(cols) => update({ ...params, cols })}
        />
        <Slider
          label={t.cutoff}
          value={params.cutoff}
          min={0}
          max={0.6}
          step={0.01}
          onChange={(cutoff) => update({ ...params, cutoff })}
        />
        <Slider
          label={t.dust}
          value={params.dust}
          min={0}
          max={0.2}
          step={0.005}
          onChange={(dust) => update({ ...params, dust })}
        />
        <label className="text-meta text-overlay1 hover:text-pink flex cursor-pointer items-center gap-2 self-end">
          <input
            type="checkbox"
            checked={params.invert}
            onChange={(event) => update({ ...params, invert: event.target.checked })}
            className="accent-pink"
          />
          {t.invert}
        </label>
      </div>
    </div>
  );
};
