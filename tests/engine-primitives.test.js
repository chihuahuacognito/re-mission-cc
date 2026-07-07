import { describe, it, expect } from 'vitest';
import { colorToRgba } from '../src/engine/color.js';
import { distanceBetween } from '../src/engine/geometry.js';

describe('colorToRgba', () => {
  it('converts 0xRRGGBB + alpha to an rgba() string', () => {
    expect(colorToRgba(0xff0000, 1)).toBe('rgba(255,0,0,1)');
    expect(colorToRgba(0x00ff00, 0.5)).toBe('rgba(0,255,0,0.5)');
    expect(colorToRgba(0x7fe7ff)).toBe('rgba(127,231,255,1)');
  });
});

describe('distanceBetween', () => {
  it('is the euclidean distance', () => {
    expect(distanceBetween(0, 0, 3, 4)).toBe(5);
    expect(distanceBetween(10, 10, 10, 10)).toBe(0);
  });
});
