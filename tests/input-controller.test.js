import { describe, it, expect } from 'vitest';
import { InputController } from '../src/input/InputController.js';

function fakeSource() {
  const state = { x: 0, y: 0, down: false };
  return {
    state,
    getPosition: () => ({ x: state.x, y: state.y }),
    isDown: () => state.down,
  };
}

describe('InputController', () => {
  it('samples pointer position on update', () => {
    const src = fakeSource();
    const input = new InputController(src);
    src.state.x = 100; src.state.y = 42;
    input.update();
    expect(input.pointer).toEqual({ x: 100, y: 42 });
  });

  it('detects rising and falling edges only once per transition', () => {
    const src = fakeSource();
    const input = new InputController(src);

    input.update();
    expect(input.justPressed()).toBe(false);

    src.state.down = true;
    input.update();
    expect(input.justPressed()).toBe(true);
    expect(input.held).toBe(true);

    input.update();
    expect(input.justPressed()).toBe(false); // still held, not a new press

    src.state.down = false;
    input.update();
    expect(input.justReleased()).toBe(true);
    input.update();
    expect(input.justReleased()).toBe(false);
  });
});
