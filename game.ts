import * as THREE from 'three';
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

const WX = 60, WY = 34, WZ = 16;
const CAM_Z = 86;
const TOTAL = SPECIES.length;
const MAX_NPC = 12;

const tmpC = new THREE.Color();

function worldRadius(sizeCm: number, factor = 1): number {
  return 1.4 + Math.sqrt(sizeCm * factor) * 0.46;
}
function behaviorMul(b: Species['behavior']): number {
  return b === 'small' ? 1.5 : b === 'school' ? 1.2 : b === 'large' ? 0.7 : b === 'lurk' ? 0.45 : 0.5;
}

// ---- shared textures ----
function radialTexture(r1: number, g1: number, b1: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r1},${g1},${b1},0.9)`);
  grad.addColorStop(0.4, `rgba(${r1},${g1},${b1},0.32)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return t;
}
function shaftTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(150,235,255,0.55)');
  g.addColorStop(0.5, 'rgba(110,210,255,0.18)');
  g.addColorStop(1, 'rgba(80,180,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}
function caveTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#020912'; ctx.fillRect(0, 0, 512, 512);
  const g = ctx.createRadialGradient(330, 250, 20, 330, 250, 240);
  g.addColorStop(0, 'rgba(40,120,180,0.55)');
  g.addColorStop(0.45, 'rgba(20,70,120,0.22)');
  g.addColorStop(1, 'rgba(2,9,18,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(c);
}

interface View {
  group: THREE.Group;
  tail?: THREE.Object3D;
  appendages: THREE.Object3D[];
  glow: THREE.Sprite;
  ring: THREE.Mesh;
  bodyMats: THREE.MeshStandardMaterial[];
  unknownMark?: THREE.Sprite;
  pulse: boolean;
  setKnown: (known: boolean) => void;
}
interface Npc {
  s: Species; pos: THREE.Vector3; vel: THREE.Vector3;
  heading: number; phase: number; warn: number; dir: number;
  targetTimer: number; school: number; dead?: boolean; view: View;
}

export class OceanGame {
  private opts: GameOpts; private cb: GameCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private raf = 0; private last = 0; private running = false; private t = 0;

  private player!: { mesh: THREE.Group; label: THREE.Sprite; ring: THREE.Mesh; bodyMats: THREE.MeshStandardMaterial[]; tail: THREE.Object3D };
  private px = 0; private py = 0; private pvx = 0; private pvy = 0; private pdir = 1; private pdirCur = 0;
  private level = 1; private xp = 0; private sizeFactor = 1; private labelLevel = -1;

  private npcs: Npc[] = [];
  private discovered = new Set<string>();
  private keys: Record<string, boolean> = {};
  private pointer: { x: number; y: number } | null = null;
  private focusKey: string | null = null; private focusTimer = 0; private statTick = 0;
  private camFocus = new THREE.Vector3();

  private water!: THREE.Mesh; private waterMat!: THREE.ShaderMaterial;
  private particles!: THREE.Points; private shafts: THREE.Mesh[] = [];
  private glowTex = radialTexture(180, 240, 255);

  constructor(canvas: HTMLCanvasElement, opts: GameOpts, cb: GameCallbacks) {
    this.canvas = canvas; this.opts = opts; this.cb = cb;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x041220, 1);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 420);
    this.camera.position.set(0, 4, CAM_Z);
    this.scene.fog = new THREE.FogExp2(0x041523, 0.0062);

    this.buildLights();
    this.buildWater();
    this.buildEnvironment();
    this.buildParticles();
    this.buildPlayer();
    for (let i = 0; i < 4; i++) this.spawn(true);
    this.resize();
  }

  // ---------- build ----------
  private buildLights(): void {
    this.scene.add(new THREE.AmbientLight(0x335577, 0.7));
    const d = new THREE.DirectionalLight(0xbfe9ff, 0.85); d.position.set(0.3, 1, 0.4); this.scene.add(d);
    const p = new THREE.PointLight(0x39d6ff, 0.6, 160); p.position.set(0, 6, 30); this.scene.add(p);
  }

  private buildWater(): void {
    const geo = new THREE.PlaneGeometry(320, 280, 90, 80);
    this.waterMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color(0x07314f) },
        uShallow: { value: new THREE.Color(0x4fd6ff) },
        uOpacity: { value: 0.4 },
      },
      vertexShader: `
        uniform float uTime; varying float vH;
        vec3 gerstner(vec2 p, vec2 dir, float steep, float wl, float speed, float t){
          float k = 6.2831853/wl; float c = sqrt(9.8/k); vec2 d = normalize(dir);
          float f = k*dot(d,p) - c*speed*t; float a = steep/k;
          return vec3(d.x*(a*cos(f)), a*sin(f), d.y*(a*cos(f)));
        }
        void main(){
          vec2 g = vec2(position.x, position.y); vec3 o = vec3(0.0);
          o += gerstner(g, vec2(1.0,0.3), 0.30, 30.0, 1.0, uTime);
          o += gerstner(g, vec2(-0.4,1.0), 0.24, 18.0, 0.9, uTime);
          o += gerstner(g, vec2(0.7,-0.6), 0.16, 9.0, 1.4, uTime);
          vec3 np = position; np.x += o.x; np.y += o.z; np.z += o.y; vH = o.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(np,1.0);
        }`,
      fragmentShader: `
        varying float vH; uniform vec3 uDeep; uniform vec3 uShallow; uniform float uOpacity;
        void main(){
          float h = clamp(vH*1.6 + 0.5, 0.0, 1.0);
          vec3 col = mix(uDeep, uShallow, h);
          float foam = smoothstep(0.42, 0.62, vH);
          col = mix(col, vec3(0.82,0.96,1.0), foam*0.6);
          gl_FragColor = vec4(col, uOpacity);
        }`,
    });
    this.water = new THREE.Mesh(geo, this.waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(0, WY + 22, -30);
    this.scene.add(this.water);
  }

  private buildEnvironment(): void {
    // cave / depth backdrop
    const cave = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 200),
      new THREE.MeshBasicMaterial({ map: caveTexture(), transparent: true, depthWrite: false }),
    );
    cave.position.set(8, 2, -120); this.scene.add(cave);

    // seafloor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 240, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x05111d, roughness: 1, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -WY - 4, -30); this.scene.add(floor);

    // corals
    const hues = [285, 195, 320, 160, 265, 305];
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const hue = hues[i % hues.length];
      const col = new THREE.Color().setHSL(hue / 360, 0.85, 0.6);
      const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.65, roughness: 0.6 });
      const arms = 3 + (i % 3);
      for (let a = 0; a < arms; a++) {
        const h = 5 + Math.random() * 7;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.5, h, 6), mat);
        arm.position.y = h / 2;
        arm.rotation.z = (a - (arms - 1) / 2) * 0.42;
        g.add(arm);
      }
      g.position.set(-WX + 6 + (i / 9) * (WX * 2 - 12) + (Math.random() - 0.5) * 8, -WY - 3, -6 - Math.random() * 30);
      this.scene.add(g);
    }

    // light shafts
    const stex = shaftTexture();
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(10 + Math.random() * 8, 90),
        new THREE.MeshBasicMaterial({ map: stex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }),
      );
      m.position.set(-WX + 12 + i * 26 + (Math.random() - 0.5) * 8, 14, -20 - Math.random() * 30);
      m.rotation.z = (Math.random() - 0.5) * 0.3;
      this.shafts.push(m); this.scene.add(m);
    }
  }

  private buildParticles(): void {
    const n = 300; const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 150;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 2] = -60 + Math.random() * 70;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.particles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xaee9ff, size: 0.55, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    this.scene.add(this.particles);
  }

  // ---------- creature meshes ----------
  private makeGlow(hue: number, scale: number, known: boolean): THREE.Sprite {
    const col = new THREE.Color().setHSL((hue % 360) / 360, 0.9, 0.6);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, color: col, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: known ? 0.7 : 0.2,
    }));
    sp.scale.set(scale, scale, 1);
    return sp;
  }
  private makeRing(r: number): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.16, 8, 44),
      new THREE.MeshBasicMaterial({ color: 0x7fe6ff, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    m.visible = false; return m;
  }

  private buildCreature(s: Species, factor: number, known: boolean): View {
    const r = worldRadius(s.sizeCm, factor);
    const rx = r * s.bodyRx, ry = r * s.bodyRy, rz = r * s.bodyRz;
    const group = new THREE.Group();
    const bodyMats: THREE.MeshStandardMaterial[] = [];
    const appendages: THREE.Object3D[] = [];
    let tail: THREE.Object3D | undefined;
    let pulse = false;

    const baseCol = known ? new THREE.Color().setHSL((s.hue % 360) / 360, 0.8, 0.6) : new THREE.Color().setHSL(0.57, 0.16, 0.52);
    const mat = (extra?: Partial<THREE.MeshStandardMaterialParameters>) => {
      const m = new THREE.MeshStandardMaterial({
        color: baseCol.clone(), emissive: baseCol.clone(),
        emissiveIntensity: known ? (s.danger >= 2 ? 0.7 : 0.85) : 0.16,
        roughness: 0.5, metalness: 0, transparent: true, opacity: known ? 0.95 : 0.5, ...extra,
      });
      bodyMats.push(m); return m;
    };

    const sphere = (R: number) => new THREE.SphereGeometry(R, 18, 14);

    if (s.key === 'jellyfish') {
      pulse = true;
      const bell = new THREE.Mesh(new THREE.SphereGeometry(rx, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat({ opacity: known ? 0.7 : 0.35 }));
      bell.scale.set(1, ry / rx * 1.1, 1); group.add(bell);
      const tg = new THREE.Group(); group.add(tg); appendages.push(tg);
      for (let k = -3; k <= 3; k++) {
        const len = ry * (1.6 + Math.random() * 0.6);
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, len, 5), mat());
        t.position.set(k * rx * 0.22, -len / 2, 0); tg.add(t);
      }
    } else if (s.key === 'octopus') {
      const head = new THREE.Mesh(sphere(rx), mat()); head.scale.set(1, ry / rx, rz / rx); group.add(head);
      const ag = new THREE.Group(); group.add(ag); appendages.push(ag);
      for (let k = 0; k < 8; k++) {
        const an = (k / 8) * Math.PI * 2; const len = ry * 1.7;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, len, 5), mat());
        arm.position.set(Math.cos(an) * rx * 0.5, -ry * 0.4 - len / 2, Math.sin(an) * rz * 0.5);
        ag.add(arm);
      }
    } else if (s.key === 'turtle') {
      const shell = new THREE.Mesh(sphere(rx), mat()); shell.scale.set(1, ry / rx * 0.55, rz / rx * 1.1); group.add(shell);
      const head = new THREE.Mesh(sphere(ry * 0.5), mat()); head.position.set(rx * 0.95, 0, 0); group.add(head);
      const fmat = mat({ emissiveIntensity: known ? 0.6 : 0.14 });
      [[-0.7, 1], [-0.7, -1], [0.5, 1], [0.5, -1]].forEach(([fx, fz]) => {
        const fl = new THREE.Mesh(new THREE.ConeGeometry(ry * 0.45, rx * 0.9, 6), fmat);
        fl.position.set(rx * fx, -ry * 0.1, rz * 0.7 * fz); fl.rotation.z = Math.PI / 2 * fx; fl.rotation.x = fz * 0.4;
        group.add(fl); appendages.push(fl);
      });
    } else if (s.key === 'ray') {
      const disc = new THREE.Mesh(sphere(rx), mat()); disc.scale.set(1, ry / rx * 0.22, rz / rx * 1.5); group.add(disc);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.22, rx * 1.7, 5), mat());
      t.position.set(-rx * 1.2, 0, 0); t.rotation.z = Math.PI / 2; group.add(t); tail = t;
    } else if (s.key === 'plankton') {
      const core = new THREE.Mesh(sphere(rx * 0.8), mat()); group.add(core);
    } else {
      // generic fish: ellipsoid body + tail fin + dorsal + pectoral
      const body = new THREE.Mesh(sphere(r), mat());
      body.scale.set(rx / r, ry / r, rz / r); group.add(body);
      const tg = new THREE.Group(); tg.position.set(-rx * 0.9, 0, 0); group.add(tg); tail = tg;
      const tcone = new THREE.Mesh(new THREE.ConeGeometry(ry * 1.1, rx * 1.1, 4), mat());
      tcone.rotation.z = -Math.PI / 2; tcone.position.set(-rx * 0.45, 0, 0); tcone.scale.set(1, 1, 0.25); tg.add(tcone);
      // dorsal fin
      const dorsalH = s.key === 'shark' ? ry * 1.9 : ry * 1.0;
      const dorsal = new THREE.Mesh(new THREE.ConeGeometry(rx * 0.4, dorsalH, 4), mat());
      dorsal.position.set(0, ry * 0.8, 0); dorsal.scale.set(1, 1, 0.18); group.add(dorsal);
      // pectoral fin
      const pec = new THREE.Mesh(new THREE.ConeGeometry(ry * 0.5, rx * 0.7, 4), mat());
      pec.rotation.z = Math.PI / 2; pec.position.set(rx * 0.1, -ry * 0.4, rz * 0.7); pec.scale.set(1, 1, 0.16); group.add(pec);
      // eye
      const eye = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.18, ry * 0.16), 8, 8), new THREE.MeshBasicMaterial({ color: 0x04121f }));
      eye.position.set(rx * 0.62, ry * 0.18, rz * 0.62); group.add(eye);
      const eye2 = eye.clone(); eye2.position.z = -rz * 0.62; group.add(eye2);
      // glowing dots (player / dotfish)
      if (s.key === 'dotfish') {
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xdfffff, transparent: true, opacity: 0.9 });
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), dotMat);
          dot.position.set(Math.cos(a) * rx * 0.45, Math.sin(a) * ry * 0.4, rz * 0.95); group.add(dot);
        }
      }
    }

    // dark rim for dangerous creatures
    if (known && s.danger >= 2) {
      const rim = new THREE.Mesh(sphere(r * 1.06), new THREE.MeshBasicMaterial({ color: 0x0a0206, side: THREE.BackSide, transparent: true, opacity: 0.5 }));
      rim.scale.set(rx / r, ry / r, rz / r); group.add(rim);
      bodyMats.forEach((m) => { m.emissive.lerp(tmpC.set(0xff2d4a), 0.3); });
    }

    const glow = this.makeGlow(s.hue, r * 3.2, known); group.add(glow);
    const ring = this.makeRing(r * Math.max(s.bodyRx, s.bodyRy) + 1.4); group.add(ring);

    let unknownMark: THREE.Sprite | undefined;
    if (!known) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#bcd6e6'; ctx.font = 'bold 46px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 32, 34);
      unknownMark = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
      unknownMark.scale.set(2.2, 2.2, 1); unknownMark.position.set(0, ry + 2.5, 0); group.add(unknownMark);
    }

    const setKnown = (kn: boolean) => {
      const col = kn ? new THREE.Color().setHSL((s.hue % 360) / 360, 0.8, 0.6) : new THREE.Color().setHSL(0.57, 0.16, 0.52);
      bodyMats.forEach((m) => {
        m.color.copy(col); m.emissive.copy(col);
        if (kn && s.danger >= 2) m.emissive.lerp(tmpC.set(0xff2d4a), 0.3);
        m.emissiveIntensity = kn ? (s.danger >= 2 ? 0.7 : 0.85) : 0.16; m.opacity = kn ? 0.95 : 0.5;
      });
      (glow.material as THREE.SpriteMaterial).color.copy(col);
      (glow.material as THREE.SpriteMaterial).opacity = kn ? 0.7 : 0.2;
      if (unknownMark) unknownMark.visible = !kn;
    };

    return { group, tail, appendages, glow, ring, bodyMats, unknownMark, pulse, setKnown };
  }

  private buildPlayer(): void {
    const v = this.buildCreature(PLAYER_SPECIES, this.sizeFactor, true);
    v.ring.visible = true; (v.ring.material as THREE.MeshBasicMaterial).opacity = 0.55;
    const label = this.makeLabel();
    v.group.add(label);
    this.scene.add(v.group);
    this.player = { mesh: v.group, label, ring: v.ring, bodyMats: v.bodyMats, tail: v.tail ?? v.group };
  }

  private makeLabel(): THREE.Sprite {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const ctx = c.getContext('2d')!; ctx.clearRect(0, 0, 256, 96);
    ctx.font = 'bold 44px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#9fe9ff'; ctx.shadowColor = '#39d6ff'; ctx.shadowBlur = 14;
    ctx.fillText('Lv.' + this.level, 128, 40);
    ctx.shadowBlur = 0; ctx.fillStyle = '#f5b942'; ctx.beginPath();
    ctx.moveTo(118, 66); ctx.lineTo(138, 66); ctx.lineTo(128, 80); ctx.closePath(); ctx.fill();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    sp.scale.set(9, 3.4, 1); this.labelLevel = this.level; return sp;
  }
  private refreshLabel(): void {
    if (this.labelLevel === this.level) return;
    const old = this.player.label;
    const sp = this.makeLabel(); sp.position.copy(old.position);
    this.player.mesh.add(sp); this.player.mesh.remove(old);
    (old.material as THREE.SpriteMaterial).map?.dispose(); (old.material as THREE.Material).dispose();
    this.player.label = sp;
  }

  // ---------- lifecycle ----------
  start(): void { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); }
  stop(): void {
    this.running = false; cancelAnimationFrame(this.raf);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = (m as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else if (mat) (mat as THREE.Material).dispose();
    });
    this.glowTex.dispose(); this.renderer.dispose();
  }

  setKey(k: string, down: boolean): void { this.keys[k] = down; }
  setPointer(p: { x: number; y: number } | null): void { this.pointer = p; }
  scanNearest(): void {
    let best: Npc | null = null, bd = 1e9;        // nearest overall (for focus)
    let unk: Npc | null = null, ud = 1e9;          // nearest undiscovered (for reveal)
    for (const n of this.npcs) {
      const d = Math.hypot(n.pos.x - this.px, n.pos.y - this.py);
      if (d < bd) { bd = d; best = n; }
      if (!this.discovered.has(n.s.key) && d < ud) { ud = d; unk = n; }
    }
    if (unk && ud < 70) { this.focus(unk.s.key); this.discover(unk); }
    else if (best && bd < 55) { this.focus(best.s.key); }
  }
  focusedKey(): string | null { return this.focusKey; }
  speciesOf(key: string): Species { return byKey[key]; }

  // ---------- gameplay ----------
  private playerPower(): number { return PLAYER_SPECIES.sizeCm * this.sizeFactor; }
  private xpNext(): number { return 200 + (this.level - 1) * 160; }

  private pickSpecies(): Species {
    const power = this.playerPower();
    const weighted: Species[] = [];
    for (const s of SPECIES) {
      let w = s.rarity === 'common' ? 5 : s.rarity === 'uncommon' ? 3 : s.rarity === 'rare' ? 2 : 1;
      const ratio = s.sizeCm / power;
      if (ratio > 0.12 && ratio < 3) w += 2;
      if (ratio >= 3) w = Math.max(1, w - 2);
      for (let i = 0; i < w; i++) weighted.push(s);
    }
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  private addNpc(s: Species, x: number, y: number, school: number): void {
    const view = this.buildCreature(s, 1, this.discovered.has(s.key));
    this.scene.add(view.group);
    const heading = Math.atan2(this.py - y, this.px - x) + (Math.random() - 0.5);
    const z = (Math.random() - 0.5) * WZ * (s.behavior === 'lurk' ? 1.4 : 1);
    const n: Npc = {
      s, pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), heading,
      phase: Math.random() * 7, warn: 0, dir: Math.cos(heading) >= 0 ? 1 : -1,
      targetTimer: 1 + Math.random() * 3, school, view,
    };
    n.view.group.position.copy(n.pos);
    this.npcs.push(n);
  }
  private spawn(initial = false): void {
    const s = this.pickSpecies();
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (edge === 0) { x = -WX - 4; y = (Math.random() - 0.5) * WY * 2; }
    else if (edge === 1) { x = WX + 4; y = (Math.random() - 0.5) * WY * 2; }
    else if (edge === 2) { x = (Math.random() - 0.5) * WX * 2; y = WY + 4; }
    else { x = (Math.random() - 0.5) * WX * 2; y = -WY - 4; }
    if (initial) { x = (Math.random() - 0.5) * WX * 1.6; y = (Math.random() - 0.5) * WY * 1.4; }
    if (s.behavior === 'school') {
      const id = Math.floor(Math.random() * 1e6); const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count && this.npcs.length < MAX_NPC; i++) this.addNpc(s, x + (Math.random() - 0.5) * 12, y + (Math.random() - 0.5) * 12, id);
    } else {
      this.addNpc(s, x, y, 0);
    }
  }

  private discover(n: Npc): void {
    if (this.discovered.has(n.s.key)) return;
    this.discovered.add(n.s.key);
    for (const o of this.npcs) if (o.s.key === n.s.key) o.view.setKnown(true);
    this.cb.onDiscover(n.s.key);
  }
  private focus(key: string | null): void {
    if (this.focusKey === key) { if (key) this.focusTimer = 4.5; return; }
    this.focusKey = key; this.focusTimer = key ? 4.5 : 0; this.cb.onFocus(key);
  }
  private eat(n: Npc): void {
    this.xp += Math.round(n.s.sizeCm * 0.6) + 8;
    this.cb.onEvent('eat', n.s.key);
    if (!this.discovered.has(n.s.key)) this.discover(n);
    while (this.xp >= this.xpNext()) {
      this.xp -= this.xpNext(); this.level += 1; this.sizeFactor *= 1.13;
      this.cb.onEvent('levelup', PLAYER_SPECIES.key, this.level);
    }
  }

  private steer(n: Npc, dt: number): void {
    const rm = this.opts.reducedMotion();
    n.targetTimer -= dt;
    if (n.targetTimer <= 0) {
      const dev = n.s.behavior === 'small' ? 1.1 : 0.6;
      n.heading += (Math.random() - 0.5) * dev;
      n.targetTimer = (n.s.behavior === 'small' ? 0.6 : 2) + Math.random() * 2.5;
    }
    // schooling cohesion/alignment
    if (n.s.behavior === 'school' && n.school) {
      let cx = 0, cy = 0, hx = 0, hy = 0, cnt = 0, sepx = 0, sepy = 0;
      for (const o of this.npcs) {
        if (o === n || o.school !== n.school) continue;
        const dx = o.pos.x - n.pos.x, dy = o.pos.y - n.pos.y; const d = Math.hypot(dx, dy);
        if (d < 22) { cx += o.pos.x; cy += o.pos.y; hx += Math.cos(o.heading); hy += Math.sin(o.heading); cnt++; if (d < 6 && d > 0.001) { sepx -= dx / d; sepy -= dy / d; } }
      }
      if (cnt) {
        const toC = Math.atan2(cy / cnt - n.pos.y, cx / cnt - n.pos.x);
        const align = Math.atan2(hy, hx);
        const sep = Math.atan2(sepy, sepx);
        const blend = (a: number, b: number, w: number) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; return a + d * w; };
        n.heading = blend(n.heading, toC, 0.04 * dt * 60);
        n.heading = blend(n.heading, align, 0.05 * dt * 60);
        if (sepx || sepy) n.heading = blend(n.heading, sep, 0.06 * dt * 60);
      }
    }
    // edge steering
    const mx = WX + 6, my = WY + 6;
    if (Math.abs(n.pos.x) > mx || Math.abs(n.pos.y) > my) {
      const toCenter = Math.atan2(-n.pos.y, -n.pos.x);
      let d = ((toCenter - n.heading + Math.PI) % (Math.PI * 2)) - Math.PI; n.heading += d * Math.min(1, dt * 2.5);
    }
    const spd = n.s.speed * 6 * behaviorMul(n.s.behavior);
    n.vel.set(Math.cos(n.heading) * spd, Math.sin(n.heading) * spd, 0);
    if (n.s.behavior === 'drift' && !rm) n.vel.y += Math.sin(this.t * 1.2 + n.phase) * 1.5;
    n.pos.addScaledVector(n.vel, dt);
    n.pos.z += Math.sin(this.t * 0.6 + n.phase) * 0.4 * dt;
  }

  private update(dt: number): void {
    this.t += dt;
    const rm = this.opts.reducedMotion();
    // input
    const acc = 60;
    let ax = 0, ay = 0;
    if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) ax -= 1;
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) ax += 1;
    if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) ay += 1;
    if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) ay -= 1;
    if (this.pointer) { ax += this.pointer.x; ay += -this.pointer.y; }
    const al = Math.hypot(ax, ay) || 1; this.pvx += (ax / al) * acc * dt * (Math.hypot(ax, ay)); this.pvy += (ay / al) * acc * dt * (Math.hypot(ax, ay));
    const drag = Math.pow(0.0009, dt); this.pvx *= drag; this.pvy *= drag;
    const maxv = 34 / Math.sqrt(this.sizeFactor); const sp = Math.hypot(this.pvx, this.pvy);
    if (sp > maxv) { this.pvx *= maxv / sp; this.pvy *= maxv / sp; }
    this.px = Math.max(-WX, Math.min(WX, this.px + this.pvx * dt));
    this.py = Math.max(-WY, Math.min(WY, this.py + this.pvy * dt));
    if (this.pvx > 0.4) this.pdir = 1; else if (this.pvx < -0.4) this.pdir = -1;

    if (this.npcs.length < MAX_NPC && Math.random() < dt * 1.1) this.spawn();

    const pr = worldRadius(PLAYER_SPECIES.sizeCm, this.sizeFactor);
    const pPow = this.playerPower();
    let nearest: Npc | null = null; let nd = 1e9;

    for (const n of this.npcs) {
      this.steer(n, dt);
      if (n.warn > 0) n.warn -= dt;
      if (n.vel.x > 0.2) n.dir = 1; else if (n.vel.x < -0.2) n.dir = -1;

      const d = Math.hypot(n.pos.x - this.px, n.pos.y - this.py);
      const nr = worldRadius(n.s.sizeCm);
      if (d < pr + nr * 0.55) {
        const dangerous = n.s.danger >= 2 || n.s.sizeCm > pPow * 0.95;
        if (!dangerous && pPow > n.s.sizeCm) { n.dead = true; this.eat(n); continue; }
        if (dangerous) {
          const a = Math.atan2(this.py - n.pos.y, this.px - n.pos.x);
          this.pvx += Math.cos(a) * 22; this.pvy += Math.sin(a) * 22;
          if (n.warn <= 0) { n.warn = 1.8; this.cb.onEvent('danger', n.s.key); }
        }
      }
      if (d < nd) { nd = d; nearest = n; }
    }
    // remove eaten
    for (const n of this.npcs) if (n.dead) { this.scene.remove(n.view.group); this.disposeView(n.view); }
    this.npcs = this.npcs.filter((n) => !n.dead);

    // focus / discovery
    const focusR = 30;
    if (nearest && nd < focusR) {
      this.focus(nearest.s.key);
      if (!this.discovered.has(nearest.s.key)) { this.focusTimer = 4.5; this.discover(nearest); }
    } else if (this.focusTimer > 0) { this.focusTimer -= dt; if (this.focusTimer <= 0) this.focus(null); }

    // particles drift
    if (!rm) {
      const arr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < arr.count; i++) {
        let y = arr.getY(i) + dt * 3; if (y > 46) y = -46; arr.setY(i, y);
      }
      arr.needsUpdate = true;
    }

    // stats throttle
    this.statTick += dt;
    if (this.statTick > 0.25) {
      this.statTick = 0;
      this.cb.onStats({ level: this.level, xp: Math.round(this.xp), xpNext: this.xpNext(), sizeFactor: this.sizeFactor, discovered: this.discovered.size, total: TOTAL });
    }
  }

  private disposeView(v: View): void {
    v.group.traverse((o) => {
      const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose();
      const mat = (m as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else if (mat) (mat as THREE.Material).dispose();
    });
  }

  // ---------- animation of views ----------
  private animateView(v: View, dir: number, vel: THREE.Vector3, phase: number, focused: boolean, fast: number): void {
    const rm = this.opts.reducedMotion();
    const targetY = dir === 1 ? 0 : Math.PI;
    let dy = ((targetY - v.group.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
    v.group.rotation.y += dy * 0.18;
    v.group.rotation.z = THREE.MathUtils.clamp(-vel.y * 0.02, -0.5, 0.5);
    if (!rm) {
      if (v.tail) v.tail.rotation.y = Math.sin(this.t * (4 + fast * 3) + phase) * (0.35 + fast * 0.2);
      if (v.pulse) { const s = 1 + Math.sin(this.t * 2 + phase) * 0.09; v.group.scale.setY(s); }
      for (const ap of v.appendages) ap.rotation.x = Math.sin(this.t * 2 + phase) * 0.18;
    }
    v.ring.visible = focused;
    if (focused && !rm) v.ring.scale.setScalar(1 + Math.sin(this.t * 4) * 0.04);
  }

  private render(): void {
    // player rig
    this.player.mesh.position.set(this.px, this.py, 0);
    const grow = Math.pow(this.sizeFactor, 0.5);
    this.player.mesh.scale.setScalar(grow);
    const targetY = this.pdir === 1 ? 0 : Math.PI;
    let dy = ((targetY - this.pdirCur + Math.PI) % (Math.PI * 2)) - Math.PI; this.pdirCur += dy * 0.18;
    this.player.mesh.rotation.y = this.pdirCur;
    this.player.mesh.rotation.z = THREE.MathUtils.clamp(-this.pvy * 0.02, -0.5, 0.5);
    if (!this.opts.reducedMotion()) this.player.tail.rotation.y = Math.sin(this.t * 6) * 0.4;
    this.player.label.position.set(0, worldRadius(PLAYER_SPECIES.sizeCm) * PLAYER_SPECIES.bodyRy + 4.5, 0);
    // counter-rotate label so it always faces camera upright
    this.player.label.material.rotation = 0;
    this.refreshLabel();

    for (const n of this.npcs) {
      n.view.group.position.copy(n.pos);
      const fast = n.s.behavior === 'small' ? 1 : n.s.behavior === 'school' ? 0.6 : 0.2;
      const focused = this.focusKey === n.s.key && Math.hypot(n.pos.x - this.px, n.pos.y - this.py) < 30;
      this.animateView(n.view, n.dir, n.vel, n.phase, focused, fast);
    }

    // camera follow + sway
    const f = 1 - Math.pow(0.0001, 0.016);
    this.camFocus.x += (this.px - this.camFocus.x) * f;
    this.camFocus.y += (this.py - this.camFocus.y) * f;
    const sway = this.opts.reducedMotion() ? 0 : Math.sin(this.t * 0.4) * 1.2;
    this.camera.position.set(this.camFocus.x * 0.7 + sway, this.camFocus.y * 0.7 + 4, CAM_Z);
    this.camera.lookAt(this.camFocus.x * 0.7, this.camFocus.y * 0.7, 0);

    // env updates
    if (!this.opts.reducedMotion()) {
      this.waterMat.uniforms.uTime.value = this.t;
      for (let i = 0; i < this.shafts.length; i++) (this.shafts[i].material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(this.t * 0.5 + i) * 0.16;
    }

    // high contrast tweak
    const hc = this.opts.highContrast();
    this.renderer.setClearColor(hc ? 0x000000 : 0x041220, 1);
    this.scene.fog = hc ? null : (this.scene.fog ?? new THREE.FogExp2(0x041523, 0.0062));

    this.renderer.render(this.scene, this.camera);
  }

  private resize(): void {
    const w = this.canvas.clientWidth || 960, h = this.canvas.clientHeight || 600;
    if (this.canvas.width !== Math.floor(w * this.renderer.getPixelRatio()) || this.canvas.height !== Math.floor(h * this.renderer.getPixelRatio())) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    }
  }

  private loop = (t: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
    this.resize();
    if (!this.opts.paused()) this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };
}
