import { DisplayObject } from './objects.js';
import { colorToRgba } from './color.js';

export class Graphics extends DisplayObject {
  constructor() {
    super(0, 0);
    this.commands = [];
    this._textures = null; // injected by the add.graphics factory
  }

  clear() { this.commands = [{ op: 'clear' }]; return this; }
  fillStyle(color, alpha = 1) { this.commands.push({ op: 'fillStyle', color, alpha }); return this; }
  lineStyle(width, color, alpha = 1) { this.commands.push({ op: 'lineStyle', width, color, alpha }); return this; }
  fillCircle(x, y, r) { this.commands.push({ op: 'fillCircle', x, y, r }); return this; }
  strokeCircle(x, y, r) { this.commands.push({ op: 'strokeCircle', x, y, r }); return this; }
  fillRoundedRect(x, y, w, h, radius) { this.commands.push({ op: 'fillRoundedRect', x, y, w, h, radius }); return this; }
  strokeRoundedRect(x, y, w, h, radius) { this.commands.push({ op: 'strokeRoundedRect', x, y, w, h, radius }); return this; }
  lineBetween(x1, y1, x2, y2) { this.commands.push({ op: 'lineBetween', x1, y1, x2, y2 }); return this; }
  beginPath() { this.commands.push({ op: 'beginPath' }); return this; }
  moveTo(x, y) { this.commands.push({ op: 'moveTo', x, y }); return this; }
  lineTo(x, y) { this.commands.push({ op: 'lineTo', x, y }); return this; }
  arc(x, y, r, a0, a1, acw = false) { this.commands.push({ op: 'arc', x, y, r, a0, a1, acw }); return this; }
  strokePath() { this.commands.push({ op: 'strokePath' }); return this; }

  // Replay the command buffer into a 2D context. Used by the renderer (each
  // frame) and by generateTexture (once, onto an offscreen canvas).
  replay(ctx) {
    let fill = 'rgba(0,0,0,1)';
    let stroke = 'rgba(0,0,0,1)';
    for (const c of this.commands) {
      switch (c.op) {
        case 'clear': break;
        case 'fillStyle': fill = colorToRgba(c.color, c.alpha); break;
        case 'lineStyle': ctx.lineWidth = c.width; stroke = colorToRgba(c.color, c.alpha); break;
        case 'fillCircle': ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); break;
        case 'strokeCircle': ctx.strokeStyle = stroke; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke(); break;
        case 'fillRoundedRect': ctx.fillStyle = fill; roundRect(ctx, c.x, c.y, c.w, c.h, c.radius); ctx.fill(); break;
        case 'strokeRoundedRect': ctx.strokeStyle = stroke; roundRect(ctx, c.x, c.y, c.w, c.h, c.radius); ctx.stroke(); break;
        case 'lineBetween': ctx.strokeStyle = stroke; ctx.beginPath(); ctx.moveTo(c.x1, c.y1); ctx.lineTo(c.x2, c.y2); ctx.stroke(); break;
        case 'beginPath': ctx.beginPath(); break;
        case 'moveTo': ctx.moveTo(c.x, c.y); break;
        case 'lineTo': ctx.lineTo(c.x, c.y); break;
        case 'arc': ctx.arc(c.x, c.y, c.r, c.a0, c.a1, c.acw); break;
        case 'strokePath': ctx.strokeStyle = stroke; ctx.stroke(); break;
        default: break;
      }
    }
  }

  generateTexture(key, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    this.replay(canvas.getContext('2d'));
    if (this._textures) this._textures.register(key, canvas, w, h);
    return this;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
