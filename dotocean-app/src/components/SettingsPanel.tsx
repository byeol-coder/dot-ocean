import { useApp } from '../state/AppContext';

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (b: boolean) => void }) {
  const { ui } = useApp();
  return (
    <button className="row-toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="rt-label">{label}</span>
      <span className={'switch' + (on ? ' on' : '')}><i /></span>
      <span className="rt-state">{on ? ui.on : ui.off}</span>
    </button>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const a = useApp();
  const { ui } = a;
  return (
    <div className="overlay-scrim" onClick={onClose}>
      <aside className="settings-panel glass" role="dialog" aria-label={ui.settingsTitle} onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>{ui.settingsTitle}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={ui.close}>✕</button>
        </div>

        <div className="settings-group">
          <Toggle label={ui.sound} on={a.sound} onChange={a.setSound} />
          <Toggle label={ui.tts} on={a.tts} onChange={(v) => { a.setTts(v); if (v) a.speak(ui.tts); }} />
          <Toggle label={ui.highContrast} on={a.highContrast} onChange={a.setHighContrast} />
          <Toggle label={ui.reducedMotion} on={a.reducedMotion} onChange={a.setReducedMotion} />
        </div>

        <div className="settings-group">
          <div className="group-label">{ui.dotpadStatus}</div>
          <div className="dotpad-row">
            <span className={'dot-status' + (a.dotpadConnected ? ' on' : '')}>{a.dotpadConnected ? ui.connected : ui.off}</span>
            {!a.dotpadConnected && (
              <button className="btn-ghost" onClick={() => { a.setDotpadConnected(true); a.sfx('send'); a.announce(ui.evConnected); a.speak(ui.evConnected); }}>
                🔗 {ui.connect}
              </button>
            )}
          </div>
        </div>

        <div className="settings-group">
          <div className="group-label">{ui.language}</div>
          <div className="lang-toggle">
            <button className={a.lang === 'ko' ? 'on' : ''} aria-pressed={a.lang === 'ko'} onClick={() => a.setLang('ko')}>한국어</button>
            <button className={a.lang === 'en' ? 'on' : ''} aria-pressed={a.lang === 'en'} onClick={() => a.setLang('en')}>English</button>
          </div>
        </div>

        <div className="settings-group">
          <div className="group-label">{ui.keyboardGuide}</div>
          <ul className="key-guide">
            <li><kbd>← ↑ → ↓</kbd> / <kbd>W A S D</kbd><span>{ui.keyMove}</span></li>
            <li><kbd>Space</kbd><span>{ui.keyScan}</span></li>
            <li><kbd>Esc</kbd><span>{ui.keyClose}</span></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
