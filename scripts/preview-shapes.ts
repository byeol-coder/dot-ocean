import { generateGrid, type TactileShape, type ShapeKind } from '../src/engine/tactileGen';

const samples: { name: string; shape: TactileShape }[] = [
  { name: 'clownfish (fish/stripes)', shape: { kind: 'fish', len: 0.5, girth: 0.5, tail: 'fan', dorsal: 'low', pelvic: true, feature: ['stripes'] } },
  { name: 'tuna (fish/crescent)', shape: { kind: 'fish', len: 0.72, girth: 0.4, tail: 'crescent' } },
  { name: 'angelfish (disk/banner)', shape: { kind: 'disk', dorsal: 'banner', feature: ['stripes'] } },
  { name: 'hammerhead (shark/hammer)', shape: { kind: 'shark', feature: ['hammer'] } },
  { name: 'stingray (ray/whip)', shape: { kind: 'ray', tail: 'whip' } },
  { name: 'moray (eel)', shape: { kind: 'eel', feature: ['snout'] } },
  { name: 'octopus', shape: { kind: 'octopus' } },
  { name: 'squid', shape: { kind: 'squid' } },
  { name: 'seahorse', shape: { kind: 'seahorse' } },
  { name: 'turtle', shape: { kind: 'turtle' } },
  { name: 'crab', shape: { kind: 'crab' } },
  { name: 'shrimp', shape: { kind: 'shrimp' } },
  { name: 'starfish', shape: { kind: 'star' } },
  { name: 'lionfish', shape: { kind: 'lionfish', feature: ['stripes'] } },
  { name: 'swordfish', shape: { kind: 'swordfish' } },
  { name: 'dolphin', shape: { kind: 'dolphin' } },
  { name: 'jelly', shape: { kind: 'jelly' } },
  { name: 'pufferish (round/spikes)', shape: { kind: 'round', feature: ['spikes'] } },
  { name: 'barracuda (elongated/snout)', shape: { kind: 'elongated', feature: ['snout'] } },
  { name: 'whaleshark (shark/spots big)', shape: { kind: 'shark', len: 0.82, girth: 0.42, feature: ['spots'] } },
];

for (const { name, shape } of samples) {
  const g = generateGrid(shape);
  console.log('\n=== ' + name + ' ===');
  for (const row of g) console.log(row.map((v) => (v ? '#' : '·')).join(''));
}
void (0 as unknown as ShapeKind);
