import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { CURRICULUM, type CurriculumLevel } from '../data/curriculum';
import { text, sizeScale, type Species } from '../data/species';
import { DotMatrix } from './DotMatrix';
import { TactileLearnSession, type LearnMode } from './TactileLearnSession';

interface Props {
  discovered: Set<string>;
  curriculumLevel: number;   // 1–5, highest unlocked tier
  onClose: () => void;
}

function LevelCard({ cl, isUnlocked, isActive, onClick }: {
  cl: CurriculumLevel; isUnlocked: boolean; isActive: boolean; onClick: () => void;
}) {
  const { ui } = useApp();
  const label = ui.learnLevelLabel(cl.level);
  return (
    <button
      className={'curriculum-level-btn' + (isActive ? ' active' : '') + (isUnlocked ? '' : ' locked')}
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={`${label}: ${isUnlocked ? cl.titleKo : ui.learnLocked}`}>
      <span className="cl-num">{cl.level}</span>
      <span className="cl-title">{isUnlocked ? cl.titleKo : ui.learnLocked}</span>
      {!isUnlocked && <span className="cl-lock" aria-hidden="true">🔒</span>}
    </button>
  );
}

function SpeciesGrid({ species, discovered, lang }: { species: Species[]; discovered: Set<string>; lang: 'ko' | 'en' }) {
  const isDisc = (s: Species) => discovered.has(s.key);
  return (
    <div className="curriculum-species-grid">
      {species.map((s) => {
        const t = text(s, lang);
        const known = isDisc(s);
        return (
          <div key={s.key} className={'cl-species-card' + (known ? ' known' : ' locked')}
            aria-label={known ? t.name : '미발견'}>
            {known ? (
              <>
                <DotMatrix speciesKey={s.key} scale={sizeScale(s.sizeCm)} animate={false} ariaLabel={t.name} />
                <span className="cl-species-name">{t.name}</span>
              </>
            ) : (
              <span className="cl-species-unknown" aria-hidden="true">?</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CurriculumPanel({ discovered, curriculumLevel, onClose }: Props) {
  const a = useApp();
  const { ui, lang } = a;
  const [activeLevel, setActiveLevel] = useState(curriculumLevel);
  const [session, setSession] = useState<{ mode: LearnMode; species: Species[] } | null>(null);

  const cl = CURRICULUM[activeLevel - 1];
  const isUnlocked = activeLevel <= curriculumLevel;

  const discAtLevel = cl.species.filter((s) => discovered.has(s.key));
  const totalAtLevel = cl.species.length;

  const startSession = (mode: LearnMode) => {
    if (!isUnlocked) return;
    // Reveal: all species at level. Compare/Blind: need enough for meaningful session.
    const pool = mode === 'reveal'
      ? cl.species
      : mode === 'compare'
        ? cl.species.length >= 2 ? cl.species : []
        : cl.species.length >= 4 ? cl.species : [];
    if (!pool.length) { a.announce(ui.learnDiscoverFirst); return; }
    a.sfx('select');
    setSession({ mode, species: pool });
  };

  if (session) {
    return (
      <TactileLearnSession
        mode={session.mode}
        species={session.species}
        onClose={() => setSession(null)}
      />
    );
  }

  return (
    <div className="mode-screen curriculum-screen">
      <div className="mode-head">
        <h1>{ui.learnTitle}</h1>
        <button className="icon-btn" onClick={onClose} aria-label={ui.close}>✕</button>
      </div>

      {/* Level selector */}
      <nav className="curriculum-level-track" aria-label="커리큘럼 단계">
        {CURRICULUM.map((c) => (
          <LevelCard
            key={c.level}
            cl={c}
            isUnlocked={c.level <= curriculumLevel}
            isActive={c.level === activeLevel}
            onClick={() => setActiveLevel(c.level)}
          />
        ))}
      </nav>

      {/* Level detail */}
      <div className="curriculum-detail">
        <div className="curriculum-meta">
          <div className="curriculum-meta-row">
            <span className="cl-badge">{ui.learnLevelLabel(cl.level)}</span>
            <h2>{lang === 'ko' ? cl.titleKo : cl.titleEn}</h2>
            <span className="cl-progress-text">
              {discAtLevel.length} / {totalAtLevel}
            </span>
          </div>

          <div className="cl-progress-track">
            <div className="cl-progress-fill" style={{ width: `${(discAtLevel.length / totalAtLevel) * 100}%` }} />
          </div>

          {isUnlocked ? (
            <>
              <p className="cl-objective">
                <strong>{ui.learnObjective}:</strong>{' '}
                {lang === 'ko' ? cl.objectiveKo : cl.objectiveEn}
              </p>
              <p className="cl-focus">
                <strong>{ui.learnFocus}:</strong>{' '}
                {lang === 'ko' ? cl.focusKo : cl.focusEn}
              </p>
            </>
          ) : (
            <p className="cl-unlock-hint">
              🔒 {lang === 'ko' ? cl.unlockHintKo : cl.unlockHintEn}
            </p>
          )}
        </div>

        {/* Species grid */}
        <SpeciesGrid species={cl.species} discovered={discovered} lang={lang} />

        {/* Session launcher buttons */}
        {isUnlocked && (
          <div className="curriculum-session-btns">
            <button className="learn-mode-btn" onClick={() => startSession('reveal')}>
              <span className="lmb-icon" aria-hidden="true">▶</span>
              <span className="lmb-title">{ui.learnReveal}</span>
              <span className="lmb-hint">{ui.learnRevealHint}</span>
            </button>
            <button className="learn-mode-btn" onClick={() => startSession('compare')}
              disabled={cl.species.length < 2}>
              <span className="lmb-icon" aria-hidden="true">⇆</span>
              <span className="lmb-title">{ui.learnCompare}</span>
              <span className="lmb-hint">{ui.learnCompareHint}</span>
            </button>
            <button className="learn-mode-btn" onClick={() => startSession('blind')}
              disabled={cl.species.length < 4}>
              <span className="lmb-icon" aria-hidden="true">⠿</span>
              <span className="lmb-title">{ui.learnBlind}</span>
              <span className="lmb-hint">{ui.learnBlindHint}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
