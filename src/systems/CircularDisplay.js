// Renders the game inside a round "porthole" so it fits a circular robot display.
// Content lives inside the safe circle; everything outside the visible circle is
// covered so the canvas reads as a true circle on a round screen.
export const DISPLAY = { size: 720, cx: 360, cy: 360, radius: 352, safe: 330 };

export function applyCircularChrome(scene, pageColor = 0x05060f) {
  const { cx, cy, radius } = DISPLAY;

  // Warm luminous background inside the circle (texture generated in BootScene).
  scene.add.image(cx, cy, 'bgGlow').setDepth(-10);

  // Above ALL content: cover the corners (outside the circle) + draw a glowing rim.
  const chrome = scene.add.graphics().setDepth(3000);
  // Annulus in the page color, from the circle edge outward past the corners.
  chrome.lineStyle(340, pageColor, 1);
  chrome.strokeCircle(cx, cy, radius + 170);
  // Glowing rim: soft outer glow -> crisp inner edge.
  chrome.lineStyle(12, 0x7fe7ff, 0.10); chrome.strokeCircle(cx, cy, radius);
  chrome.lineStyle(6, 0x7fe7ff, 0.20); chrome.strokeCircle(cx, cy, radius);
  chrome.lineStyle(2, 0xbdf3ff, 0.85); chrome.strokeCircle(cx, cy, radius);
  return chrome;
}
