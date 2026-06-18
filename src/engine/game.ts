import * as THREE from 'three';
import { SPECIES, PLAYER_SPECIES, byKey, type Species } from '../data/species';
import { FISH_TEX } from '../assets/fish';
import { GW, GH, pattern } from './dotMatrix';

function dir8(dx: number, dy: number): number {
  const idx = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return ((idx % 8) + 8) % 8;
}
function distBucket(d: number): 'near' | 'mid' | 'far' {
  return d < 20 ? 'near' : d < 45 ? 'mid' : 'far';
}

export interface CueInfo { dir: number; dist: 'near' | 'mid' | 'far'; edible: boolean; danger: boolean; }
export interface SurveyItem { key: string; dir: number; dist: 'near' | 'mid' | 'far'; danger: boolean; edible: boolean; }
export interface RadarData { grid: number[][]; }  // 0 empty, 1 creature, 2 player, 3 danger

export interface GameStats {
  level: number; xp: number; xpNext: number; sizeFactor: number;
  discovered: number; total: number;
}
export interface GameCallbacks {
  onStats: (s: GameStats) => void;
  onDiscover: (key: string, info?: CueInfo) => void;
  onFocus: (key: string | null) => void;
  onEvent: (kind: 'eat' | 'levelup' | 'danger', key: string, level?: number, info?: CueInfo) => void;
  onRadar?: (data: RadarData) => void;
  onSurvey?: (items: SurveyItem[], edges: number[]) => void;
  onCue?: (pan: number, pitch: number, danger: boolean) => void;
}
export interface GameOpts {
  reducedMotion: () => boolean;
  highContrast: () => boolean;
  paused: () => boolean;
  audioCues: () => boolean;
}

const WX = 60, WY = 34, WZ = 16;
const CAM_Z = 86;
const TOTAL = SPECIES.length;
const MAX_NPC = 12;


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
// Build a flat 2D illustration-style sprite from the 60x40 tactile dot grid.
// Flat fill + outer bioluminescent glow + subtle belly sheen — no 3D gradient/specular.
function silhouetteTexture(key: string, hue: number): THREE.Texture {
  const g = pattern(key);
  let x0 = GW, y0 = GH, x1 = -1, y1 = -1;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (g[y][x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = GW - 1; y1 = GH - 1; }
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
  x1 = Math.min(GW - 1, x1 + 1); y1 = Math.min(GH - 1, y1 + 1);
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  const S = 9;
  const PAD = Math.ceil(S * 1.2); // room for outer glow
  const cw = cols * S + PAD * 2, ch = rows * S + PAD * 2;
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d')!;

  const dots = (r: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y][x]) {
      ctx.beginPath();
      ctx.arc((x - x0 + 0.5) * S + PAD, (y - y0 + 0.5) * S + PAD, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // 1) outer bioluminescent glow (wide blur, same hue)
  ctx.filter = `blur(${S * 1.1}px)`;
  ctx.fillStyle = `hsl(${hue},88%,68%)`;
  dots(S * 0.9);

  // 2) flat body fill — crisp edges, no top-lit gradient
  ctx.filter = `blur(${S * 0.38}px)`;
  ctx.fillStyle = `hsl(${hue},76%,60%)`;
  dots(S * 0.88);
  ctx.filter = 'none';

  // 3) horizontal belly sheen — 2D illustration-style, not 3D specular
  ctx.globalCompositeOperation = 'source-atop';
  const sheen = ctx.createLinearGradient(0, ch * 0.3, 0, ch * 0.72);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(0, 0, cw, ch);
  ctx.globalCompositeOperation = 'source-over';

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
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
  plane: THREE.Mesh;
  planeMat: THREE.MeshBasicMaterial;
  glow: THREE.Sprite;
  ring: THREE.Mesh;
  unknownMark?: THREE.Sprite;
  baseW: number; baseH: number; flip: number;
  danger: boolean; pulse: boolean;
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

  private player!: { mesh: THREE.Group; label: THREE.Sprite; ring: THREE.Mesh; plane: THREE.Mesh; planeMat: THREE.MeshBasicMaterial; baseH: number; flip: number };
  private px = 0; private py = 0; private pvx = 0; private pvy = 0; private pdir = 1;
  private level = 1; private xp = 0; private sizeFactor = 1; private labelLevel = -1;

  private npcs: Npc[] = [];
  private discovered = new Set<string>();
  private maxTier = 5;           // curriculum gate — only spawn species with tier ≤ this
  private keys: Record<string, boolean> = {};
  private pointer: { x: number; y: number } | null = null;
  private focusKey: string | null = null; private focusTimer = 0; private statTick = 0;
  private cueTick = 0; private cueIdx = 0; private radarTick = 0;
  private camFocus = new THREE.Vector3();
  private camRoll = 0;
  private overlayScene = new THREE.Scene();
  private overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private waterOverlayMat!: THREE.ShaderMaterial;

  private water!: THREE.Mesh; private waterMat!: THREE.ShaderMaterial;
  private particles!: THREE.Points;
  private shafts: THREE.Mesh[] = [];
  private playerLight!: THREE.PointLight;
  private floorMat!: THREE.ShaderMaterial;
  private bubbles!: THREE.Points; private bubblePos!: Float32Array;
  private coralArms: Array<{ mesh: THREE.Mesh; baseZ: number; phase: number }> = [];
  private glowTex = radialTexture(180, 240, 255);
  private tex: Record<string, THREE.Texture> = {};

  constructor(canvas: HTMLCanvasElement, opts: GameOpts, cb: GameCallbacks) {
    this.canvas = canvas; this.opts = opts; this.cb = cb;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x041220, 1);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 420);
    this.camera.position.set(0, 4, CAM_Z);
    this.scene.fog = new THREE.FogExp2(0x041523, 0.0062);

    const loader = new THREE.TextureLoader();
    for (const s of [...SPECIES, PLAYER_SPECIES]) {
      if (FISH_TEX[s.key]) {
        const t = loader.load(FISH_TEX[s.key]);
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        this.tex[s.key] = t;
      } else {
        // No art asset: paint a smooth glowing silhouette from the tactile grid.
        this.tex[s.key] = silhouetteTexture(s.key, s.hue);
      }
    }

    this.buildLights();
    this.buildWater();
    this.buildEnvironment();
    this.buildParticles();
    this.buildWaterOverlay();
    this.buildPlayer();
    for (let i = 0; i < 4; i++) this.spawn(true);
    this.resize();
  }

  // ---------- build ----------
  private buildLights(): void {
    this.scene.add(new THREE.AmbientLight(0x335577, 0.7));
    const d = new THREE.DirectionalLight(0xbfe9ff, 0.85); d.position.set(0.3, 1, 0.4); this.scene.add(d);
    const p = new THREE.PointLight(0x39d6ff, 0.6, 160); p.position.set(0, 6, 30); this.scene.add(p);
    this.playerLight = new THREE.PointLight(0x6af4ff, 0.85, 45);
    this.playerLight.position.set(0, 0, 8); this.scene.add(this.playerLight);
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

    // seafloor — animated caustic light shader
    this.floorMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uBase: { value: new THREE.Color(0x05111d) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uBase; varying vec2 vUv;
        float caustic(vec2 p, float t){
          vec2 q = p * 7.0;
          float a = sin(q.x + sin(q.y * 0.9 + t * 0.28) + t * 0.38);
          float b = sin(q.y + sin(q.x * 1.1 - t * 0.46) - t * 0.22);
          return max(0.0, a * b);
        }
        void main(){
          float c1 = caustic(vUv, uTime);
          float c2 = caustic(vUv * 1.4 + vec2(0.31, 0.57), uTime * 0.65 + 0.9);
          float c = (c1 + c2) * 0.5;
          vec3 glow = vec3(0.04, 0.32, 0.52);
          vec3 col = uBase + glow * c * 0.75;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(320, 240, 1, 1), this.floorMat);
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
        this.coralArms.push({ mesh: arm, baseZ: arm.rotation.z, phase: i * 1.3 + a * 2.1 });
        g.add(arm);
      }
      g.position.set(-WX + 6 + (i / 9) * (WX * 2 - 12) + (Math.random() - 0.5) * 8, -WY - 3, -6 - Math.random() * 30);
      this.scene.add(g);
    }

    // light shafts — 10 shafts with chromatic color variation
    const stex = shaftTexture();
    const shaftTints = [0xffffff, 0xb0f4ff, 0xffddb0, 0xd0f8ff, 0xffe8b0, 0xb8fdf0, 0xfff0cc, 0xb0eaff, 0xffe0c8, 0xcafff8];
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(7 + Math.random() * 10, 90),
        new THREE.MeshBasicMaterial({ map: stex, color: shaftTints[i], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.42 }),
      );
      m.position.set(-WX + 8 + i * 14 + (Math.random() - 0.5) * 6, 14, -18 - Math.random() * 38);
      m.rotation.z = (Math.random() - 0.5) * 0.4;
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
    this.buildBubbles();
  }

  private buildWaterOverlay(): void {
    this.waterOverlayMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAspect: { value: 1.6 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform float uTime; uniform float uAspect; varying vec2 vUv;
        void main(){
          vec2 uv = vec2(vUv.x * uAspect, vUv.y);
          float w1 = sin(uv.x * 14.0 + sin(uv.y * 9.5 + uTime * 0.31) + uTime * 0.27);
          float w2 = sin(uv.y * 17.0 + sin(uv.x * 12.0 - uTime * 0.36) - uTime * 0.21);
          float caustic = max(0.0, w1 * w2 - 0.52) / 0.48;
          gl_FragColor = vec4(0.04, 0.26, 0.46, caustic * 0.09);
        }`,
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.waterOverlayMat);
    q.frustumCulled = false;
    this.overlayScene.add(q);
  }

  private buildBubbles(): void {
    const n = 80; const pos = new Float32Array(n * 3);
    this.bubblePos = new Float32Array(n * 3); // [x-drift, y-rise, phase]
    for (let i = 0; i < n; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * WX * 2;
      pos[i * 3 + 1] = -WY + (Math.random() - 0.5) * WY;
      pos[i * 3 + 2] = -20 + Math.random() * 35;
      this.bubblePos[i * 3]     = (Math.random() - 0.5) * 0.5;
      this.bubblePos[i * 3 + 1] = 3 + Math.random() * 5;
      this.bubblePos[i * 3 + 2] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.bubbles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xb0eeff, size: 0.38, transparent: true, opacity: 0.52,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    this.scene.add(this.bubbles);
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
    const baseH = 2.6 * r;
    const baseW = baseH * s.aspect;
    const group = new THREE.Group();
    const danger = s.danger >= 2;

    const planeMat = new THREE.MeshBasicMaterial({
      map: this.tex[s.key], transparent: true, alphaTest: 0.4, depthWrite: false,
      side: THREE.DoubleSide, toneMapped: false,
      color: known ? 0xffffff : 0x33506e, opacity: known ? 1 : 0.6,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(baseW, baseH), planeMat);
    plane.renderOrder = 2; group.add(plane);

    const glow = this.makeGlow(s.hue, baseH * 1.55, known); glow.position.z = -0.3; group.add(glow);
    if (known && danger) (glow.material as THREE.SpriteMaterial).color.setHSL(0.99, 0.85, 0.6);

    const ring = this.makeRing(Math.max(baseW, baseH) * 0.52 + 1.2); group.add(ring);

    let unknownMark: THREE.Sprite | undefined;
    if (!known) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#bcd6e6'; ctx.font = 'bold 46px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 32, 34);
      unknownMark = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
      unknownMark.scale.set(2.4, 2.4, 1); unknownMark.position.set(0, baseH * 0.62 + 1.5, 0); group.add(unknownMark);
    }

    const setKnown = (kn: boolean) => {
      planeMat.color.set(kn ? 0xffffff : 0x33506e);
      planeMat.opacity = kn ? 1 : 0.6;
      const gm = glow.material as THREE.SpriteMaterial;
      if (kn && danger) gm.color.setHSL(0.99, 0.85, 0.6); else gm.color.setHSL((s.hue % 360) / 360, 0.9, 0.6);
      gm.opacity = kn ? (danger ? 0.62 : 0.55) : 0.18;
      if (unknownMark) unknownMark.visible = !kn;
    };

    return { group, plane, planeMat, glow, ring, unknownMark, baseW, baseH, flip: 1, danger, pulse: s.key === 'jellyfish', setKnown };
  }

  private buildPlayer(): void {
    const v = this.buildCreature(PLAYER_SPECIES, 1, true);
    v.ring.visible = true; (v.ring.material as THREE.MeshBasicMaterial).opacity = 0.6;
    (v.glow.material as THREE.SpriteMaterial).opacity = 0.7;
    const label = this.makeLabel(); label.position.set(0, v.baseH * 0.66 + 2, 0);
    v.group.add(label);
    this.scene.add(v.group);
    this.player = { mesh: v.group, label, ring: v.ring, plane: v.plane, planeMat: v.planeMat, baseH: v.baseH, flip: 1 };
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
    this.glowTex.dispose();
    for (const k of Object.keys(this.tex)) this.tex[k].dispose();
    this.renderer.dispose();
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
    else if (best && bd < 55) {
      this.focus(best.s.key);
      const inf = this.infoFor(best);
      this.cb.onSurvey?.([{ key: best.s.key, dir: inf.dir, dist: inf.dist, danger: inf.danger, edible: inf.edible }], []);
    } else {
      this.cb.onSurvey?.([], this.edgesNear());
    }
  }

  // announce the nearest few creatures (eyes-free "look around")
  survey(): void {
    const items: SurveyItem[] = this.npcs
      .map((n) => ({ n, d: Math.hypot(n.pos.x - this.px, n.pos.y - this.py) }))
      .sort((a, b) => a.d - b.d).slice(0, 4)
      .map(({ n }) => { const i = this.infoFor(n); return { key: n.s.key, dir: i.dir, dist: i.dist, danger: i.danger, edible: i.edible }; });
    this.cb.onSurvey?.(items, this.edgesNear());
  }

  private edgesNear(): number[] {
    const m = 12, e: number[] = [];
    if (this.px > WX - m) e.push(0);
    if (this.py > WY - m) e.push(2);
    if (this.px < -WX + m) e.push(4);
    if (this.py < -WY + m) e.push(6);
    return e;
  }

  private infoFor(n: Npc): CueInfo {
    const dx = n.pos.x - this.px, dy = n.pos.y - this.py;
    const dangerous = n.s.danger >= 2 || n.s.sizeCm > this.playerPower() * 0.95;
    return { dir: dir8(dx, dy), dist: distBucket(Math.hypot(dx, dy)), edible: !dangerous && this.playerPower() > n.s.sizeCm, danger: dangerous };
  }

  private buildRadar(): number[][] {
    const g: number[][] = Array.from({ length: GH }, () => new Array<number>(GW).fill(0));
    const cx = (GW - 1) / 2, cy = (GH - 1) / 2;
    const RANGE = 55;
    const sx = (GW / 2 - 2) / RANGE, sy = (GH / 2 - 2) / RANGE;
    for (const n of this.npcs) {
      const dx = n.pos.x - this.px, dy = n.pos.y - this.py;
      if (Math.abs(dx) > RANGE || Math.abs(dy) > RANGE) continue;
      const gx = Math.round(cx + dx * sx), gy = Math.round(cy - dy * sy);
      const dangerous = n.s.danger >= 2 || n.s.sizeCm > this.playerPower() * 0.95;
      const rad = n.s.sizeCm > 200 ? 2 : n.s.sizeCm > 40 ? 1 : 0;
      const v = dangerous ? 3 : 1;
      for (let yy = -rad; yy <= rad; yy++) for (let xx = -rad; xx <= rad; xx++) {
        const X = gx + xx, Y = gy + yy;
        if (X >= 0 && X < GW && Y >= 0 && Y < GH && g[Y][X] !== 2) g[Y][X] = Math.max(g[Y][X], v);
      }
    }
    for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = Math.round(cx) + ox, Y = Math.round(cy) + oy;
      if (X >= 0 && X < GW && Y >= 0 && Y < GH) g[Y][X] = 2;
    }
    const m = 12;
    if (this.px > WX - m) for (let y = 0; y < GH; y++) g[y][GW - 1] ||= 1;
    if (this.px < -WX + m) for (let y = 0; y < GH; y++) g[y][0] ||= 1;
    if (this.py > WY - m) for (let x = 0; x < GW; x++) g[0][x] ||= 1;
    if (this.py < -WY + m) for (let x = 0; x < GW; x++) g[GH - 1][x] ||= 1;
    return g;
  }

  focusedKey(): string | null { return this.focusKey; }
  speciesOf(key: string): Species { return byKey[key]; }

  // ---------- gameplay ----------
  private playerPower(): number { return PLAYER_SPECIES.sizeCm * this.sizeFactor; }
  private xpNext(): number { return 200 + (this.level - 1) * 160; }

  /** Restrict spawnable species to tier ≤ n (curriculum level gate). */
  setMaxTier(n: number): void { this.maxTier = Math.max(1, Math.min(5, n)); }

  private pickSpecies(): Species {
    const power = this.playerPower();
    const pool = SPECIES.filter((s) => s.tier <= this.maxTier);
    const weighted: Species[] = [];
    for (const s of pool) {
      let w = s.rarity === 'common' ? 5 : s.rarity === 'uncommon' ? 3 : s.rarity === 'rare' ? 2 : 1;
      const ratio = s.sizeCm / power;
      if (ratio > 0.12 && ratio < 3) w += 2;
      if (ratio >= 3) w = Math.max(1, w - 2);
      for (let i = 0; i < w; i++) weighted.push(s);
    }
    if (!weighted.length) return pool[0] ?? SPECIES[0];
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
    this.cb.onDiscover(n.s.key, this.infoFor(n));
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
          if (n.warn <= 0) { n.warn = 1.8; this.cb.onEvent('danger', n.s.key, undefined, this.infoFor(n)); }
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

    // particles drift — plankton current simulation
    if (!rm) {
      const arr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < arr.count; i++) {
        let x = arr.getX(i) + Math.sin(this.t * 0.22 + i * 0.37) * dt * 1.1 + dt * 0.7;
        let y = arr.getY(i) + dt * (1.4 + Math.sin(this.t * 0.48 + i * 0.65) * 0.7);
        if (x > 75) x = -75; else if (x < -75) x = 75;
        if (y > 46) y = -46;
        arr.setX(i, x); arr.setY(i, y);
      }
      arr.needsUpdate = true;

      // bubble rise + horizontal wobble
      const bArr = this.bubbles.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < bArr.count; i++) {
        let x = bArr.getX(i) + Math.sin(this.t * 1.6 + this.bubblePos[i * 3 + 2]) * dt * 0.35;
        let y = bArr.getY(i) + this.bubblePos[i * 3 + 1] * dt;
        if (y > WY + 5) {
          y = -WY - 2 + Math.random() * 8;
          x = (Math.random() - 0.5) * WX * 2;
        }
        bArr.setX(i, x); bArr.setY(i, y);
      }
      bArr.needsUpdate = true;
    }

    // spatial audio "sonar": cycle a panned ping through nearby creatures
    if (this.opts.audioCues() && this.cb.onCue) {
      this.cueTick -= dt;
      if (this.cueTick <= 0) {
        this.cueTick = 0.3;
        const near = this.npcs
          .map((n) => ({ n, d: Math.hypot(n.pos.x - this.px, n.pos.y - this.py) }))
          .filter((o) => o.d < 48).sort((a, b) => a.d - b.d).slice(0, 5);
        if (near.length) {
          this.cueIdx = (this.cueIdx + 1) % near.length;
          const { n } = near[this.cueIdx];
          const pan = Math.max(-1, Math.min(1, (n.pos.x - this.px) / 40));
          const dangerous = n.s.danger >= 2 || n.s.sizeCm > this.playerPower() * 0.95;
          const pitch = dangerous ? 150 : Math.max(220, 900 - Math.log10(n.s.sizeCm + 1) * 230);
          this.cb.onCue(pan, pitch, dangerous);
        }
      }
    }

    // tactile radar push (~6 Hz)
    if (this.cb.onRadar) {
      this.radarTick -= dt;
      if (this.radarTick <= 0) { this.radarTick = 0.16; this.cb.onRadar({ grid: this.buildRadar() }); }
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
    // turn by mirroring the sprite; lerping through 0 reads as a turn
    v.flip += (dir - v.flip) * 0.15;
    let by = 0, rz = 0, sy = 1;
    if (!rm) {
      by = Math.sin(this.t * (1.8 + fast * 1.4) + phase) * v.baseH * 0.03;
      rz = Math.sin(this.t * (1.1 + fast) + phase) * 0.05 * (0.5 + fast);
      if (v.pulse) { sy = 1 + Math.sin(this.t * 2 + phase) * 0.08; by = Math.sin(this.t * 1.5 + phase) * v.baseH * 0.06; }
    }
    v.plane.position.y = by;
    v.plane.scale.set(v.flip, sy, 1);
    v.group.rotation.z = THREE.MathUtils.clamp(-vel.y * 0.015, -0.35, 0.35) + rz;
    v.ring.visible = focused;
    v.ring.scale.setScalar(focused && !rm ? 1 + Math.sin(this.t * 4) * 0.04 : 1);
  }

  private render(): void {
    // player rig
    this.player.mesh.position.set(this.px, this.py, 0);
    const grow = Math.pow(this.sizeFactor, 0.5);
    this.player.mesh.scale.setScalar(grow);
    this.player.mesh.rotation.set(0, 0, THREE.MathUtils.clamp(-this.pvy * 0.015, -0.35, 0.35));
    this.player.flip += (this.pdir - this.player.flip) * 0.15;
    const pby = this.opts.reducedMotion() ? 0 : Math.sin(this.t * 2.2) * this.player.baseH * 0.025;
    this.player.plane.position.y = pby;
    this.player.plane.scale.set(this.player.flip, 1, 1);
    this.player.label.material.rotation = 0;
    this.refreshLabel();

    for (const n of this.npcs) {
      n.view.group.position.copy(n.pos);
      const fast = n.s.behavior === 'small' ? 1 : n.s.behavior === 'school' ? 0.6 : 0.2;
      const focused = this.focusKey === n.s.key && Math.hypot(n.pos.x - this.px, n.pos.y - this.py) < 30;
      this.animateView(n.view, n.dir, n.vel, n.phase, focused, fast);
    }

    // camera follow + lookahead + roll + FOV breath
    const rm = this.opts.reducedMotion();
    const f = 1 - Math.pow(0.0001, 0.016);
    const ahead = rm ? 0 : 1.1;
    this.camFocus.x += (this.px + this.pvx * ahead - this.camFocus.x) * f;
    this.camFocus.y += (this.py + this.pvy * ahead * 0.55 - this.camFocus.y) * f;
    const sway = rm ? 0 : Math.sin(this.t * 0.4) * 1.2;
    this.camera.position.set(this.camFocus.x * 0.7 + sway, this.camFocus.y * 0.7 + 4, CAM_Z);
    // roll: tilt into horizontal velocity
    const targetRoll = rm ? 0 : this.pvx * -0.017;
    this.camRoll += (targetRoll - this.camRoll) * 0.07;
    this.camera.up.set(Math.sin(this.camRoll), Math.cos(this.camRoll), 0);
    this.camera.lookAt(this.camFocus.x * 0.7, this.camFocus.y * 0.7, 0);
    // FOV: widen with speed, subtle breathing rhythm
    const speed = Math.hypot(this.pvx, this.pvy);
    const targetFov = rm ? 50 : 50 + Math.min(speed * 0.27, 9) + Math.sin(this.t * 0.32) * 0.9;
    this.camera.fov += (targetFov - this.camera.fov) * 0.04;
    this.camera.updateProjectionMatrix();

    // env updates
    if (!this.opts.reducedMotion()) {
      this.waterMat.uniforms.uTime.value = this.t;
      this.floorMat.uniforms.uTime.value = this.t * 0.48;
      // shafts — varied frequency + amplitude for natural godrays
      for (let i = 0; i < this.shafts.length; i++) {
        const base = 0.28 + (i % 3) * 0.06;
        (this.shafts[i].material as THREE.MeshBasicMaterial).opacity = base + Math.sin(this.t * (0.38 + i * 0.06) + i * 1.05) * 0.17;
      }
      // coral sway
      for (const { mesh, baseZ, phase } of this.coralArms) {
        mesh.rotation.z = baseZ + Math.sin(this.t * 0.72 + phase) * 0.07;
      }
      // player bioluminescence — light follows player; depth dims it slightly
      this.playerLight.position.set(this.px, this.py, 8);
      const depthT = Math.max(0, (-this.py + WY) / (WY * 2));
      this.playerLight.intensity = 0.85 - depthT * 0.3;
      // water refraction overlay
      this.waterOverlayMat.uniforms.uTime.value = this.t;
      this.waterOverlayMat.uniforms.uAspect.value = this.camera.aspect;
    }

    // high contrast tweak
    const hc = this.opts.highContrast();
    this.renderer.setClearColor(hc ? 0x000000 : 0x041220, 1);
    this.scene.fog = hc ? null : (this.scene.fog ?? new THREE.FogExp2(0x041523, 0.0062));

    this.renderer.render(this.scene, this.camera);
    // water caustic overlay (additive, screen-space)
    if (!this.opts.reducedMotion() && !hc) {
      this.renderer.autoClear = false;
      this.renderer.render(this.overlayScene, this.overlayCamera);
      this.renderer.autoClear = true;
    }
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
    try {
      this.resize();
      if (!this.opts.paused()) this.update(dt);
      this.render();
    } catch (e) {
      console.error('Dot Ocean render loop stopped:', e);
      this.running = false; cancelAnimationFrame(this.raf);
      return;
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}
