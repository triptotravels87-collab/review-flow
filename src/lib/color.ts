export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [15, 118, 110];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

/** White or near-black, whichever has better WCAG contrast on `hex`. */
export function readableTextOn(hex: string): "#ffffff" | "#0f172a" {
  const L = luminance(hexToRgb(hex));
  const onWhite = 1.05 / (L + 0.05);
  const onDark = (L + 0.05) / (luminance([15, 23, 42]) + 0.05);
  return onWhite >= onDark ? "#ffffff" : "#0f172a";
}
