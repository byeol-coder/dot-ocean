import { useState } from 'react';
import { DISCOVERABLE, byKey, text, type Species } from '../data/species';
import { useApp } from '../state/AppContext';
import { DotMatrix } from './DotMatrix';

const dangerColor = ['var(--d0)', 'var(--d1)', 'var(--d2)', 'var(--d3)'];

function Detail({ s, onBack }: { s: Species; onBack: () => void }) {
  const a = useApp();
  const { ui, lang } = a;
  const t = text(s, lang);
  const [layer, setLayer] = useState<'sil' | 'parts'>('sil');
  return (
    <div className="ency-detail">
      <button className="btn-ghost back-btn" onClick={onBack}>← {ui.back}</button>
      <div className="detail-head">
        <h3>{t.name}<small>{lang === 'ko' ? s.en.name : s.ko.name} · {s.sizeCm} cm</small></h3>
        <span className="pill" style={{ background: dangerColor[s.danger] + '22', color: dangerColor[s.danger] }}>{ui.danger[s.danger]}</span>
      </div>

      <div className="dotpad-shell">
        <DotMatrix speciesKey={s.key} layer={layer} ariaLabel={`${t.name}, ${t.tactile}`} />
        <div className="dotpad-cap">
          <span className="sim">{ui.simLabel}</span><span className="res">60 × 40</span>
        </div>
        <div className="layer-toggle">
          <button aria-pressed={layer === 'sil'} onClick={() => setLayer('sil')}>{ui.silhouette}</button>
          <button aria-pressed={layer === 'parts'} onClick={() => setLayer('parts')}>{ui.partsLayer}</button>
        </div>
      </div>

      <p className="tactile-line">“{t.tactile}”</p>

      <div className="facts">
        <div className="fact"><div className="k">{ui.classification}</div><div className="v">{t.classification}</div></div>
        <div className="fact"><div className="k">{ui.size}</div><div className="v">{s.sizeCm} cm</div></div>
        <div className="fact"><div className="k">{ui.habitat}</div><div className="v">{t.habitat}</div></div>
        <div className="fact"><div className="k">{ui.region}</div><div className="v">{t.region}</div></div>
      </div>

      <div className="fact wide">
        <div className="k">{ui.features}</div>
        <ul className="feat-list">{t.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
      </div>

      <div className="foodchain">
        <div className="k">{ui.foodchain}</div>
        <div className="fc-row">
          <span className="fc-cell">{t.prey}</span>
          <span className="fc-arrow">→ {t.name} →</span>
          <span className="fc-cell">{t.predator}</span>
        </div>
        <div className="fc-legend"><span>{ui.eats}</span><span>{ui.eatenBy}</span></div>
      </div>

      <button className="btn-primary touch-btn" onClick={() => { a.sfx('send'); const msg = `${t.name} ${ui.sentToPad}`; a.announce(msg); a.speak(`${t.name}. ${t.tactile}`); }}>
        ✋ {ui.touchWithDotpad}
      </button>
    </div>
  );
}

export function Encyclopedia({ discovered, onClose }: { discovered: Set<string>; onClose: () => void }) {
  const a = useApp();
  const { ui, lang } = a;
  const [selected, setSelected] = useState<string | null>(null);
  const total = DISCOVERABLE.length;
  const found = DISCOVERABLE.filter((s) => discovered.has(s.key)).length;

  return (
    <div className="mode-screen">
      <div className="mode-head">
        <h1>{ui.encyTitle}</h1>
        <div className="mode-progress" aria-label={`${ui.encyProgress} ${found} / ${total}`}>
          <div className="mp-track"><i style={{ width: (found / total) * 100 + '%' }} /></div>
          <span>{found} / {total}</span>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label={ui.close}>✕</button>
      </div>

      {selected ? (
        <Detail s={byKey[selected]} onBack={() => setSelected(null)} />
      ) : found === 0 ? (
        <p className="empty">{ui.encyEmpty}</p>
      ) : (
        <div className="ency-grid">
          {DISCOVERABLE.map((s) => {
            const known = discovered.has(s.key);
            const t = text(s, lang);
            if (!known) {
              return (
                <div key={s.key} className="ency-card locked" aria-label={ui.undiscovered}>
                  <div className="ec-mini lockmark">?</div>
                  <h4>???</h4><span className="en">{ui.undiscovered}</span>
                </div>
              );
            }
            return (
              <button key={s.key} className="ency-card" onClick={() => { a.sfx('select'); setSelected(s.key); }}
                aria-label={`${t.name}, ${ui.danger[s.danger]}, ${t.tactile}`}>
                <div className="ec-mini"><DotMatrix speciesKey={s.key} animate={false} ariaLabel="" /></div>
                <h4>{t.name}<span className="pill sm" style={{ background: dangerColor[s.danger] + '22', color: dangerColor[s.danger] }}>{ui.danger[s.danger]}</span></h4>
                <span className="en">{lang === 'ko' ? s.en.name : s.ko.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
