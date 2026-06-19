import { useEffect } from 'react';
import type { Achievement } from '../data/achievements';
import { useApp } from '../state/AppContext';

interface Props {
  queue: Achievement[];
  lang: 'ko' | 'en';
  onDismiss: (id: string) => void;
}

export function AchievementToast({ queue, lang, onDismiss }: Props) {
  const { speak } = useApp();
  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const t = lang === 'ko'
      ? `업적 달성! ${current.ko.name}. ${current.ko.desc}`
      : `Achievement unlocked: ${current.en.name}. ${current.en.desc}`;
    speak(t);
    const timer = setTimeout(() => onDismiss(current.id), 4000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;
  const t = lang === 'ko' ? current.ko : current.en;

  return (
    <div className="achieve-toast glass" role="alert" aria-live="assertive">
      <span className="achieve-icon" aria-hidden="true">{current.icon}</span>
      <div className="achieve-text">
        <div className="achieve-label">{lang === 'ko' ? '업적 달성!' : 'Achievement!'}</div>
        <div className="achieve-name">{t.name}</div>
        <div className="achieve-desc">{t.desc}</div>
      </div>
    </div>
  );
}
