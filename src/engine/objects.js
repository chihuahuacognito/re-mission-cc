let SEQ = 0;

export class DisplayObject {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.depth = 0;
    this.alpha = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.visible = true;
    this.originX = 0.5;
    this.originY = 0.5;
    this.destroyed = false;
    this.seq = SEQ++;
    this._onDestroy = null;
  }

  setDepth(d) { this.depth = d; return this; }
  setAlpha(a) { this.alpha = a; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; }
  setVisible(v) { this.visible = v; return this; }

  // scale is an alias over the canonical scaleX/scaleY (spec: single source).
  get scale() { return this.scaleX; }
  set scale(v) { this.scaleX = v; this.scaleY = v; }

  destroy() {
    this.destroyed = true;
    if (this._onDestroy) this._onDestroy(this);
  }
}

export class Image extends DisplayObject {
  constructor(x, y, key, frameWidth, frameHeight) {
    super(x, y);
    this.key = key;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
  }

  // Our only setTexture use (cancer -> cancerCracked) keeps the same 96x96
  // frame, so display size is preserved; frame stays as constructed.
  setTexture(key) { this.key = key; return this; }

  setDisplaySize(w, h) {
    this.scaleX = w / this.frameWidth;
    this.scaleY = h / this.frameHeight;
    return this;
  }

  get displayWidth() { return this.frameWidth * this.scaleX; }
  set displayWidth(v) { this.scaleX = v / this.frameWidth; }
  get displayHeight() { return this.frameHeight * this.scaleY; }
  set displayHeight(v) { this.scaleY = v / this.frameHeight; }
}

export class Text extends DisplayObject {
  constructor(x, y, text, style) {
    super(x, y);
    this.originX = 0; // Phaser Text default origin is top-left.
    this.originY = 0;
    this.text = String(text);
    this.style = style || {};
  }

  setText(str) { this.text = String(str); return this; }
}

export class Circle extends DisplayObject {
  constructor(x, y, radius, fillColor, fillAlpha = 1) {
    super(x, y);
    this.radius = radius;
    this.fillColor = fillColor;
    this.fillAlpha = fillAlpha; // distinct from the object's alpha
  }
}
