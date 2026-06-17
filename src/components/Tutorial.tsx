import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';

export function Tutorial({ onDone, closeable }: { onDone: () => void; closeable?: boolean }) {
  const { ui } = useApp();
  const [i, setI] = useState(0);
  const steps = ui.tutSteps;
  const last = i === steps.length - 1;
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap: keep Tab cycling within the dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const sel = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeable) { onDone(); return; }
      if (e.key !== 'Tab') return;
      const nodes = [...dialog.querySelectorAll<HTMLElement>(sel)];
      if (!nodes.length) { e.preventDefault(); return; }
      const first = nodes[0], lastNode = nodes[nodes.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === lastNode) {
        e.preventDefault();
        (e.shiftKey ? lastNode : first).focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [closeable, onDone]);

  return (
    <div className="overlay-scrim center">
      <div className="tutorial glass" role="dialog" aria-modal="true" aria-label={ui.tutTitle} ref={dialogRef} tabIndex={-1}>
        <h2>{ui.tutTitle}</h2>
        <div className="tut-dots" aria-hidden="true">
          {steps.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}
        </div>
        <div className="tut-step">
          <span className="tut-num" aria-hidden="true">{i + 1}</span>
          <h3>{steps[i].t}</h3>
          <p>{steps[i].d}</p>
        </div>
        <button className="btn-primary" autoFocus onClick={() => { if (last) onDone(); else setI(i + 1); }}>
          {last ? ui.tutStart : ui.tutNext}
        </button>
      </div>
    </div>
  );
}
