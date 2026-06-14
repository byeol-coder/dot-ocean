import { SPECIES, PLAYER_SPECIES, byKey, type Species } from '../data/species';

export interface GameStats {
  level: number; xp: number; xpNext: number; sizeFactor: number;
  discovered: number; total: number;
}
export interface GameCallbacks {
  onStats: (s: GameStats) => void;
  onDiscover: (key: string) => void;
  onFocus: (key: string | null) => void;
  onEvent: (kind: 'eat' | 'levelup' | 'danger', key: string, level?: number) => void;
}
export interface GameOpts {
  reducedMotion: () => boolean;
  highContrast: () => boolean;
  paused: () => boolean;
}

interface Npc { s: Species; x: number; y: number; vx: number; vy: number; phase: number; warn: number; dead?: boolean; }
interface Particle { x: number; y: number; v: number; r: number; }
interface Coral { x: number; h: number; hue: number; arms: number; }

const W = 1000, H = 640;
const TOTAL = SPECIES.length;

export class OceanGame {
  private ctx: CanvasRenderingContext2D;
  private opts: GameOpts;
  private cb: GameCallbacks;
  private raf = 0;
  private last = 0;
  private running = false;

  private px = W / 2; private py = H / 2; private pvx = 0; private pvy = 0; private pdir = 1;
  private level = 1; private xp = 0; private sizeFactor = 1;
  private npcs: Npc[] = [];
  private particles: Particle[] = [];
  private corals: Coral[] = [];
  private discovered = new Set<string>();
  private keys: Record<string, boolean> = {};
  private pointer: { x: number; y: number } | null = null;
  private focusKey: string | null = null;
  private focusTimer = 0;
  private statTick = 0;

  constructor(canvas: HTMLCanvasElement, opts: GameOpts, cb: GameCallbacks) {
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('2D context unavailable');
    this.ctx = c;
    this.opts = opts; this.cb = cb;
    for (let i = 0; i < 46; i++) this.particles.push({ x: Math.random() * W, y: Math.random() * H, v: 6 + Math.random() * 16, r: 0.6 + Math.random() * 1.8 });
    const hues = [285, 195, 320, 160, 265];
    for (let i = 0; i < 7; i++) this.corals.push({ x: 40 + i * 150 + Math.random() * 40, h: 60 + Math.random() * 90, hue: hues[i % hues.length], arms: 3 + Math.floor(Math.random() * 3) });
    for (let i = 0; i < 6; i++) this.spawn();
  }

  start(): void { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); }
  stop(): void { this.running = false; cancelAnimationFrame(this.raf); }

  setKey(k: string, down: boolean): void { this.keys[k] = down; }
  setPointer(p: { x: number; y: number } | null): void { this.pointer = p; }
  scanNearest(): void {
    let best: Npc | null = null; let bd = 1e9;
    for (const n of this.npcs) { const d = Math.hypot(n.x - this.px, n.y - this.py); if (d < bd) { bd = d; best = n; } }
    if (best && bd < 260) { this.focus(best.s.key); if (!this.discovered.has(best.s.key)) this.discover(best.s.key); }
  }

  private playerPower(): number { return PLAYER_SPECIES.sizeCm * this.sizeFactor; }
  private npcPower(n: Npc): number { return n.s.sizeCm; }
  private xpNext(): number { return 200 + (this.level - 1) * 160; }

  private pickSpecies(): Species {
    // weight by rarity, bias toward tiers near the player's power band
    const power = this.playerPower();
    const weighted: Species[] = [];
    for (const s of SPECIES) {
      let w = s.rarity === 'common' ? 5 : s.rarity === 'uncommon' ? 3 : s.rarity === 'rare' ? 2 : 1;
      // favour creatures roughly comparable or a bit larger so the food chain stays interesting
      const ratio = s.sizeCm / power;
      if (ratio > 0.15 && ratio < 3) w += 2;
      if (ratio >= 3) w = Math.max(1, w - 2);
      for (let i = 0; i < w; i++) weighted.push(s);
    }
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  private spawn(): void {
    const s = this.pickSpecies();
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (edge === 0) { x = -40; y = Math.random() * H; }
    else if (edge === 1) { x = W + 40; y = Math.random() * H; }
    else if (edge === 2) { x = Math.random() * W; y = -40; }
    else { x = Math.random() * W; y = H + 40; }
    const ang = Math.atan2(this.py - y, this.px - x) + (Math.random() - 0.5);
    const sp = s.speed;
    this.npcs.push({ s, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, phase: Math.random() * 7, warn: 0 });
  }

  private radius(sizeCm: number, factor = 1): number { return 16 + Math.sqrt(sizeCm * factor) * 4.2; }

  private discover(key: string): void {
    if (this.discovered.has(key)) return;
    this.discovered.add(key);
    this.cb.onDiscover(key);
  }
  private focus(key: string | null): void {
    if (this.focusKey === key) { if (key) this.focusTimer = 4.5; return; }
    this.focusKey = key; this.focusTimer = key ? 4.5 : 0; this.cb.onFocus(key);
  }

  private eat(n: Npc): void {
    const gain = Math.round(this.npcPower(n) * 0.6) + 8;
    this.xp += gain;
    this.cb.onEvent('eat', n.s.key);
    if (!this.discovered.has(n.s.key)) this.discover(n.s.key);
    while (this.xp >= this.xpNext()) {
      this.xp -= this.xpNext();
      this.level += 1;
      this.sizeFactor *= 1.13;
      this.cb.onEvent('levelup', PLAYER_SPECIES.key, this.level);
    }
  }

  private update(dt: number): void {
    const rm = this.opts.reducedMotion();
    // input
    const acc = 1100;
    if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) this.pvx -= acc * dt;
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) this.pvx += acc * dt;
    if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) this.pvy -= acc * dt;
    if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) this.pvy += acc * dt;
    if (this.pointer) {
      const a = Math.atan2(this.pointer.y - this.py, this.pointer.x - this.px);
      const d = Math.hypot(this.pointer.x - this.px, this.pointer.y - this.py);
      const f = Math.min(1, d / 120);
      this.pvx += Math.cos(a) * acc * 0.6 * dt * f;
      this.pvy += Math.sin(a) * acc * 0.6 * dt * f;
    }
    const drag = Math.pow(0.0006, dt);
    this.pvx *= drag; this.pvy *= drag;
    const maxv = 420 / Math.sqrt(this.sizeFactor);
    const sp = Math.hypot(this.pvx, this.pvy);
    if (sp > maxv) { this.pvx *= maxv / sp; this.pvy *= maxv / sp; }
    this.px = Math.max(24, Math.min(W - 24, this.px + this.pvx * dt));
    this.py = Math.max(24, Math.min(H - 24, this.py + this.pvy * dt));
    if (this.pvx > 8) this.pdir = 1; else if (this.pvx < -8) this.pdir = -1;

    // spawn control
    if (this.npcs.length < 9 && Math.random() < dt * 1.4) this.spawn();

    const pr = this.radius(PLAYER_SPECIES.sizeCm, this.sizeFactor);
    const pPow = this.playerPower();
    let nearest: Npc | null = null; let nd = 1e9;

    for (const n of this.npcs) {
      // wander toward gentle direction with slight noise
      if (!rm) { n.phase += dt * 2; n.vy += Math.sin(n.phase) * 4 * dt; }
      const nsp = n.s.speed * 60;
      const cur = Math.hypot(n.vx, n.vy) || 1;
      n.vx = (n.vx / cur) * nsp; n.vy = (n.vy / cur) * nsp;
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.warn > 0) n.warn -= dt;
      if (n.x < -80 || n.x > W + 80 || n.y < -80 || n.y > H + 80) { n.x = (n.x + W + 160) % (W + 160) - 80; }

      const d = Math.hypot(n.x - this.px, n.y - this.py);
      const nr = this.radius(n.s.sizeCm);
      if (d < pr + nr * 0.55) {
        const dangerous = n.s.danger >= 2 || this.npcPower(n) > pPow * 0.95;
        if (!dangerous && pPow > this.npcPower(n)) {
          n.dead = true;
          this.eat(n);
          continue;
        } else if (dangerous) {
          const a = Math.atan2(this.py - n.y, this.px - n.x);
          this.pvx += Math.cos(a) * 260; this.pvy += Math.sin(a) * 260;
          if (n.warn <= 0) { n.warn = 1.6; this.cb.onEvent('danger', n.s.key); }
        }
      }
      if (d < nd) { nd = d; nearest = n; }
    }
    this.npcs = this.npcs.filter((n) => !n.dead);

    // focus / discovery on proximity
    const focusR = 175;
    if (nearest && nd < focusR) {
      this.focus(nearest.s.key);
      if (!this.discovered.has(nearest.s.key)) {
        this.focusTimer = 4.5;
        this.discover(nearest.s.key);
      }
    } else {
      if (this.focusTimer > 0) { this.focusTimer -= dt; if (this.focusTimer <= 0) this.focus(null); }
    }

    // particles
    for (const p of this.particles) {
      if (!rm) p.y -= p.v * dt;
      if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
    }

    // stats throttle (4Hz)
    this.statTick += dt;
    if (this.statTick > 0.25) {
      this.statTick = 0;
      this.cb.onStats({ level: this.level, xp: Math.round(this.xp), xpNext: this.xpNext(), sizeFactor: this.sizeFactor, discovered: this.discovered.size, total: TOTAL });
    }
  }

  // ---------- rendering ----------
  private bg(): void {
    const hc = this.opts.highContrast();
    const c = this.ctx;
    if (hc) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); return; }
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a2746'); g.addColorStop(0.45, '#061a30'); g.addColorStop(1, '#020a14');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // light shafts
    c.save(); c.globalAlpha = this.opts.reducedMotion() ? 0.05 : 0.08;
    c.fillStyle = '#6fe6ff';
    for (let i = 0; i < 3; i++) { const x = 150 + i * 320; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 70, 0); c.lineTo(x + 200, H); c.lineTo(x + 130, H); c.closePath(); c.fill(); }
    c.restore();
  }
  private drawCorals(): void {
    const c = this.ctx; const hc = this.opts.highContrast();
    for (const co of this.corals) {
      c.save(); c.translate(co.x, H);
      c.strokeStyle = hc ? '#fff' : `hsl(${co.hue} 90% 65%)`;
      c.shadowColor = hc ? 'transparent' : `hsl(${co.hue} 90% 60%)`; c.shadowBlur = hc ? 0 : 10;
      c.lineWidth = 3; c.lineCap = 'round';
      for (let a = 0; a < co.arms; a++) {
        const ang = -Math.PI / 2 + (a - (co.arms - 1) / 2) * 0.5;
        c.beginPath(); c.moveTo(0, 0);
        c.quadraticCurveTo(Math.cos(ang) * co.h * 0.5, -co.h * 0.6, Math.cos(ang) * co.h * 0.8, -co.h);
        c.stroke();
      }
      c.restore();
    }
  }
  private drawParticles(): void {
    const c = this.ctx; const hc = this.opts.highContrast();
    c.save(); c.fillStyle = hc ? '#7fffd0' : 'rgba(150,230,255,0.5)';
    for (const p of this.particles) { c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
    c.restore();
  }
  private drawCreature(s: Species, x: number, y: number, dir: number, factor: number, known: boolean, focused: boolean, phase: number): void {
    const c = this.ctx; const hc = this.opts.highContrast(); const rm = this.opts.reducedMotion();
    const r = this.radius(s.sizeCm, factor);
    const rx = r * s.bodyRx, ry = r * s.bodyRy;
    const hue = s.hue;
    const col = hc ? (s.danger >= 2 ? '#ff5d6c' : '#7fffd0') : `hsl(${hue} 85% 65%)`;
    const dim = !known;
    c.save(); c.translate(x, y); c.scale(dir, 1);
    if (!hc) { c.shadowColor = dim ? 'rgba(120,160,190,0.5)' : `hsl(${hue} 90% 60%)`; c.shadowBlur = dim ? 8 : (focused ? 26 : 16); }
    // body
    const grad = c.createRadialGradient(-rx * 0.2, -ry * 0.2, 1, 0, 0, rx);
    if (dim) { grad.addColorStop(0, 'rgba(120,150,180,0.85)'); grad.addColorStop(1, 'rgba(60,90,120,0.35)'); }
    else { grad.addColorStop(0, hc ? col : `hsl(${hue} 90% 78%)`); grad.addColorStop(1, hc ? col : `hsl(${hue} 80% 45%)`); }
    c.fillStyle = grad;
    if (s.key === 'jellyfish') {
      const pulse = rm ? 1 : 1 + Math.sin(phase * 2) * 0.08;
      c.beginPath(); c.ellipse(0, -ry * 0.2, rx, ry * pulse, 0, Math.PI, 0); c.fill();
      c.strokeStyle = dim ? 'rgba(120,150,180,0.6)' : col; c.lineWidth = 2;
      for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * rx * 0.4, ry * 0.4); c.quadraticCurveTo(k * rx * 0.4 + (rm ? 0 : Math.sin(phase + k) * 6), ry * 1.2, k * rx * 0.4, ry * 1.8); c.stroke(); }
    } else if (s.key === 'octopus') {
      c.beginPath(); c.ellipse(0, -ry * 0.3, rx, ry, 0, 0, 7); c.fill();
      c.strokeStyle = dim ? 'rgba(120,150,180,0.7)' : col; c.lineWidth = 3;
      for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(k * rx * 0.28, ry * 0.5); c.quadraticCurveTo(k * rx * 0.3, ry * 1.4, k * rx * 0.4 + (rm ? 0 : Math.sin(phase + k) * 5), ry * 1.9); c.stroke(); }
    } else if (s.key === 'turtle') {
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(rx * 0.95, 0, ry * 0.4, ry * 0.4, 0, 0, 7); c.fill(); // head
      c.fillStyle = dim ? 'rgba(100,130,160,0.6)' : `hsl(${hue} 70% 55%)`;
      [[-1, -1], [-1, 1], [0.4, -1], [0.4, 1]].forEach(([fx, fy]) => { c.beginPath(); c.ellipse(rx * 0.5 * fx, ry * 1.0 * fy, ry * 0.5, ry * 0.3, 0, 0, 7); c.fill(); });
    } else {
      // generic fish: body + tail + dorsal
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill();
      c.beginPath(); c.moveTo(rx * 0.7, 0); c.lineTo(rx * 1.5, -ry * 1.0); c.lineTo(rx * 1.5, ry * 1.0); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-rx * 0.1, -ry * 0.8); c.lineTo(rx * 0.4, -ry * 1.5); c.lineTo(rx * 0.5, -ry * 0.7); c.closePath(); c.fill();
    }
    // sparkle dots on dotfish/known
    if (!dim && (s.key === 'dotfish' || known)) {
      c.shadowBlur = 0; c.fillStyle = hc ? '#fff' : 'rgba(220,255,255,0.9)';
      const dots = s.key === 'dotfish' ? 7 : 3;
      for (let i = 0; i < dots; i++) { const a = (i / dots) * 6.28; c.beginPath(); c.arc(Math.cos(a) * rx * 0.5, Math.sin(a) * ry * 0.4, 1.4, 0, 7); c.fill(); }
    }
    // eye
    if (s.key !== 'jellyfish' && s.key !== 'plankton') { c.shadowBlur = 0; c.fillStyle = '#04121f'; c.beginPath(); c.arc(-rx * 0.45, -ry * 0.2, Math.max(2, ry * 0.18), 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-rx * 0.5, -ry * 0.28, 1.2, 0, 7); c.fill(); }
    c.restore();
    // unknown marker + focus ring (screen space, not flipped)
    if (dim) { c.save(); c.fillStyle = '#bcd6e6'; c.font = 'bold 18px Pretendard, sans-serif'; c.textAlign = 'center'; c.fillText('?', x, y - ry - 8); c.restore(); }
    if (focused) { c.save(); c.strokeStyle = hc ? '#fff' : 'rgba(127,230,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r * Math.max(s.bodyRx, s.bodyRy) + 8, 0, 7); c.stroke(); c.restore(); }
  }

  private render(): void {
    const c = this.ctx; const hc = this.opts.highContrast();
    this.bg();
    this.drawParticles();
    this.drawCorals();
    for (const n of this.npcs) this.drawCreature(n.s, n.x, n.y, n.vx >= 0 ? 1 : -1, 1, this.discovered.has(n.s.key), this.focusKey === n.s.key && Math.hypot(n.x - this.px, n.y - this.py) < 175, n.phase);
    // player
    this.drawCreature(PLAYER_SPECIES, this.px, this.py, this.pdir, this.sizeFactor, true, false, 0);
    // player focus ring + Lv label
    const pr = this.radius(PLAYER_SPECIES.sizeCm, this.sizeFactor);
    c.save();
    c.strokeStyle = hc ? '#fff' : 'rgba(120,220,255,0.55)'; c.lineWidth = 2;
    c.beginPath(); c.arc(this.px, this.py, pr * PLAYER_SPECIES.bodyRx + 10, 0, 7); c.stroke();
    c.fillStyle = hc ? '#fff' : '#9fe9ff'; c.font = 'bold 14px Pretendard, sans-serif'; c.textAlign = 'center';
    c.fillText('Lv.' + this.level, this.px, this.py - pr - 14);
    c.beginPath(); c.moveTo(this.px - 5, this.py - pr - 8); c.lineTo(this.px + 5, this.py - pr - 8); c.lineTo(this.px, this.py - pr - 3); c.closePath(); c.fillStyle = hc ? '#fff' : '#f5b942'; c.fill();
    c.restore();
  }

  private loop = (t: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
    if (!this.opts.paused()) this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  // expose current focus species text helper
  focusedKey(): string | null { return this.focusKey; }
  speciesOf(key: string): Species { return byKey[key]; }
}
