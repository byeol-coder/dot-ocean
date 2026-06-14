import { createContext, useContext, useState, useRef, useCallback, useMemo, type ReactNode } from 'react';
import type { Lang } from '../data/species';
import { UI, type UIStrings } from '../data/i18n';

export type Sfx = 'eat' | 'levelup' | 'danger' | 'discover' | 'send' | 'select';

interface AppCtxValue {
  lang: Lang; setLang: (l: Lang) => void; ui: UIStrings;
  sound: boolean; setSound: (b: boolean) => void;
  tts: boolean; setTts: (b: boolean) => void;
  highContrast: boolean; setHighContrast: (b: boolean) => void;
  reducedMotion: boolean; setReducedMotion: (b: boolean) => void;
  dotpadConnected: boolean; setDotpadConnected: (b: boolean) => void;
  speak: (text: string) => void;
  sfx: (kind: Sfx) => void;
  announce: (text: string) => void;
  initAudio: () => void;
}

const Ctx = createContext<AppCtxValue | null>(null);
export function useApp(): AppCtxValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const prefersRM = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [lang, setLang] = useState<Lang>('ko');
  const [sound, setSound] = useState(true);
  const [tts, setTts] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(prefersRM);
  const [dotpadConnected, setDotpadConnected] = useState(false);
  const [live, setLive] = useState('');

  const acRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  const initAudio = useCallback(() => {
    if (acRef.current) { if (acRef.current.state === 'suspended') void acRef.current.resume(); return; }
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new Ctor();
      const m = ac.createGain(); m.gain.value = 0.5; m.connect(ac.destination);
      acRef.current = ac; masterRef.current = m;
    } catch { /* audio unavailable */ }
  }, []);

  const tone = useCallback((freq: number, dur: number, type: OscillatorType, vol: number, delay = 0) => {
    const ac = acRef.current, m = masterRef.current;
    if (!ac || !m) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(m); o.start(t); o.stop(t + dur + 0.02);
  }, []);

  const sfx = useCallback((kind: Sfx) => {
    if (!sound) return;
    switch (kind) {
      case 'eat': tone(523, 0.09, 'triangle', 0.35); tone(784, 0.11, 'triangle', 0.32, 0.07); break;
      case 'levelup': tone(392, 0.12, 'sine', 0.4); tone(523, 0.12, 'sine', 0.4, 0.1); tone(784, 0.22, 'sine', 0.4, 0.22); break;
      case 'danger': tone(110, 0.18, 'sawtooth', 0.3); tone(98, 0.2, 'sawtooth', 0.3, 0.12); break;
      case 'discover': tone(659, 0.1, 'sine', 0.35); tone(988, 0.18, 'sine', 0.38, 0.1); break;
      case 'send': tone(440, 0.06, 'square', 0.22); tone(660, 0.06, 'square', 0.22, 0.06); tone(990, 0.1, 'square', 0.22, 0.12); break;
      case 'select': tone(620, 0.05, 'sine', 0.2); break;
    }
  }, [sound, tone]);

  const speak = useCallback((textToSay: string) => {
    if (!tts || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(textToSay);
      u.lang = lang === 'ko' ? 'ko-KR' : 'en-US';
      u.rate = 1.02; u.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* tts unavailable */ }
  }, [tts, lang]);

  const announce = useCallback((textToSay: string) => {
    setLive(''); requestAnimationFrame(() => setLive(textToSay));
  }, []);

  const ui = UI[lang];
  const value = useMemo<AppCtxValue>(() => ({
    lang, setLang, ui, sound, setSound, tts, setTts, highContrast, setHighContrast,
    reducedMotion, setReducedMotion, dotpadConnected, setDotpadConnected,
    speak, sfx, announce, initAudio,
  }), [lang, ui, sound, tts, highContrast, reducedMotion, dotpadConnected, speak, sfx, announce, initAudio]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="assertive" role="status">{live}</div>
    </Ctx.Provider>
  );
}
