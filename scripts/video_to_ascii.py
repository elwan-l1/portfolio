"""Convert a video into two Brotli-compressed ASCII payloads."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

try:
    import brotli
except ImportError:
    brotli = None


DEFAULT_WIDTH = 160
DEFAULT_HEIGHT = 58
DEFAULT_FPS = 24
SMOOTH_CHARSET = "@%#*+=-:. "

DEFAULT_EQUALIZE = "none"
DEFAULT_CLAHE_CLIP_LIMIT = 2.0
DEFAULT_CLAHE_GRID_SIZE = 8
DEFAULT_EDGE_THRESHOLD = 0.0
DEFAULT_OPACITY_LEVELS = 16
DEFAULT_OPACITY_GAMMA = 1.0

OPACITY_DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"
BROTLI_EXTENSION = "br"


def positive_int(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"{value!r} is not an integer") from exc

    if parsed <= 0:
        raise argparse.ArgumentTypeError("value must be greater than 0")
    return parsed


def positive_float(value: str) -> float:
    try:
        parsed = float(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"{value!r} is not a number") from exc

    if parsed <= 0:
        raise argparse.ArgumentTypeError("value must be greater than 0")
    return parsed


def gamma_lookup_table(gamma: float) -> np.ndarray | None:
    if gamma == 1:
        return None

    return np.array(
        [np.clip(pow(index / 255.0, gamma) * 255.0, 0, 255) for index in range(256)],
        dtype=np.uint8,
    )


def process_gray_frame(
    frame: np.ndarray,
    *,
    width: int,
    height: int,
    clahe: cv2.CLAHE | None,
    gamma_table: np.ndarray | None,
    contrast: float,
    brightness: int,
) -> np.ndarray:
    resized = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

    if DEFAULT_EQUALIZE == "hist":
        gray = cv2.equalizeHist(gray)
    elif DEFAULT_EQUALIZE == "clahe":
        if clahe is None:
            raise RuntimeError("CLAHE was not initialized.")
        gray = clahe.apply(gray)

    if gamma_table is not None:
        gray = cv2.LUT(gray, gamma_table)

    if contrast != 1 or brightness != 0:
        gray = cv2.convertScaleAbs(gray, alpha=contrast, beta=brightness)

    return gray


def edge_glyphs(gray: np.ndarray, threshold: float) -> np.ndarray:
    sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    magnitude = cv2.magnitude(sobel_x, sobel_y)
    tangent = (np.rad2deg(np.arctan2(sobel_y, sobel_x)) + 90) % 180
    glyphs = np.full(gray.shape, "", dtype="<U1")
    edge_mask = magnitude >= threshold

    glyphs[edge_mask & ((tangent < 22.5) | (tangent >= 157.5))] = "-"
    glyphs[edge_mask & (tangent >= 22.5) & (tangent < 67.5)] = "/"
    glyphs[edge_mask & (tangent >= 67.5) & (tangent < 112.5)] = "|"
    glyphs[edge_mask & (tangent >= 112.5) & (tangent < 157.5)] = "\\"

    return glyphs


def opacity_frame(gray: np.ndarray, *, invert: bool) -> str:
    ink = gray if invert else 255 - gray
    normalized = ink.astype(np.float32) / 255

    if DEFAULT_OPACITY_GAMMA != 1:
        normalized = np.power(normalized, DEFAULT_OPACITY_GAMMA)

    indexes = np.rint(normalized * (DEFAULT_OPACITY_LEVELS - 1)).astype(np.int16)
    lines = ("".join(OPACITY_DIGITS[index] for index in row) for row in indexes)
    return "\n".join(lines)


def frame_to_ascii_assets(
    frame: np.ndarray,
    *,
    width: int,
    height: int,
    invert: bool,
    clahe: cv2.CLAHE | None,
    gamma_table: np.ndarray | None,
    contrast: float,
    brightness: int,
) -> tuple[str, str]:
    gray = process_gray_frame(
        frame,
        width=width,
        height=height,
        clahe=clahe,
        gamma_table=gamma_table,
        contrast=contrast,
        brightness=brightness,
    )

    scale = (len(SMOOTH_CHARSET) - 1) / 255
    indexes = np.rint(gray * scale).astype(np.int16)
    characters = np.array(tuple(SMOOTH_CHARSET), dtype="<U1")[indexes]

    if DEFAULT_EDGE_THRESHOLD > 0:
        edge_base = gray if invert else 255 - gray
        edges = edge_glyphs(edge_base, DEFAULT_EDGE_THRESHOLD)
        edge_mask = edges != ""
        characters[edge_mask] = edges[edge_mask]

    ascii_frame = "\n".join("".join(row) for row in characters)
    alpha_frame = opacity_frame(gray, invert=invert)
    return ascii_frame, alpha_frame


def default_output_path(input_path: Path) -> Path:
    return input_path.with_name(f"{input_path.stem}_ascii.txt")


def opacity_output_path_for(output_path: Path) -> Path:
    return output_path.with_name(f"{output_path.stem}-opacity{output_path.suffix}")


def brotli_compress(data: bytes) -> bytes:
    if brotli is not None:
        return brotli.compress(data, quality=11)

    brotli_path = shutil.which("brotli")
    if brotli_path is None:
        raise RuntimeError("Brotli compression requires the brotli package or CLI.")

    result = subprocess.run(
        [brotli_path, "-q", "11", "--stdout"],
        input=data,
        capture_output=True,
        check=True,
    )
    return result.stdout


def write_brotli_payload(path: Path, data: bytes) -> Path:
    compressed_path = path.with_suffix(f"{path.suffix}.{BROTLI_EXTENSION}")
    compressed_path.parent.mkdir(parents=True, exist_ok=True)
    compressed_path.write_bytes(brotli_compress(data))
    return compressed_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert every frame of a video into Brotli-compressed ASCII payloads.",
    )
    parser.add_argument(
        "input", type=Path, help="Input video path, for example video.mp4"
    )
    parser.add_argument(
        "-o",
        "--output",
        required=True,
        type=Path,
        help=(
            "Output base path for character payload. "
            "Writes <output>.br and <output-stem>-opacity<suffix>.br."
        ),
    )
    parser.add_argument(
        "--width",
        type=positive_int,
        default=DEFAULT_WIDTH,
        help=f"Output frame width in characters. Default: {DEFAULT_WIDTH}",
    )
    parser.add_argument(
        "--height",
        type=positive_int,
        default=DEFAULT_HEIGHT,
        help=f"Output frame height in characters. Default: {DEFAULT_HEIGHT}",
    )
    parser.add_argument(
        "--invert",
        action="store_true",
        help="Reverse the smooth charset so light pixels use denser characters.",
    )
    parser.add_argument(
        "--contrast",
        type=positive_float,
        default=1.0,
        help="Contrast multiplier before ASCII mapping. Default: 1.0",
    )
    parser.add_argument(
        "--brightness",
        type=int,
        default=0,
        help="Brightness offset before ASCII mapping. Default: 0",
    )
    parser.add_argument(
        "--gamma",
        type=positive_float,
        default=1.0,
        help="Gamma correction before ASCII mapping. Default: 1.0",
    )
    parser.add_argument(
        "--fps",
        type=positive_int,
        default=DEFAULT_FPS,
        help=f"Playback FPS reference. Default: {DEFAULT_FPS}",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = args.input.expanduser().resolve()
    output_path = args.output.expanduser().resolve()

    if not input_path.exists():
        print(f"Input video does not exist: {input_path}", file=sys.stderr)
        return 1

    if DEFAULT_OPACITY_LEVELS > len(OPACITY_DIGITS):
        print(
            f"Opacity levels must be at most {len(OPACITY_DIGITS)}.",
            file=sys.stderr,
        )
        return 1

    capture = cv2.VideoCapture(str(input_path))
    if not capture.isOpened():
        print(f"Could not open video: {input_path}", file=sys.stderr)
        return 1

    gamma_table = gamma_lookup_table(args.gamma)
    clahe = None
    if DEFAULT_EQUALIZE == "clahe":
        clahe = cv2.createCLAHE(
            clipLimit=DEFAULT_CLAHE_CLIP_LIMIT,
            tileGridSize=(DEFAULT_CLAHE_GRID_SIZE, DEFAULT_CLAHE_GRID_SIZE),
        )

    frame_number = 0
    ascii_frames: list[str] = []
    opacity_frames: list[str] = []
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break

            ascii_frame, opacity_frame_value = frame_to_ascii_assets(
                frame,
                width=args.width,
                height=args.height,
                invert=args.invert,
                clahe=clahe,
                gamma_table=gamma_table,
                contrast=args.contrast,
                brightness=args.brightness,
            )
            ascii_frames.append(ascii_frame)
            opacity_frames.append(opacity_frame_value)
            frame_number += 1

    finally:
        capture.release()

    if frame_number == 0:
        print("No frames were read from the video.", file=sys.stderr)
        return 1

    ascii_data = "".join(frame.replace("\n", "") for frame in ascii_frames).encode(
        "utf-8"
    )
    opacity_data = "".join(frame.replace("\n", "") for frame in opacity_frames).encode(
        "utf-8"
    )
    expected_size = frame_number * args.width * args.height

    if len(ascii_data) != expected_size or len(opacity_data) != expected_size:
        print("Generated payload size mismatch.", file=sys.stderr)
        return 1

    opacity_output_path = opacity_output_path_for(output_path)
    ascii_brotli_path = write_brotli_payload(output_path, ascii_data)
    opacity_brotli_path = write_brotli_payload(opacity_output_path, opacity_data)

    print(f"Wrote {frame_number} frame(s)")
    print(f"Chars payload: {ascii_brotli_path}")
    print(f"Opacity payload: {opacity_brotli_path}")
    print(f"FPS reference: {args.fps}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
