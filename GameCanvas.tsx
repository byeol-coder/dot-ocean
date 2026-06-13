import { useEffect, useRef } from 'react';
import { OceanGame, type GameStats } from '../engine/game';
import { useApp } from '../state/AppContext';

interface Props {
  paused: boolean;
  onStats: (s: GameStats) => void;
  onDiscover: (key: string) => void;
  onFocus: (key: string | null) => void;
  onEvent: (kind: 'eat' | 'levelup' | 'danger', key: string, level?: number) => void;
  registerScan: (fn: () => void) => void;
}

export function GameCanvas({ paused, onStats, onDiscover, onFocus, onEvent, registerScan }: Props) {
  const { highContrast, reducedMotion } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<OceanGame | null>(null);

  // keep latest flags in refs for the engine getters
  const flags = useRef({ highContrast, reducedMotion, paused });
  flags.current = { highContrast, reducedMotion, paused };

  // keep latest callbacks in refs to avoid re-init
  const cbs = useRef({ onStats, onDiscover, onFocus, onEvent });
  cbs.current = { onStats, onDiscover, onFocus, onEvent };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new OceanGame(
      canvas,
      {
        highContrast: () => flags.current.highContrast,
        reducedMotion: () => flags.current.reducedMotion,
        paused: () => flags.current.paused,
      },
      {
        onStats: (s) => cbs.current.onStats(s),
        onDiscover: (k) => cbs.current.onDiscover(k),
        onFocus: (k) => cbs.current.onFocus(k),
        onEvent: (kind, k, lv) => cbs.current.onEvent(kind, k, lv),
      },
    );
    gameRef.current = game;
    game.start();
    registerScan(() => game.scanNearest());

    const kd = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
      if (e.key === ' ') { game.scanNearest(); return; }
      game.setKey(e.key, true);
    };
    const ku = (e: KeyboardEvent) => game.setKey(e.key, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const toCanvas = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * 2 - 1;
      const y = ((clientY - r.top) / r.height) * 2 - 1;
      const m = Math.hypot(x, y) || 1; const k = Math.min(1, m) / m;
      return { x: x * k, y: y * k };
    };
    let dragging = false;
    const pd = (e: PointerEvent) => { dragging = true; game.setPointer(toCanvas(e.clientX, e.clientY)); };
    const pm = (e: PointerEvent) => { if (dragging) game.setPointer(toCanvas(e.clientX, e.clientY)); };
    const pu = () => { dragging = false; game.setPointer(null); };
    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);

    return () => {
      game.stop();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      canvas.removeEventListener('pointerdown', pd);
      canvas.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="sea-canvas"
      tabIndex={0}
      aria-label="바다 탐험 화면. 화살표 키 또는 WASD로 이동하고, Space로 가장 가까운 생물을 스캔하세요."
    />
  );
}
