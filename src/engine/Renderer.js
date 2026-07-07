import { Image, Text, Circle } from './objects.js';
import { Graphics } from './Graphics.js';
import { colorToRgba } from './color.js';

export class Renderer {
  constructor(ctx, textures, size = 720) {
    this._ctx = ctx;
    this._textures = textures;
    this._size = size;
  }

  render(displayList, camera) {
    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._size, this._size);
    ctx.save();
    if (camera) ctx.translate(camera.offsetX, camera.offsetY);

    const list = displayList
      .filter((o) => !o.destroyed && o.visible)
      .sort((a, b) => (a.depth - b.depth) || (a.seq - b.seq));

    for (const o of list) {
      ctx.save();
      ctx.globalAlpha = o.alpha;
      if (o instanceof Image) this._image(ctx, o);
      else if (o instanceof Circle) this._circle(ctx, o);
      else if (o instanceof Text) this._text(ctx, o);
      else if (o instanceof Graphics) this._graphics(ctx, o);
      ctx.restore();
    }
    ctx.restore();
  }

  _image(ctx, o) {
    const tex = this._textures.get(o.key);
    if (!tex) return;
    const dw = o.displayWidth;
    const dh = o.displayHeight;
    ctx.drawImage(tex.canvas, o.x - dw * o.originX, o.y - dh * o.originY, dw, dh);
  }

  _circle(ctx, o) {
    ctx.globalAlpha = o.alpha * o.fillAlpha;
    ctx.fillStyle = colorToRgba(o.fillColor, 1);
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  _graphics(ctx, o) {
    ctx.translate(o.x, o.y);
    ctx.scale(o.scaleX, o.scaleY);
    o.replay(ctx);
  }

  _text(ctx, o) {
    const s = o.style || {};
    const size = parseInt(s.fontSize || '16px', 10);
    const family = s.fontFamily || 'sans-serif';
    const weight = s.fontStyle ? `${s.fontStyle} ` : '';
    ctx.font = `${weight}${size}px ${family}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const lines = o.text.split('\n');
    const lineH = Math.round(size * 1.2);
    let maxW = 0;
    for (const ln of lines) maxW = Math.max(maxW, ctx.measureText(ln).width);
    const blockW = maxW;
    const blockH = lineH * lines.length;

    // Origin applies to the whole block.
    const left = o.x - blockW * o.originX;
    const top = o.y - blockH * o.originY;

    if (s.backgroundColor) {
      const px = (s.padding && s.padding.x) || 0;
      const py = (s.padding && s.padding.y) || 0;
      ctx.fillStyle = s.backgroundColor;
      ctx.fillRect(left - px, top - py, blockW + px * 2, blockH + py * 2);
    }

    ctx.fillStyle = s.color || '#ffffff';
    lines.forEach((ln, i) => {
      const w = ctx.measureText(ln).width;
      // Align each line inside the block by origin: 0 = left, 0.5 = centre, 1 = right.
      const drawX = left + (blockW - w) * o.originX;
      ctx.fillText(ln, drawX, top + i * lineH);
    });
  }
}
