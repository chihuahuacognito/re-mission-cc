// Convert a Phaser-style 0xRRGGBB integer + alpha into a CSS rgba() string.
export function colorToRgba(colorInt, alpha = 1) {
  const r = (colorInt >> 16) & 0xff;
  const g = (colorInt >> 8) & 0xff;
  const b = colorInt & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
