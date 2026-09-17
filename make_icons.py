"""Генерирует иконки расширения: три цветные «вкладки» под общей скобкой группы."""
from PIL import Image, ImageDraw

SIZES = [16, 32, 48, 96]
TAB_COLORS = [(66, 133, 244), (52, 168, 83), (251, 140, 0)]  # blue, green, orange
BRACKET_COLOR = (95, 99, 104)


def draw_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    pad = max(1, round(size * 0.08))
    gap = max(1, round(size * 0.06))
    tab_w = (size - 2 * pad - 2 * gap) / 3
    tab_h = size * 0.42
    tab_top = size * 0.10
    radius = max(1, round(size * 0.10))

    for i, color in enumerate(TAB_COLORS):
        x0 = pad + i * (tab_w + gap)
        y0 = tab_top
        x1 = x0 + tab_w
        y1 = tab_top + tab_h
        d.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=color)

    # Скобка группы снизу, охватывающая все три вкладки — как у нативных
    # групп вкладок Firefox.
    bx0 = pad * 0.6
    bx1 = size - pad * 0.6
    by0 = tab_top + tab_h + gap
    by1 = size - pad * 0.6
    bracket_w = max(1, round(size * 0.09))
    b_radius = max(1, round(size * 0.14))
    d.rounded_rectangle(
        [bx0, by0, bx1, by1], radius=b_radius, outline=BRACKET_COLOR, width=bracket_w
    )

    return img


for s in SIZES:
    icon = draw_icon(s)
    icon.save(f"icons/icon-{s}.png")

print("done")
