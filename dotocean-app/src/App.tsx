import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from './state/AppContext';
import { byKey, text } from './data/species';
import type { GameStats } from './engine/game';
import { TopBar } from './components/TopBar';
import { FloatingNav } from './components/FloatingNav';
import { GameCanvas } from './components/GameCanvas';
import { TactilePopup } from './components/TactilePopup';
import { SettingsPanel } from './components/SettingsPanel';
import { Encyclopedia } from './components/Encyclopedia';
import { Mission } from './components/Mission';
import { Tutorial } from './components/Tutorial';
import { DotMatrix } from './components/DotMatrix';

type Overlay = 'none' | 'tutorial' | 'settings' | 'encyclopedia' | 'mission' | 'dotpad';

export default function App() {
  const a = useApp();
  const { ui, lang, highContrast, reducedMotion } = a;
  const [overlay, setOverlay] = useState<Overlay>('tutorial');
  const [stats, setStats] = useState<GameStats>({ level: 1, xp: 0, xpNext: 200, sizeFactor: 1, discovered: 0, total: 1 });
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const lastFocus = useRef<string | null>(null);
  const scanRef = useRef<() => void>(() => {});

  const paused = overlay !== 'none';
  const blocking = paused;

  // apply body classes for a11y modes
  useEffect(() => {
    document.body.classList.toggle('hc', highContrast);
    document.body.classList.toggle('reduce', reducedMotion);
  }, [highContrast, reducedMotion]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // Esc closes overlays
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && overlay !== 'tutorial') setOverlay('none'); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [overlay]);

  const onDiscover = useCallback((key: string) => {
    setDiscovered((prev) => { if (prev.has(key)) return prev; const next = new Set(prev); next.add(key); return next; });
    const s = byKey[key]; if (!s) return;
    const name = text(s, lang).name;
    a.sfx('discover'); a.announce(ui.evDiscover(name)); a.speak(ui.evDiscover(name));
  }, [a, ui, lang]);

  const onFocus = useCallback((key: string | null) => {
    setFocusKey(key);
    if (key) lastFocus.current = key;
  }, []);

  const onEvent = useCallback((kind: 'eat' | 'levelup' | 'danger', key: string, level?: number) => {
    const s = byKey[key];
    if (kind === 'eat') { a.sfx('eat'); }
    else if (kind === 'levelup') { a.sfx('levelup'); const msg = ui.evLevelUp(level ?? stats.level); a.announce(msg); a.speak(msg); }
    else if (kind === 'danger' && s) { a.sfx('danger'); const msg = ui.evDanger(text(s, lang).name); a.announce(msg); a.speak(msg); }
  }, [a, ui, lang, stats.level]);

  const registerScan = useCallback((fn: () => void) => { scanRef.current = fn; }, []);

  const openTutorialDone = useCallback(() => { a.initAudio(); a.sfx('select'); setOverlay('none'); }, [a]);

  return (
    <div className={'app' + (highContrast ? ' hc' : '')}>
      <div className="game-layer" aria-hidden={blocking ? true : undefined}>
        <GameCanvas
          paused={paused}
          onStats={setStats}
          onDiscover={onDiscover}
          onFocus={onFocus}
          onEvent={onEvent}
          registerScan={registerScan}
        />
      </div>

      <TopBar level={stats.level} xp={stats.xp} xpNext={stats.xpNext}
        discovered={stats.discovered} total={stats.total}
        onSettings={() => { a.sfx('select'); setOverlay('settings'); }} />

      <FloatingNav
        onEncyclopedia={() => { a.sfx('select'); setOverlay('encyclopedia'); }}
        onMission={() => { a.sfx('select'); setOverlay('mission'); }}
        onDotpad={() => { a.sfx('select'); setOverlay('dotpad'); }}
        onTutorial={() => { a.sfx('select'); setOverlay('tutorial'); }}
      />

      {/* transient tactile preview during gameplay */}
      {overlay === 'none' && focusKey && <TactilePopup speciesKey={focusKey} />}

      {/* scan button (visible essential control) */}
      {overlay === 'none' && (
        <button className="scan-fab" onClick={() => scanRef.current()} aria-label={ui.keyScan}>⌖</button>
      )}

      {overlay === 'tutorial' && <Tutorial onDone={openTutorialDone} />}
      {overlay === 'settings' && <SettingsPanel onClose={() => setOverlay('none')} />}
      {overlay === 'encyclopedia' && <Encyclopedia discovered={discovered} onClose={() => setOverlay('none')} />}
      {overlay === 'mission' && <Mission discovered={discovered} level={stats.level} onClose={() => setOverlay('none')} />}
      {overlay === 'dotpad' && (
        <div className="overlay-scrim center" onClick={() => setOverlay('none')}>
          <div className="dotpad-modal glass" role="dialog" aria-label={ui.navDotpad} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>Dot Pad</h2>
              <button className="icon-btn" onClick={() => setOverlay('none')} aria-label={ui.close}>✕</button>
            </div>
            <div className="dotpad-row">
              <span className={'dot-status' + (a.dotpadConnected ? ' on' : '')}>{a.dotpadConnected ? ui.connected : ui.off}</span>
              {!a.dotpadConnected && (
                <button className="btn-ghost" onClick={() => { a.setDotpadConnected(true); a.sfx('send'); a.announce(ui.evConnected); a.speak(ui.evConnected); }}>🔗 {ui.connect}</button>
              )}
            </div>
            {lastFocus.current ? (
              <>
                <DotMatrix speciesKey={lastFocus.current} ariaLabel={`${text(byKey[lastFocus.current], lang).name}`} />
                <div className="dotpad-cap"><span className="sim">{ui.simLabel}</span><span className="res">60 × 40</span></div>
                <button className="btn-primary touch-btn" onClick={() => { const k = lastFocus.current; if (!k) return; a.sfx('send'); const t = text(byKey[k], lang); a.announce(`${t.name} ${ui.sentToPad}`); a.speak(`${t.name}. ${t.tactile}`); }}>
                  ✋ {ui.touchWithDotpad}
                </button>
              </>
            ) : (
              <p className="empty small">{lang === 'ko' ? '가까운 생물에 다가가면 여기에 촉각 미리보기가 떠요.' : 'Approach a creature to see its tactile preview here.'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
