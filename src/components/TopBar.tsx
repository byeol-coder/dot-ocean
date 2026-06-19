import { useApp } from '../state/AppContext';
import type { DailyChallenge } from '../state/daily';

interface Props {
  level: number; xp: number; xpNext: number; discovered: number; total: number;
  streakDays: number;
  dailyChallenge: DailyChallenge | null;
  dailyProgress: number;
  dailyCompleted: boolean;
  onSettings: () => void;
}

export function TopBar({ level, xp, xpNext, discovered, total, streakDays, dailyChallenge, dailyProgress, dailyCompleted, onSettings }: Props) {
  const { ui, lang } = useApp();
  const pct = Math.max(0, Math.min(100, (xp / xpNext) * 100));
  const dc = dailyChallenge;
  const dcPct = dc ? Math.min(100, (dailyProgress / dc.target) * 100) : 0;
  const dcLabel = dc ? (lang === 'ko' ? dc.ko.title : dc.en.title) : '';

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">🪸</span>
        <span className="brand-name">{ui.appName}</span>
      </div>

      <div className="xp-cluster" aria-label={`${ui.level}${level}, XP ${xp} / ${xpNext}`}>
        <span className="lv-chip">{ui.level}{level}</span>
        <div className="xp-track"><i style={{ width: pct + '%' }} /></div>
        <span className="xp-num">{xp}<small>/{xpNext}</small></span>
      </div>

      {dc && (
        <div className={'daily-chip' + (dailyCompleted ? ' done' : '')}
             aria-label={`${ui.dailyTitle}: ${dcLabel} ${ui.dailyProgress(dailyProgress, dc.target)}`}
             title={`${ui.dailyTitle}: ${dcLabel}`}>
          <span aria-hidden="true">{dailyCompleted ? '✅' : dc.icon}</span>
          <div className="daily-bar-wrap">
            <div className="daily-bar"><i style={{ width: dcPct + '%' }} /></div>
            <span className="daily-fraction">{ui.dailyProgress(dailyProgress, dc.target)}</span>
          </div>
        </div>
      )}

      <div className="topbar-right">
        {streakDays > 0 && (
          <div className="streak-chip" aria-label={ui.streakLabel(streakDays)}>
            <span aria-hidden="true">🔥</span>
            <span>{streakDays}</span>
          </div>
        )}
        <div className="found-chip" aria-label={`${ui.discovered} ${discovered} / ${total}`}>
          <span aria-hidden="true">📖</span>
          <b>{discovered}</b><small>/{total}</small>
        </div>
        <button className="icon-btn" onClick={onSettings} aria-label={ui.settingsTitle}>⚙️</button>
      </div>
    </header>
  );
}
