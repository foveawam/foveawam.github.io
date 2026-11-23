"""Build light preview clips for the real-robot wall on the project page.

The page shows all six paired trials at once, so it plays small previews
(640 x 420, H.264, no audio) and keeps the full-resolution showcase clips
for the enlarged comparison. Every preview is cropped to the 1.524 aspect
of tasks T1-T4 so the six cards share one height.

Usage (from this folder, with ffmpeg on PATH):
    python build_real_previews.py
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "dist"
OUT = ROOT / "assets" / "real" / "previews"
WIDTH, HEIGHT = 640, 420
# Horizontal crop anchor per task. T6's failure ends with the cart at the
# left edge of the frame, so its crop keeps the left side.
ANCHOR = {"t6": "left"}


def crop_filter(task_id: str, width: int, height: int) -> str:
    aspect = WIDTH / HEIGHT
    if width / height > aspect:  # wider than the target: trim the sides
        cw, ch = round(height * aspect) // 2 * 2, height
        x = 0 if ANCHOR.get(task_id) == "left" else (width - cw) // 2
        crop = f"crop={cw}:{ch}:{x}:0"
    else:  # taller than the target: trim top and bottom equally
        cw, ch = width, round(width / aspect) // 2 * 2
        crop = f"crop={cw}:{ch}:0:{(height - ch) // 2}"
    return f"{crop},scale={WIDTH}:{HEIGHT}:flags=lanczos,format=yuv420p"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    tasks = json.loads((ROOT / "media.json").read_text(encoding="utf-8"))["real"]
    for task in tasks:
        vf = crop_filter(task["id"], task["width"], task["height"])
        for kind in ("success", "failure"):
            source = ROOT / task[kind]["video"]
            stem = OUT / f"{task['id']}-{kind}"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-vf", vf, "-an",
                            "-c:v", "libx264", "-preset", "veryfast", "-crf", "27",
                            "-movflags", "+faststart", f"{stem}.mp4"], check=True)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-vf", vf,
                            "-frames:v", "1", "-q:v", "4", f"{stem}.jpg"], check=True)
            print(f"{stem.name}: {stem.with_suffix('.mp4').stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
