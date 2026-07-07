import { describe, it, expect } from 'vitest';
import { Camera } from '../src/engine/Camera.js';

describe('Camera shake', () => {
  it('offset stays within intensity*width while shaking, zero when idle', () => {
    const cam = new Camera({ width: 720, rand: () => 1 });
    expect(cam.offsetX).toBe(0);
    cam.shake(100, 0.01);
    cam.update(16);
    expect(Math.abs(cam.offsetX)).toBeLessThanOrEqual(0.01 * 720 + 1e-9);
    expect(Math.abs(cam.offsetY)).toBeLessThanOrEqual(0.01 * 720 + 1e-9);
  });

  it('resets to zero after the duration elapses', () => {
    const cam = new Camera({ width: 720, rand: () => 1 });
    cam.shake(100, 0.01);
    cam.update(200);
    expect(cam.offsetX).toBe(0);
    expect(cam.offsetY).toBe(0);
  });

  it('exposes itself as .main for cameras.main.shake', () => {
    const cam = new Camera();
    expect(cam.main).toBe(cam);
  });
});
