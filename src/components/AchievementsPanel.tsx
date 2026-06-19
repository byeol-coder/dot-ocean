import { ACHIEVEMENTS } from '../data/achievements';
import { useApp } from '../state/AppContext';

interface Props {
  unlockedIds: Set<string>;
  onClose: () => void;
}

export function AchievementsPanel({ unlockedIds, onClose }: Props) {
  const { ui, lang } = useApp();
  const unlockedCount = ACHIEVEMENTS.filter(a => unlockedIds.has(a.id)).length;
  const heading = lang === 'ko'
    ? `업적 (${unlockedCount} / ${ACHIEVEMENTS.length})`
    : `Achievements (${unlockedCount} / ${ACHIEVEMENTS.length})`;

  return (
    <div className="overlay-scrim" onClick={onClose}>
      <div className="panel glass achievements-panel" role="dialog" aria-modal="true"
           aria-label={heading} onClick={e => e.stopPropagation()}>
        <div className="panel-head">
          <h2>{heading}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={ui.close}>✕</button>
        </div>
        <div className="achieve-grid">
          {ACHIEVEMENTS.map(a => {
            const unlocked = unlockedIds.has(a.id);
            const t = lang === 'ko' ? a.ko : a.en;
            return (
              <div key={a.id}
                   className={'achieve-card' + (unlocked ? ' unlocked' : '')}
                   aria-label={`${t.name}: ${t.desc}${unlocked ? '' : (lang === 'ko' ? ' (미달성)' : ' (not yet)')}`}>
                <span className="achieve-card-icon" aria-hidden="true">{unlocked ? a.icon : '🔒'}</span>
                <div className="achieve-card-text">
                  <div className="achieve-card-name">{t.name}</div>
                  <div className="achieve-card-desc">{unlocked ? t.desc : (lang === 'ko' ? '아직 미달성' : 'Not yet')}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
