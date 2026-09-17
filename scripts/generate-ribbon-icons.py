from __future__ import annotations

from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "assets" / "ribbon"
SIZES = (16, 32, 80)
SCALE = 4
INK = "#155A91"
ACCENT = "#E2782D"


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", (80 * SCALE, 80 * SCALE), (255, 255, 255, 0))
    return image, ImageDraw.Draw(image)


def line(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], width: int = 5, fill: str = INK) -> None:
    draw.line([(x * SCALE, y * SCALE) for x, y in points], fill=fill, width=width * SCALE, joint="curve")


def rect(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], width: int = 5, fill: str = INK, radius: int = 7) -> None:
    draw.rounded_rectangle(tuple(value * SCALE for value in box), radius=radius * SCALE, outline=fill, width=width * SCALE)


def doc(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int] = (18, 9, 61, 71)) -> None:
    left, top, right, bottom = box
    draw.polygon([(right - 15 * SCALE, top * SCALE), (right * SCALE, (top + 15) * SCALE), (right * SCALE, bottom * SCALE), (left * SCALE, bottom * SCALE), (left * SCALE, top * SCALE)], outline=INK)
    line(draw, [(right - 15, top), (right - 15, top + 15), (right, top + 15)], width=4)


def icon_read() -> Image.Image:
    image, draw = canvas()
    doc(draw)
    draw.arc((28 * SCALE, 29 * SCALE, 62 * SCALE, 55 * SCALE), 200, 340, fill=ACCENT, width=4 * SCALE)
    draw.ellipse((41 * SCALE, 36 * SCALE, 49 * SCALE, 44 * SCALE), outline=ACCENT, width=3 * SCALE)
    return image


def icon_open() -> Image.Image:
    image, draw = canvas()
    doc(draw, (13, 9, 55, 71))
    line(draw, [(41, 40), (68, 40)], width=6, fill=ACCENT)
    line(draw, [(57, 30), (68, 40), (57, 50)], width=6, fill=ACCENT)
    return image


def icon_drafting() -> Image.Image:
    image, draw = canvas()
    draw.polygon([(20 * SCALE, 61 * SCALE), (27 * SCALE, 43 * SCALE), (57 * SCALE, 13 * SCALE), (68 * SCALE, 24 * SCALE), (38 * SCALE, 54 * SCALE)], fill=INK)
    draw.polygon([(20 * SCALE, 61 * SCALE), (27 * SCALE, 43 * SCALE), (38 * SCALE, 54 * SCALE)], fill=ACCENT)
    line(draw, [(52, 18), (63, 29)], width=3, fill="white")
    return image


def icon_addressee() -> Image.Image:
    image, draw = canvas()
    draw.ellipse((30 * SCALE, 13 * SCALE, 50 * SCALE, 33 * SCALE), outline=INK, width=5 * SCALE)
    draw.arc((19 * SCALE, 31 * SCALE, 61 * SCALE, 70 * SCALE), 190, 350, fill=INK, width=5 * SCALE)
    line(draw, [(21, 61), (59, 61)], width=4, fill=ACCENT)
    return image


def icon_recipients() -> Image.Image:
    image, draw = canvas()
    for center in ((29, 28), (51, 28)):
        x, y = center
        draw.ellipse(((x - 8) * SCALE, (y - 8) * SCALE, (x + 8) * SCALE, (y + 8) * SCALE), outline=INK, width=4 * SCALE)
    draw.arc((12 * SCALE, 39 * SCALE, 47 * SCALE, 70 * SCALE), 190, 350, fill=INK, width=4 * SCALE)
    draw.arc((33 * SCALE, 39 * SCALE, 68 * SCALE, 70 * SCALE), 190, 350, fill=ACCENT, width=4 * SCALE)
    return image


def icon_rule() -> Image.Image:
    image, draw = canvas()
    line(draw, [(13, 40), (67, 40)], width=7)
    draw.ellipse((9 * SCALE, 35 * SCALE, 19 * SCALE, 45 * SCALE), fill=ACCENT)
    draw.ellipse((61 * SCALE, 35 * SCALE, 71 * SCALE, 45 * SCALE), fill=ACCENT)
    return image


def icon_page_numbers() -> Image.Image:
    image, draw = canvas()
    doc(draw, (21, 8, 59, 72))
    font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 25 * SCALE)
    draw.text((31 * SCALE, 28 * SCALE), "1", font=font, fill=ACCENT, stroke_width=0)
    return image


def icon_appendix() -> Image.Image:
    image, draw = canvas()
    line(draw, [(29, 25), (49, 45), (49, 58), (42, 65), (29, 65), (21, 57), (21, 45), (34, 32), (43, 32), (48, 37)], width=5)
    line(draw, [(36, 40), (30, 46), (30, 53), (35, 58), (42, 58)], width=5, fill=ACCENT)
    return image


def icon_table() -> Image.Image:
    image, draw = canvas()
    rect(draw, (13, 16, 67, 64), width=5, radius=2)
    line(draw, [(13, 32), (67, 32)], width=4)
    line(draw, [(13, 48), (67, 48)], width=4)
    line(draw, [(31, 16), (31, 64)], width=4, fill=ACCENT)
    line(draw, [(49, 16), (49, 64)], width=4)
    return image


def icon_numbering() -> Image.Image:
    image, draw = canvas()
    font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 17 * SCALE)
    for y, value in ((17, "1"), (35, "2"), (53, "3")):
        draw.ellipse((12 * SCALE, (y - 1) * SCALE, 29 * SCALE, (y + 16) * SCALE), fill=INK)
        draw.text((17 * SCALE, y * SCALE), value, font=font, fill="white", anchor="ma")
        line(draw, [(37, y + 8), (67, y + 8)], width=4, fill=ACCENT if value == "1" else INK)
    return image


def icon_library() -> Image.Image:
    image, draw = canvas()
    draw.polygon([(12 * SCALE, 25 * SCALE), (30 * SCALE, 25 * SCALE), (36 * SCALE, 18 * SCALE), (68 * SCALE, 18 * SCALE), (68 * SCALE, 63 * SCALE), (12 * SCALE, 63 * SCALE)], outline=INK)
    line(draw, [(12, 29), (68, 29)], width=5, fill=ACCENT)
    return image


def icon_ai() -> Image.Image:
    image, draw = canvas()
    draw.ellipse((28 * SCALE, 28 * SCALE, 52 * SCALE, 52 * SCALE), fill=INK)
    line(draw, [(40, 10), (40, 22), (40, 58), (40, 70)], width=4, fill=ACCENT)
    line(draw, [(10, 40), (22, 40), (58, 40), (70, 40)], width=4, fill=ACCENT)
    line(draw, [(19, 19), (25, 25), (55, 55), (61, 61)], width=3)
    line(draw, [(61, 19), (55, 25), (25, 55), (19, 61)], width=3)
    return image


def icon_proofread() -> Image.Image:
    image, draw = canvas()
    draw.ellipse((13 * SCALE, 13 * SCALE, 67 * SCALE, 67 * SCALE), outline=INK, width=5 * SCALE)
    line(draw, [(25, 41), (36, 52), (57, 28)], width=7, fill=ACCENT)
    return image


def icon_builder() -> Image.Image:
    image, draw = canvas()
    doc(draw, (14, 8, 55, 72))
    line(draw, [(46, 56), (68, 56)], width=6, fill=ACCENT)
    line(draw, [(57, 45), (57, 67)], width=6, fill=ACCENT)
    return image


def icon_fill() -> Image.Image:
    image, draw = canvas()
    doc(draw, (16, 8, 63, 72))
    line(draw, [(27, 29), (52, 29)], width=4)
    line(draw, [(27, 42), (52, 42)], width=4)
    line(draw, [(27, 55), (36, 55), (44, 47)], width=4, fill=ACCENT)
    return image


def icon_guidance() -> Image.Image:
    image, draw = canvas()
    draw.ellipse((13 * SCALE, 13 * SCALE, 67 * SCALE, 67 * SCALE), outline=INK, width=5 * SCALE)
    font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 38 * SCALE)
    draw.text((40 * SCALE, 41 * SCALE), "i", font=font, fill=ACCENT, anchor="mm")
    return image


ICON_BUILDERS: dict[str, Callable[[], Image.Image]] = {
    "read": icon_read,
    "open": icon_open,
    "drafting": icon_drafting,
    "addressee": icon_addressee,
    "recipients": icon_recipients,
    "rule": icon_rule,
    "page-numbers": icon_page_numbers,
    "appendix": icon_appendix,
    "table": icon_table,
    "numbering": icon_numbering,
    "library": icon_library,
    "ai": icon_ai,
    "proofread": icon_proofread,
    "builder": icon_builder,
    "fill": icon_fill,
    "guidance": icon_guidance,
}


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, builder in ICON_BUILDERS.items():
        source = builder()
        for size in SIZES:
            output = source.resize((size, size), Image.Resampling.LANCZOS)
            output.save(OUTPUT_DIR / f"icon-{name}-{size}.png", optimize=True)
    print(f"Generated {len(ICON_BUILDERS) * len(SIZES)} Ribbon icons in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
