import { byKey, text } from '../data/species';
import { useApp } from '../state/AppContext';
import { DotMatrix } from './DotMatrix';

interface Props { speciesKey: string; }

export function TactilePopup({ speciesKey }: Props) {
  const { ui, lang } = useApp();
  const s = byKey[speciesKey];
  if (!s) return null;
  const t = text(s, lang);
  return (
    <div className="tactile-popup glass" role="dialog" aria-label={`${t.name} ${ui.dotpadPreview}`}>
      <div className="tp-head">
        <span className="tp-name">{t.name}</span>
        <span className="tp-sub">{lang === 'ko' ? s.en.name : s.ko.name}</span>
      </div>
      <DotMatrix speciesKey={speciesKey} ariaLabel={`${t.name}, ${t.tactile}`} />
      <div className="tp-meta">
        <span><i>{ui.size}</i>{s.sizeCm} cm</span>
        <span><i>{ui.shape}</i>{t.tactile.split(',')[0].split('+')[0].trim()}</span>
        <span><i>{ui.direction}</i>{ui.right}</span>
      </div>
      <p className="tp-tactile">{t.tactile}</p>
      <div className="tp-sim">{ui.simLabel}</div>
    </div>
  );
}
