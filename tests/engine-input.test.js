import { describe, it, expect } from 'vitest';
import { clientToGame } from '../src/engine/InputManager.js';

describe('clientToGame', () => {
  it('maps a client point through the canvas rect into 720-space', () => {
    const rect = { left: 10, top: 20, width: 360, height: 360 };
    expect(clientToGame(190, 200, rect, 720)).toEqual({ x: 360, y: 360 });
  });

  it('maps the top-left corner to the origin', () => {
    const rect = { left: 10, top: 20, width: 360, height: 360 };
    expect(clientToGame(10, 20, rect, 720)).toEqual({ x: 0, y: 0 });
  });
});
