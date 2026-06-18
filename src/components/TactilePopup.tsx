import { useEffect } from 'react';
import { byKey, text, sizeScale } from '../data/species';
import { useApp } from '../state/AppContext';
import { DotMatrix } from './DotMatrix';
import { pattern } from '../engine/dotMatrix';
import { getDtmsPattern } from '../data/dtmsPatterns';

interface Props {
  speciesKey: string;
  onDismiss?: () => void;
  focusActive?: boolean;
}

export function TactilePopup({ speciesKey, onDismiss, focusActive }: Props) {
  const a = useApp();
  const { ui, lang } = a;

  useEffect(() => {
    const dtms = getDtmsPattern(speciesKey);
    if (dtms) {
      a.dotpad.renderHex(dtms);
    } else {
      const s = byKey[speciesKey];
      if (s) a.dotpad.render(pattern(speciesKey, sizeScale(s.sizeCm)));
    }
  }, [speciesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = byKey[speciesKey];
  if (!s) return null;
  const t = text(s, lang);
  const danger = s.danger >= 2;
  const cls = 'tactile-popup glass'
    + (danger ? ' danger' : '')
    + (focusActive ? ' focus-active' : '');

  return (
    <div className={cls} role="dialog" aria-modal={focusActive ? true : undefined} aria-label={`${t.name} ${ui.dotpadPreview}`}>
      <div className="tp-head">
        <span className="tp-name">{t.name}</span>
        <span className="tp-sub">{lang === 'ko' ? s.en.name : s.ko.name}</span>
      </div>
      {danger && <div className="tp-warn" role="status">⚠ {ui.danger[s.danger]}</div>}
      <DotMatrix speciesKey={speciesKey} scale={sizeScale(s.sizeCm)} ariaLabel={`${t.name}, ${t.tactile}`} />
      <div className="tp-meta">
        <span><i>{ui.size}</i>{s.sizeCm} cm</span>
        <span><i>{ui.tailShape}</i>{t.tailShape}</span>
        <span><i>{ui.direction}</i>{ui.right}</span>
      </div>
      <p className="tp-tactile">{t.tactile}</p>
      <div className="tp-sim">{ui.simLabel}</div>
      {onDismiss && (
        <button className="tp-continue" onClick={onDismiss} autoFocus>
          {lang === 'ko' ? '계속 탐험하기 ▶' : 'Continue ▶'}
        </button>
      )}
    </div>
  );
}
