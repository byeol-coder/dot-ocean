// Multimodal tactile learning session — 3 modes:
//   reveal  : Dot Pad pattern → 3s countdown → name revealed + TTS
//   compare : Two species alternate on Dot Pad; user controls with ← →
//   blind   : Dot Pad pattern only; choose from 4 options

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { text, sizeScale, type Species } from '../data/species';
import { pattern } from '../engine/dotMatrix';
import { DotMatrix } from './DotMatrix';

export type LearnMode = 'reveal' | 'compare' | 'blind';

interface Props {
  mode: LearnMode;
  species: Species[];   // ordered list for this session
  onClose: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Reveal mode ─────────────────────────────────────────────────────────────
function RevealSession({ species, onClose }: { species: Species[]; onClose: () => void }) {
  const a = useApp();
  const { ui, lang } = a;
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'tactile' | 'revealed'>('tactile');
  const [countdown, setCountdown] = useState(3);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = species[idx];
  const t = text(current, lang);

  const renderDotPad = useCallback((s: Species) => {
    const sc = sizeScale(s.sizeCm);
    const g = pattern(s.key, sc);
    a.dotpad.render(g);
  }, [a]);

  // Render on Dot Pad + start countdown when species or phase changes
  useEffect(() => {
    if (done) return;
    renderDotPad(current);
    if (phase === 'tactile') {
      setCountdown(3);
      a.announce(ui.learnFeelIt);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timerRef.current!);
            setPhase('revealed');
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      a.speak(`${t.name}. ${t.tactile}`);
      a.announce(t.name);
      a.sfx('discover');
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx, phase, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    if (idx >= species.length - 1) { setDone(true); return; }
    setIdx((i) => i + 1);
    setPhase('tactile');
  };

  const again = () => {
    setPhase('tactile');
  };

  if (done) {
    return (
      <div className="learn-done">
        <div className="learn-done-icon" aria-hidden="true">🎉</div>
        <h3>{ui.learnSessionDone}</h3>
        <button className="btn-primary" onClick={onClose}>{ui.learnDone}</button>
      </div>
    );
  }

  return (
    <div className="learn-session-body">
      <div className="learn-progress-bar" aria-label={ui.learnProgress(idx + 1, species.length)}>
        {species.map((_, i) => (
          <span key={i} className={'lpb-dot' + (i < idx ? ' done' : i === idx ? ' cur' : '')} />
        ))}
      </div>

      <div className="learn-card">
        {phase === 'tactile' ? (
          <>
            <div className="learn-feel-label" aria-live="polite">
              <span className="learn-feel-icon" aria-hidden="true">⠿</span>
              {ui.learnFeelIt}
            </div>
            <div className="learn-countdown" aria-live="polite" aria-atomic="true">
              {countdown > 0 ? ui.learnRevealIn(countdown) : ''}
            </div>
            <div className="learn-hidden-card" aria-hidden="true">
              <div className="learn-blur-tile">?</div>
            </div>
          </>
        ) : (
          <>
            <DotMatrix speciesKey={current.key} scale={sizeScale(current.sizeCm)} animate={false} ariaLabel={t.name} />
            <h2 className="learn-species-name">{t.name}</h2>
            <p className="learn-scientific" aria-label={`학명: ${current.scientific}`}><em>{current.scientific}</em></p>
            <p className="learn-tactile-desc">{t.tactile}</p>
          </>
        )}
      </div>

      <div className="learn-actions">
        {phase === 'revealed' && (
          <button className="btn-ghost" onClick={again}>{ui.learnAgain}</button>
        )}
        {phase === 'revealed' && (
          <button className="btn-primary" onClick={next}>
            {idx >= species.length - 1 ? ui.learnDone : ui.learnNext} →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Compare mode ─────────────────────────────────────────────────────────────
function CompareSession({ species, onClose }: { species: Species[]; onClose: () => void }) {
  const a = useApp();
  const { ui, lang } = a;
  // Build pairs from the species list
  const pairs = useRef(
    Array.from({ length: Math.floor(species.length / 2) }, (_, i) => [species[i * 2], species[i * 2 + 1]] as [Species, Species])
  ).current;
  const [pairIdx, setPairIdx] = useState(0);
  const [side, setSide] = useState<0 | 1>(0);  // which of the pair is on Dot Pad
  const [done, setDone] = useState(false);

  const pair = pairs[pairIdx] ?? [species[0], species[1]];
  const current = pair[side];
  const other = pair[1 - side];
  const tCur = text(current, lang);
  const tOther = text(other, lang);

  const renderDotPad = useCallback((s: Species) => {
    const sc = sizeScale(s.sizeCm);
    const g = pattern(s.key, sc);
    a.dotpad.render(g);
  }, [a]);

  useEffect(() => {
    renderDotPad(current);
    a.announce(ui.learnNowShowing(tCur.name));
    a.speak(tCur.name);
  }, [pairIdx, side]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrow key control
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setSide((s) => (s === 0 ? 1 : 0));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const nextPair = () => {
    if (pairIdx >= pairs.length - 1) { setDone(true); return; }
    setPairIdx((i) => i + 1);
    setSide(0);
  };

  if (done) {
    return (
      <div className="learn-done">
        <div className="learn-done-icon" aria-hidden="true">🎉</div>
        <h3>{ui.learnSessionDone}</h3>
        <button className="btn-primary" onClick={onClose}>{ui.learnDone}</button>
      </div>
    );
  }

  return (
    <div className="learn-session-body">
      <div className="learn-progress-bar" aria-label={ui.learnProgress(pairIdx + 1, pairs.length)}>
        {pairs.map((_, i) => (
          <span key={i} className={'lpb-dot' + (i < pairIdx ? ' done' : i === pairIdx ? ' cur' : '')} />
        ))}
      </div>

      <p className="learn-switch-hint" aria-hidden="true">{ui.learnSwitchHint}</p>
      <div aria-live="polite" className="sr-only">{ui.learnNowShowing(tCur.name)}</div>

      <div className="compare-pair">
        <div className={'compare-card' + (side === 0 ? ' active' : '')}
          onClick={() => setSide(0)} role="button" tabIndex={0}
          aria-pressed={side === 0} aria-label={text(pair[0], lang).name}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSide(0); } }}>
          <DotMatrix speciesKey={pair[0].key} scale={sizeScale(pair[0].sizeCm)} animate={false} />
          <span className="compare-label">{text(pair[0], lang).name}</span>
          {side === 0 && <span className="compare-active-badge" aria-hidden="true">⠿ Dot Pad</span>}
        </div>

        <button className="compare-switch-btn" onClick={() => setSide((s) => (s === 0 ? 1 : 0))}
          aria-label={`전환: 지금 ${tCur.name}, 다음 ${tOther.name}`}>
          ⇆
        </button>

        <div className={'compare-card' + (side === 1 ? ' active' : '')}
          onClick={() => setSide(1)} role="button" tabIndex={0}
          aria-pressed={side === 1} aria-label={text(pair[1], lang).name}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSide(1); } }}>
          <DotMatrix speciesKey={pair[1].key} scale={sizeScale(pair[1].sizeCm)} animate={false} />
          <span className="compare-label">{text(pair[1], lang).name}</span>
          {side === 1 && <span className="compare-active-badge" aria-hidden="true">⠿ Dot Pad</span>}
        </div>
      </div>

      <div className="learn-actions">
        <button className="btn-primary" onClick={nextPair}>
          {pairIdx >= pairs.length - 1 ? ui.learnDone : `다음 쌍 →`}
        </button>
      </div>
    </div>
  );
}

// ── Blind quiz mode ───────────────────────────────────────────────────────────
function BlindSession({ species, onClose }: { species: Species[]; onClose: () => void }) {
  const a = useApp();
  const { ui, lang } = a;
  const [idx, setIdx] = useState(0);
  const [options, setOptions] = useState<Species[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [done, setDone] = useState(false);

  const current = species[idx];

  const buildOptions = useCallback((answer: Species, pool: Species[]) => {
    const wrong = shuffle(pool.filter((s) => s.key !== answer.key)).slice(0, 3);
    return shuffle([answer, ...wrong]);
  }, []);

  const renderDotPad = useCallback((s: Species) => {
    const sc = sizeScale(s.sizeCm);
    const g = pattern(s.key, sc);
    a.dotpad.render(g);
  }, [a]);

  useEffect(() => {
    if (done) return;
    renderDotPad(current);
    setOptions(buildOptions(current, species));
    setPicked(null);
    a.announce(ui.learnBlindQuestion);
    a.speak(ui.learnBlindQuestion);
  }, [idx, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (key: string) => {
    if (picked) return;
    setPicked(key);
    const correct = key === current.key;
    a.sfx(correct ? 'levelup' : 'danger');
    const name = text(current, lang).name;
    const msg = correct ? ui.quizCorrect(name) : ui.quizWrong(name);
    a.announce(msg); a.speak(msg);
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  };

  const next = () => {
    if (idx >= species.length - 1) { setDone(true); return; }
    setIdx((i) => i + 1);
  };

  if (done) {
    return (
      <div className="learn-done">
        <div className="learn-done-icon" aria-hidden="true">🎉</div>
        <h3>{ui.learnSessionDone}</h3>
        <p className="learn-final-score">{ui.learnScore(score.correct, score.total)}</p>
        <button className="btn-primary" onClick={onClose}>{ui.learnDone}</button>
      </div>
    );
  }

  return (
    <div className="learn-session-body">
      <div className="learn-progress-bar" aria-label={ui.learnProgress(idx + 1, species.length)}>
        {species.map((_, i) => (
          <span key={i} className={'lpb-dot' + (i < idx ? ' done' : i === idx ? ' cur' : '')} />
        ))}
      </div>

      <p className="learn-score-line" aria-live="polite">
        {ui.learnScore(score.correct, score.total)}
      </p>

      <div className="learn-blind-pad">
        <span className="learn-feel-icon" aria-hidden="true">⠿</span>
        <span>{ui.learnFeelIt}</span>
      </div>

      <p className="learn-blind-question">{ui.learnBlindQuestion}</p>

      <div className="blind-options" role="group" aria-label={ui.learnBlindQuestion}>
        {options.map((opt) => {
          const tOpt = text(opt, lang);
          const state = picked
            ? opt.key === current.key ? ' correct' : opt.key === picked ? ' wrong' : ' faded'
            : '';
          return (
            <button key={opt.key}
              className={'blind-opt' + state}
              onClick={() => choose(opt.key)}
              disabled={!!picked}
              aria-pressed={picked === opt.key}>
              {tOpt.name}
              {picked && opt.key === current.key && <span aria-hidden="true"> ✓</span>}
              {picked && opt.key === picked && opt.key !== current.key && <span aria-hidden="true"> ✕</span>}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="learn-reveal-result" role="status" aria-live="polite">
          <p className={picked === current.key ? 'ok' : 'no'}>
            {picked === current.key ? ui.quizCorrect(text(current, lang).name) : ui.quizWrong(text(current, lang).name)}
          </p>
          <button className="btn-primary" onClick={next}>
            {idx >= species.length - 1 ? ui.learnDone : ui.learnNext} →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main wrapper ─────────────────────────────────────────────────────────────
export function TactileLearnSession({ mode, species: rawSpecies, onClose }: Props) {
  const a = useApp();
  const { ui } = a;
  const dialogRef = useRef<HTMLDivElement>(null);

  // Shuffle species for variety; ensure at least 1 for reveal/blind, 2 for compare
  const species = useRef(shuffle(rawSpecies)).current;

  const modeLabel = mode === 'reveal' ? ui.learnReveal : mode === 'compare' ? ui.learnCompare : ui.learnBlind;

  // Focus trap
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const sel = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // stopImmediatePropagation prevents App.tsx window Escape handler from
        // also closing the parent CurriculumPanel when only the session should close.
        e.stopImmediatePropagation();
        onClose(); return;
      }
      if (e.key !== 'Tab') return;
      const nodes = [...dialog.querySelectorAll<HTMLElement>(sel)];
      if (!nodes.length) { e.preventDefault(); return; }
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [onClose]);

  return (
    <div className="overlay-scrim center learn-session-overlay">
      <div className="learn-session-panel glass" role="dialog" aria-modal="true"
        aria-label={modeLabel} ref={dialogRef} tabIndex={-1}>
        <div className="panel-head">
          <h2>{modeLabel}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={ui.close} autoFocus>✕</button>
        </div>

        {mode === 'reveal' && <RevealSession species={species} onClose={onClose} />}
        {mode === 'compare' && species.length >= 2
          ? <CompareSession species={species} onClose={onClose} />
          : mode === 'compare' && <p className="empty">{ui.learnDiscoverFirst}</p>
        }
        {mode === 'blind' && species.length >= 4
          ? <BlindSession species={species} onClose={onClose} />
          : mode === 'blind' && <p className="empty">{ui.learnDiscoverFirst}</p>
        }
      </div>
    </div>
  );
}
