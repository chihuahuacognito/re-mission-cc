import { describe, it, expect } from 'vitest';
import { DisplayObject, Image, Text, Circle } from '../src/engine/objects.js';

describe('Image sizing — single source of truth', () => {
  it('setDisplaySize sets scale from the native frame size', () => {
    const img = new Image(0, 0, 'k', 64, 64);
    img.setDisplaySize(32, 32);
    expect(img.scaleX).toBe(0.5);
    expect(img.displayWidth).toBe(32);
    expect(img.scale).toBe(0.5);
  });

  it('displayWidth and scale round-trip through the same state', () => {
    const img = new Image(0, 0, 'k', 96, 96);
    img.displayWidth = 48;               // set via displayWidth
    expect(img.scaleX).toBe(0.5);
    img.scale = 2;                        // set via scale → both axes
    expect(img.displayWidth).toBe(192);
    expect(img.displayHeight).toBe(192);
  });

  it('setTexture changes the key', () => {
    const img = new Image(0, 0, 'a', 96, 96).setTexture('b');
    expect(img.key).toBe('b');
  });
});

describe('origins', () => {
  it('Image and Circle default to centre; Text to top-left', () => {
    expect(new Image(0, 0, 'k', 10, 10).originX).toBe(0.5);
    expect(new Circle(0, 0, 5, 0xffffff).originX).toBe(0.5);
    const t = new Text(0, 0, 'hi', {});
    expect(t.originX).toBe(0);
    expect(t.originY).toBe(0);
  });
});

describe('destroy', () => {
  it('flags destroyed and fires the onDestroy hook', () => {
    let hit = null;
    const o = new DisplayObject(1, 2);
    o._onDestroy = (self) => { hit = self; };
    o.destroy();
    expect(o.destroyed).toBe(true);
    expect(hit).toBe(o);
  });

  it('gives every object a monotonic seq', () => {
    const a = new DisplayObject();
    const b = new DisplayObject();
    expect(b.seq).toBeGreaterThan(a.seq);
  });
});

describe('Circle fillAlpha is distinct from alpha', () => {
  it('keeps the ctor fill alpha separate from the object alpha', () => {
    const c = new Circle(0, 0, 4, 0xff0000, 0.9);
    expect(c.fillAlpha).toBe(0.9);
    expect(c.alpha).toBe(1);
  });
});
