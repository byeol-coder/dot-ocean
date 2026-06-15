import * as THREE from 'three';
import type { Species } from '../data/species';

export interface FishMeshResult {
  group: THREE.Group;
  tail?: THREE.Object3D;
  appendages: THREE.Object3D[];
  bodyMats: THREE.MeshStandardMaterial[];
  pulse: boolean;
}

function stdMat(color: THREE.Color | number | string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial(( { color: color as any, roughness: 0.55, metalness: 0, ...extra } as any ));
}

export function createFishMesh(s: Species, factor = 1, known = false): FishMeshResult {
  const group = new THREE.Group();
  const appendages: THREE.Object3D[] = [];
  const bodyMats: THREE.MeshStandardMaterial[] = [];
  let tail: THREE.Object3D | undefined;
  let pulse = false;

  // base color from hue
  const hue = ((s.hue % 360) + 360) % 360 / 360;
  const base = new THREE.Color().setHSL(hue, 0.7, known ? 0.56 : 0.42);

  const mkMat = (opts?: THREE.MeshStandardMaterialParameters) => {
    const m = stdMat(base.clone(), opts);
    bodyMats.push(m);
    return m;
  };

  // helper low-poly geometries
  const sphere = (r: number) => new THREE.SphereGeometry(r, 10, 8);
  const cone = (r: number, h: number) => new THREE.ConeGeometry(r, h, 6);
  const cyl = (r1: number, r2: number, h: number) => new THREE.CylinderGeometry(r1, r2, h, 6);
  const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);

  // species-specific assemblies
  switch (s.key) {
    case 'plankton': {
      const core = new THREE.Mesh(sphere(0.6 * factor), mkMat({ emissive: base.clone(), emissiveIntensity: 0.25, transparent: true, opacity: 0.9 }));
      group.add(core);
      break;
    }
    case 'jellyfish': {
      pulse = true;
      const bell = new THREE.Mesh(new THREE.SphereGeometry(1.0 * factor, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mkMat({ transparent: true, opacity: known ? 0.6 : 0.35 }));
      bell.scale.set(1, 0.8, 1); group.add(bell);
      const tentGroup = new THREE.Group(); group.add(tentGroup); appendages.push(tentGroup);
      for (let i = 0; i < 6; i++) {
        const len = 1.6 * factor * (0.9 + Math.random() * 0.6);
        const t = new THREE.Mesh(cyl(0.06 * factor, 0.02 * factor, len), mkMat({ transparent: true, opacity: 0.85 }));
        t.position.set(Math.cos((i / 6) * Math.PI * 2) * 0.4 * factor, -len / 2 - 0.1, Math.sin((i / 6) * Math.PI * 2) * 0.35 * factor);
        tentGroup.add(t);
      }
      break;
    }
    case 'puffer': {
      const body = new THREE.Mesh(sphere(1.0 * factor), mkMat({ roughness: 0.6 })); group.add(body);
      for (let i = 0; i < 14; i++) {
        const spike = new THREE.Mesh(cone(0.08 * factor, 0.35 * factor), mkMat({ color: 0xf5f5f5 }));
        spike.position.set((Math.random() - 0.5) * 1.6 * factor, (Math.random() - 0.1) * 0.6 * factor, (Math.random() - 0.5) * 1.2 * factor);
        spike.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        group.add(spike); appendages.push(spike);
      }
      tail = new THREE.Mesh(cone(0.12 * factor, 0.5 * factor), mkMat()); tail.position.set(-0.8 * factor, 0, 0); group.add(tail);
      break;
    }
    case 'ray': {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(3.0 * factor, 2.2 * factor, 4, 1), mkMat({ side: THREE.DoubleSide }));
      wing.rotation.x = -Math.PI / 2; wing.rotation.z = 0; group.add(wing);
      const body = new THREE.Mesh(box(0.6 * factor, 0.12 * factor, 0.9 * factor), mkMat()); body.position.set(0, -0.05, 0.02); group.add(body);
      const tailGeo = new THREE.ConeGeometry(0.06 * factor, 1.8 * factor, 6); const tailMesh = new THREE.Mesh(tailGeo, mkMat()); tailMesh.position.set(-1.4 * factor, 0, 0); group.add(tailMesh); tail = tailMesh;
      break;
    }
    case 'shark': {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * factor, 0.4 * factor, 3.0 * factor, 8), mkMat()); body.rotation.z = Math.PI / 2; group.add(body);
      const head = new THREE.Mesh(cone(0.28 * factor, 0.9 * factor), mkMat()); head.rotation.z = Math.PI / 2; head.position.set(1.2 * factor, 0, 0); group.add(head);
      const dorsal = new THREE.Mesh(cone(0.25 * factor, 0.9 * factor), mkMat()); dorsal.position.set(0.1 * factor, 0.35 * factor, 0); dorsal.rotation.x = Math.PI; group.add(dorsal); appendages.push(dorsal);
      tail = new THREE.Mesh(new THREE.BoxGeometry(0.12 * factor, 0.6 * factor, 1.0 * factor), mkMat()); tail.position.set(-1.4 * factor, 0, 0); group.add(tail);
      break;
    }
    case 'tuna':
    case 'mackerel':
    case 'sardine':
    case 'tuna':
    case 'shark':
    default: {
      // map generic categories to requested types
      if (s.behavior === 'school') {
        const g = new THREE.Group(); const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const f = createSimpleFishMesh(0.45 * factor, mkMat);
          f.group.position.set((Math.random() - 0.5) * 1.6 * factor, (Math.random() - 0.5) * 0.6 * factor, (Math.random() - 0.5) * 0.6 * factor);
          g.add(f.group);
        }
        group.add(g);
        // pick one tail reference if needed
        tail = undefined; // group-level
        break;
      }
      // default generic fish
      const f = createSimpleFishMesh(1.0 * factor, mkMat);
      group.add(f.group); tail = f.tail; appendages.push(...f.appendages); bodyMats.push(...f.bodyMats);
      break;
    }
    case 'octopus': {
      const head = new THREE.Mesh(sphere(0.9 * factor), mkMat()); group.add(head);
      const ag = new THREE.Group(); group.add(ag); appendages.push(ag);
      for (let k = 0; k < 8; k++) {
        const arm = new THREE.Mesh(cyl(0.08 * factor, 0.14 * factor, 1.6 * factor), mkMat()); arm.position.set(Math.cos((k / 8) * Math.PI * 2) * 0.5 * factor, -0.9 * factor, Math.sin((k / 8) * Math.PI * 2) * 0.3 * factor); ag.add(arm);
      }
      break;
    }
    case 'turtle': {
      const shell = new THREE.Mesh(sphere(1.0 * factor), mkMat()); shell.scale.set(1, 0.7, 1.0); group.add(shell);
      const fl = new THREE.Mesh(box(0.4 * factor, 0.08 * factor, 0.8 * factor), mkMat()); fl.position.set(0.2 * factor, -0.5 * factor, 0.4 * factor); group.add(fl); appendages.push(fl);
      break;
    }
  }

  // fallback ensure at least one material present
  if (bodyMats.length === 0) bodyMats.push(mkMat());

  return { group, tail, appendages, bodyMats, pulse };
}

function createSimpleFishMesh(scale: number, mkMat: (opts?: THREE.MeshStandardMaterialParameters) => THREE.MeshStandardMaterial) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6 * scale, 10, 8), mkMat()); body.scale.set(1.2, 0.8, 0.6); group.add(body);
  const tailG = new THREE.Group(); tailG.position.set(-0.75 * scale, 0, 0); group.add(tailG);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.25 * scale, 0.7 * scale, 4), mkMat()); tail.rotation.z = Math.PI / 2; tail.position.set(-0.2 * scale, 0, 0); tailG.add(tail);
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.18 * scale, 0.6 * scale, 4), mkMat()); dorsal.position.set(0.2 * scale, 0.35 * scale, 0); dorsal.rotation.x = Math.PI; group.add(dorsal);
  return { group, tail: tailG, appendages: [dorsal], bodyMats: [mkMat()] };
}
