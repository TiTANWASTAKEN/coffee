"""Place the Dark Truth bag on the site's espresso background."""
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(os.environ.get("BAG_SRC", Path(os.environ["TEMP"]) / "dark-truth-packshot-src.jpg"))
OUT = ROOT / "public" / "images" / "products" / "dark-truth" / "packshot.jpg"

W, H = 1200, 1500  # 4:5, same frame as the product cards


def subject_mask(rgb: np.ndarray) -> np.ndarray:
    """Keep the bag, including the pale seal, and drop the gray studio and floor shadow.

    The seal's light stripes are the same gray as the backdrop, so a color flood
    eats them. The bag is the span between the first and last dark or warm pixel
    in each column.
    """
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    bag = (lum < 72) | (sat > 28)
    h, w = bag.shape
    alpha = np.zeros((h, w), np.uint8)
    for x in range(w):
        ys = np.flatnonzero(bag[:, x])
        if ys.size == 0:
            continue
        alpha[ys[0] : ys[-1] + 1, x] = 255
    mask = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.6))
    return np.asarray(mask)


def canvas() -> np.ndarray:
    """Same field as the drawn bags: flat espresso, a corner glow, a soft vignette."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    bg = np.empty((H, W, 3), np.float32)
    bg[:] = (14, 13, 12)  # dark pack field

    # radial-gradient(120% 90% at 15% 0%, rgb(130 112 100 / 0.2), transparent 60%)
    rx, ry = 1.2 * W, 0.9 * H
    top = np.sqrt(((xx - 0.15 * W) / rx) ** 2 + ((yy - 0) / ry) ** 2)
    top_glow = np.clip(1 - top / 0.6, 0, 1) ** 1.4
    bg += top_glow[..., None] * np.array([130, 112, 100], np.float32) * 0.2

    # radial-gradient(90% 70% at 100% 100%, rgb(90 57 40 / 0.16), transparent 70%)
    corner = np.sqrt(((xx - W) / (0.9 * W)) ** 2 + ((yy - H) / (0.7 * H)) ** 2)
    corner_glow = np.clip(1 - corner / 0.7, 0, 1) ** 1.4
    bg += corner_glow[..., None] * np.array([90, 57, 40], np.float32) * 0.16

    # vignette: transparent through the middle, darker at the edges
    vig = np.sqrt(((xx - 0.5 * W) / (0.6 * W)) ** 2 + ((yy - 0.4 * H) / (0.5 * H)) ** 2)
    shade = np.clip((vig - 0.55) / 0.45, 0, 1) * 0.55
    bg *= (1 - shade)[..., None]

    rng = np.random.default_rng(4)
    grain = rng.normal(0, 3.2, (H, W, 1)).astype(np.float32)
    return np.clip(bg + grain, 0, 255)


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    rgb = np.asarray(src)
    alpha = subject_mask(rgb)
    ys, xs = np.where(alpha > 16)
    pad = 2
    box = (int(xs.min()) - pad, int(ys.min()) - pad, int(xs.max()) + pad, int(ys.max()) + pad)
    crop = src.crop(box)
    crop_a = Image.fromarray(alpha, "L").crop(box)

    # Same footprint as the drawn pouch: 70% of the frame, centred a little above middle.
    target_h = int(H * 0.70)
    scale = target_h / crop.height
    target_w = max(1, int(crop.width * scale))
    bag = crop.resize((target_w, target_h), Image.Resampling.LANCZOS)
    bag_a = crop_a.resize((target_w, target_h), Image.Resampling.LANCZOS)

    plate = Image.fromarray(canvas().astype(np.uint8), "RGB")
    x = (W - target_w) // 2
    y = int(H * 0.47 - target_h / 2)

    shadow = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(shadow)
    sy = int(H * 0.90)
    draw.ellipse((W * 0.24, sy, W * 0.76, sy + H * 0.07), fill=200)
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    shade = Image.new("RGB", (W, H), (0, 0, 0))
    plate.paste(shade, (0, 0), shadow)

    plate.paste(bag, (x, y), bag_a)
    plate.save(OUT, "JPEG", quality=92, optimize=True)
    print(f"wrote {OUT} {plate.size} from bag {crop.size}")


if __name__ == "__main__":
    main()
