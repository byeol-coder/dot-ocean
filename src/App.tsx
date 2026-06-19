import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './state/AppContext';
import { byKey, text, sizeScale } from './data/species';
import { pattern } from './engine/dotMatrix';
import { getDtmsPattern } from './data/dtmsPatterns';
import type { GameStats, CueInfo, SurveyItem, RadarData } from './engine/game';
import { TopBar } from './components/TopBar';
import { FloatingNav } from './components/FloatingNav';
import { GameCanvas, type InitialProgress } from './components/GameCanvas';
import { TactilePopup } from './components/TactilePopup';
import { RadarPad } from './components/RadarPad';
import { SettingsPanel } from './components/SettingsPanel';
import { Encyclopedia } from './components/Encyclopedia';
import { Mission } from './components/Mission';
import { Quiz } from './components/Quiz';
import { Tutorial } from './components/Tutorial';
import { CurriculumPanel } from './components/CurriculumPanel';
import { DotMatrix } from './components/DotMatrix';
import { AchievementToast } from './components/AchievementToast';
import { AchievementsPanel } from './components/AchievementsPanel';
import { bridge } from './embed/postMessageBridge';
import { computeCurriculumLevel } from './data/curriculum';
import { loadSave, writeSave, checkAndUpdateStreak, todayISO, type SaveData } from './state/persistence';
import { checkNewAchievements, type Achievement } from './data/achievements';
import { getDailyChallenge, type DailyChallenge } from './state/daily';

type Overlay = 'none' | 'tutorial' | 'settings' | 'encyclopedia' | 'mission' | 'quiz' | 'dotpad' | 'learn' | 'achievements';

export default function App() {
  const a = useApp();
  const { ui, lang, highContrast, reducedMotion, showPreview, embedMode } = a;

  // ── persistence: load once synchronously ──────────────────────────────────
  const [saveData] = useState<SaveData>(() => loadSave());
  const saveRef = useRef<SaveData>(saveData);

  const [initialProgress] = useState<InitialProgress>(() => ({
    level: saveData.level, xp: saveData.xp,
    sizeFactor: saveData.sizeFactor, discovered: saveData.discovered,
  }));

  // ── streak ─────────────────────────────────────────────────────────────────
  const streakResultRef = useRef(() => checkAndUpdateStreak(saveData));
  const [streakDays, setStreakDays] = useState(() => {
    const r = streakResultRef.current();
    return r.streakDays;
  });
  const bonusXpRef = useRef(0);

  // ── daily challenge ────────────────────────────────────────────────────────
  const today = todayISO();
  const [dailyChallenge] = useState<DailyChallenge>(() => getDailyChallenge(today));
  const [dailyProgress, setDailyProgress] = useState(() =>
    saveData.dailyChallengeDate === today ? saveData.dailyChallengeProgress : 0
  );
  const [dailyCompleted, setDailyCompleted] = useState(() =>
    saveData.dailyChallengeDate === today ? saveData.dailyChallengeCompleted : false
  );
  const dailyProgressRef = useRef(dailyProgress);
  const dailyCompletedRef = useRef(dailyCompleted);

  // ── achievements ───────────────────────────────────────────────────────────
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(
    () => new Set(saveData.unlockedAchievements)
  );
  const unlockedRef = useRef(new Set(saveData.unlockedAchievements));
  const [achieveQueue, setAchieveQueue] = useState<Achievement[]>([]);
  const [newAchievementCount, setNewAchievementCount] = useState(0);

  // ── game state ─────────────────────────────────────────────────────────────
  const [overlay, setOverlay] = useState<Overlay>(embedMode ? 'none' : 'tutorial');
  const [stats, setStats] = useState<GameStats>({ level: saveData.level, xp: saveData.xp, xpNext: 200, sizeFactor: saveData.sizeFactor, discovered: 0, total: 1 });
  const statsRef = useRef(stats);
  const [discovered, setDiscovered] = useState<Set<string>>(() => new Set(saveData.discovered));
  const discoveredRef = useRef(new Set<string>(saveData.discovered));
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [focusPaused, setFocusPaused] = useState(false);
  const [radar, setRadar] = useState<number[][] | null>(null);
  const [padMode, setPadMode] = useState<'focus' | 'radar'>('radar');
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const lastFocus = useRef<string | null>(null);
  const focusCooldownUntil = useRef(0);
  const scanRef = useRef<() => void>(() => {});
  const surveyRef = useRef<() => void>(() => {});
  const addBonusXpRef = useRef<(xp: number) => void>(() => {});
  const tutorialDoneRef = useRef(embedMode);

  const curriculumLevel = useMemo(() => computeCurriculumLevel(discovered), [discovered]);
  const prevCurriculumLevelRef = useRef(curriculumLevel);

  const paused = overlay !== 'none' || focusPaused;
  const blocking = overlay !== 'none';

  const dirText = useCallback((i: number) => ui.dir8[i] ?? '', [ui]);
  const distText = useCallback((d: 'near' | 'mid' | 'far') => (d === 'near' ? ui.distNear : d === 'mid' ? ui.distMid : ui.distFar), [ui]);
  const say = useCallback((msg: string) => { a.announce(msg); a.speak(msg); }, [a]);

  // ── on mount: persist streak + fire bonus XP after game starts ─────────────
  useEffect(() => {
    const r = checkAndUpdateStreak(saveData);
    if (r.isFirstToday) {
      bonusXpRef.current = r.bonusXp;
      const updated: SaveData = {
        ...saveRef.current,
        streakDays: r.streakDays,
        lastVisitDate: today,
        totalSessions: saveData.totalSessions + 1,
      };
      saveRef.current = updated;
      writeSave(updated);
      setStreakDays(r.streakDays);
      if (r.streakDays >= 1) {
        // Announce streak on first interaction after game loads
        const greet = ui.streakBonusAnnounce(r.streakDays, r.bonusXp);
        setTimeout(() => say(greet), 2000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── unlock achievements helper ─────────────────────────────────────────────
  const unlockAchievements = useCallback((newOnes: Achievement[]) => {
    if (!newOnes.length) return;
    newOnes.forEach(ac => unlockedRef.current.add(ac.id));
    setUnlockedAchievements(new Set(unlockedRef.current));
    setAchieveQueue(prev => [...prev, ...newOnes]);
    setNewAchievementCount(c => c + newOnes.length);
    a.sfx('achieve');
    const updated: SaveData = { ...saveRef.current, unlockedAchievements: [...unlockedRef.current] };
    saveRef.current = updated;
    writeSave(updated);
  }, [a]);

  const triggerAchievementCheck = useCallback((eventType?: 'danger' | 'daily_complete') => {
    const newOnes = checkNewAchievements({
      discoveredCount: discoveredRef.current.size,
      discovered: discoveredRef.current,
      level: statsRef.current.level,
      curriculumLevel,
      streakDays,
      unlocked: unlockedRef.current,
      eventType,
    });
    unlockAchievements(newOnes);
  }, [curriculumLevel, streakDays, unlockAchievements]);

  // ── daily challenge progress tracker ──────────────────────────────────────
  const trackDailyEvent = useCallback((eventType: string) => {
    if (dailyCompletedRef.current) return;
    const dc = dailyChallenge;
    const matches =
      (dc.type === 'discover_new' && eventType === 'discover') ||
      (dc.type === 'eat_count' && eventType === 'eat') ||
      (dc.type === 'danger_count' && eventType === 'danger') ||
      (dc.type === 'scan_count' && eventType === 'scan') ||
      (dc.type === 'levelup_count' && eventType === 'levelup');
    if (!matches) return;
    const newProgress = dailyProgressRef.current + 1;
    dailyProgressRef.current = newProgress;
    setDailyProgress(newProgress);
    const completed = newProgress >= dc.target;
    if (completed) {
      dailyCompletedRef.current = true;
      setDailyCompleted(true);
      triggerAchievementCheck('daily_complete');
    }
    const updated: SaveData = { ...saveRef.current, dailyChallengeDate: today, dailyChallengeProgress: newProgress, dailyChallengeCompleted: completed };
    saveRef.current = updated;
    writeSave(updated);
  }, [dailyChallenge, today, triggerAchievementCheck]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // postMessage bridge
  useEffect(() => {
    bridge.send({ type: 'ocean:ready', version: '3.1.0', embed: embedMode });
    const cleanup = bridge.listen((msg) => {
      switch (msg.type) {
        case 'ocean:lang':        a.setLang(msg.lang); break;
        case 'ocean:hc':          a.setHighContrast(msg.enabled); break;
        case 'ocean:rm':          a.setReducedMotion(msg.enabled); break;
        case 'ocean:pause':       setOverlay(msg.paused ? 'settings' : 'none'); break;
        case 'ocean:show-dotpad': setOverlay('dotpad'); break;
        case 'ocean:connect-dotpad': setOverlay('dotpad'); break;
      }
    });
    return cleanup;
  }, [embedMode, a]);

  useEffect(() => {
    bridge.send({ type: 'ocean:stats', level: stats.level, discovered: stats.discovered, total: stats.total, xp: stats.xp });
  }, [stats]);

  useEffect(() => {
    bridge.send({
      type: 'ocean:dotpad:status',
      status: a.dotpadStatus === 'connected' ? 'connected'
            : a.dotpadStatus === 'unsupported' ? 'unsupported'
            : a.dotpadStatus === 'error' ? 'error'
            : 'disconnected',
      detail: a.dotpadStatusDetail,
    });
  }, [a.dotpadStatus, a.dotpadStatusDetail]);

  const markReady = useCallback(() => {
    if (!readyRef.current) {
      readyRef.current = true; setReady(true);
      // Give bonus XP once game is running
      if (bonusXpRef.current > 0) {
        const b = bonusXpRef.current; bonusXpRef.current = 0;
        setTimeout(() => addBonusXpRef.current(b), 800);
      }
    }
  }, []);
  const onStats = useCallback((s: GameStats) => {
    setStats(s); statsRef.current = s; markReady();
    // Throttled save: only when level or significant XP changes
    const cur = saveRef.current;
    if (cur.level !== s.level || Math.abs(cur.xp - s.xp) >= 100) {
      const updated = { ...cur, level: s.level, xp: s.xp, sizeFactor: s.sizeFactor };
      saveRef.current = updated;
      writeSave(updated);
    }
    triggerAchievementCheck();
  }, [markReady, triggerAchievementCheck]);
  useEffect(() => { const t = setTimeout(markReady, 2500); return () => clearTimeout(t); }, [markReady]);

  // Curriculum tier-up announcement
  useEffect(() => {
    if (curriculumLevel > prevCurriculumLevelRef.current) {
      prevCurriculumLevelRef.current = curriculumLevel;
      const msg = ui.learnLevelUp(curriculumLevel);
      a.announce(msg); a.speak(msg); a.sfx('levelup');
      triggerAchievementCheck();
    }
  }, [curriculumLevel, ui, a, triggerAchievementCheck]);

  const onFocusDismiss = useCallback(() => {
    focusCooldownUntil.current = Date.now() + 3000;
    setFocusPaused(false); setFocusKey(null); setPadMode('radar');
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (focusPaused) { onFocusDismiss(); return; }
      if (overlay === 'tutorial' && !tutorialDoneRef.current) return;
      setOverlay('none');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [overlay, focusPaused, onFocusDismiss]);

  const onDiscover = useCallback((key: string, info?: CueInfo) => {
    setDiscovered((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key); discoveredRef.current = next;
      // Persist immediately on new discovery
      const updated: SaveData = { ...saveRef.current, discovered: [...next] };
      saveRef.current = updated;
      writeSave(updated);
      return next;
    });
    const s = byKey[key]; if (!s) return;
    const t = text(s, lang);
    bridge.send({ type: 'ocean:discover', key, name: t.name });
    a.sfx('discover');
    a.hostEvent?.({ type: 'discover', key });
    // Rich discovery narration
    const richMsg = ui.evDiscoverRich(t.name, s.scientific, s.sizeCm, t.features[0] ?? '');
    say(info ? `${richMsg} ${ui.annDiscover(t.name, dirText(info.dir), distText(info.dist))}` : richMsg);
    trackDailyEvent('discover');
    setTimeout(() => triggerAchievementCheck(), 50);
  }, [a, ui, lang, dirText, distText, say, trackDailyEvent, triggerAchievementCheck]);

  const onFocus = useCallback((key: string | null) => {
    setFocusKey(key);
    if (key) {
      if (Date.now() < focusCooldownUntil.current) return;
      lastFocus.current = key;
      setPadMode('focus'); setFocusPaused(true);
      const dtms = getDtmsPattern(key);
      if (dtms) { a.dotpad.renderHex(dtms); }
      else { const s = byKey[key]; if (s) a.dotpad.render(pattern(key, sizeScale(s.sizeCm))); }
    } else {
      setFocusPaused(false); setPadMode('radar');
    }
  }, [a]);

  const onEvent = useCallback((kind: 'eat' | 'levelup' | 'danger' | 'scan', key: string, level?: number, info?: CueInfo) => {
    const s = byKey[key];
    a.hostEvent?.({ type: kind as 'eat' | 'levelup' | 'danger', key, level });
    if (kind === 'eat') { a.sfx('eat'); if (a.verbose && s) say(ui.evEat(text(s, lang).name)); trackDailyEvent('eat'); }
    else if (kind === 'levelup') { a.sfx('levelup'); say(ui.evLevelUp(level ?? stats.level)); trackDailyEvent('levelup'); triggerAchievementCheck(); }
    else if (kind === 'danger' && s) {
      a.sfx('danger');
      const name = text(s, lang).name;
      say(info ? ui.annDanger(name, dirText(info.dir)) : ui.evDanger(name));
      trackDailyEvent('danger');
      triggerAchievementCheck('danger');
    }
    else if (kind === 'scan') { trackDailyEvent('scan'); }
  }, [a, ui, lang, stats.level, dirText, say, trackDailyEvent, triggerAchievementCheck]);

  const onRadar = useCallback((d: RadarData) => {
    setRadar(d.grid);
    if (padMode !== 'focus') a.dotpad.render(d.grid);
  }, [a, padMode]);

  const onSurvey = useCallback((items: SurveyItem[], edges: number[]) => {
    if (!items.length && !edges.length) { say(ui.annNothing); return; }
    const parts: string[] = [];
    for (const it of items) {
      const s = byKey[it.key]; if (!s) continue;
      parts.push(ui.annSurveyItem(text(s, lang).name, dirText(it.dir), distText(it.dist), it.danger));
    }
    for (const e of edges) parts.push(ui.annEdge(dirText(e)));
    say(`${ui.annSurveyHead} ${parts.join(', ')}`);
  }, [ui, lang, dirText, distText, say]);

  const registerScan = useCallback((fn: () => void) => { scanRef.current = fn; }, []);
  const registerSurvey = useCallback((fn: () => void) => { surveyRef.current = fn; }, []);
  const registerAddBonusXp = useCallback((fn: (xp: number) => void) => { addBonusXpRef.current = fn; }, []);

  const openTutorialDone = useCallback(() => {
    tutorialDoneRef.current = true;
    a.initAudio(); a.sfx('select'); setOverlay('none');
  }, [a]);

  const focusSpecies = lastFocus.current ? byKey[lastFocus.current] : null;

  return (
    <div className={'app' + (highContrast ? ' hc' : '') + (reducedMotion ? ' reduce' : '') + (embedMode ? ' embed' : '')}>
      <div className={'game-layer' + (focusPaused ? ' focus-pause' : '')} aria-hidden={blocking ? true : undefined}>
        <GameCanvas
          paused={paused}
          curriculumLevel={curriculumLevel}
          initialProgress={initialProgress}
          onStats={onStats}
          onDiscover={onDiscover}
          onFocus={onFocus}
          onEvent={onEvent}
          onRadar={onRadar}
          onSurvey={onSurvey}
          registerScan={registerScan}
          registerSurvey={registerSurvey}
          registerAddBonusXp={registerAddBonusXp}
        />
      </div>

      {!ready && (
        <div className="loading-veil" role="status" aria-live="polite">
          <span className="loader-orb" aria-hidden="true" />
          <span className="loader-text">{ui.loading}</span>
        </div>
      )}

      <div aria-hidden={blocking ? true : undefined}>
        <TopBar level={stats.level} xp={stats.xp} xpNext={stats.xpNext}
          discovered={stats.discovered} total={stats.total}
          streakDays={streakDays}
          dailyChallenge={dailyChallenge}
          dailyProgress={dailyProgress}
          dailyCompleted={dailyCompleted}
          onSettings={() => { a.sfx('select'); setOverlay('settings'); }} />

        <FloatingNav
          onEncyclopedia={() => { a.sfx('select'); setOverlay('encyclopedia'); }}
          onMission={() => { a.sfx('select'); setOverlay('mission'); }}
          onQuiz={() => { a.sfx('select'); setOverlay('quiz'); }}
          onLearn={() => { a.sfx('select'); setOverlay('learn'); }}
          onDotpad={() => { a.sfx('select'); setOverlay('dotpad'); }}
          onTutorial={() => { a.sfx('select'); setOverlay('tutorial'); }}
          onAchievements={() => { a.sfx('select'); setNewAchievementCount(0); setOverlay('achievements'); }}
          curriculumLevel={curriculumLevel}
          newAchievementCount={newAchievementCount}
        />
      </div>

      {/* Achievement toast — sits above everything */}
      <AchievementToast
        queue={achieveQueue}
        lang={lang}
        onDismiss={(id) => setAchieveQueue(q => q.filter(ac => ac.id !== id))}
      />

      {/* Focus pause popup */}
      {overlay === 'none' && focusKey && focusPaused && (
        <TactilePopup speciesKey={focusKey} onDismiss={onFocusDismiss} focusActive />
      )}
      {/* Dot Pad on-screen preview */}
      {showPreview && overlay === 'none' && !focusPaused && (
        focusKey
          ? <TactilePopup speciesKey={focusKey} />
          : (
            <div className="radar-mini glass" role="img" aria-label={ui.radarHint}>
              <div className="radar-mini-head"><span aria-hidden="true">⠿</span> {ui.radarMode}</div>
              <RadarPad grid={radar} ariaLabel={ui.radarHint} />
              <div className="dotpad-cap"><span className="sim">{ui.simLabel}</span><span className="res">60 × 40</span></div>
            </div>
          )
      )}

      {overlay === 'none' && (
        <div className="play-controls">
          <button className="ctrl-btn" onClick={() => { surveyRef.current(); }} aria-label={ui.keySurvey}>
            <span aria-hidden="true">📡</span><small>{ui.surveyBtn}</small>
          </button>
          <button className="scan-fab" onClick={() => scanRef.current()} aria-label={ui.keyScan}>⌖</button>
        </div>
      )}

      {overlay === 'none' && a.captions && a.caption && (
        <div className="caption-bar" aria-hidden="true">{a.caption}</div>
      )}

      {overlay === 'tutorial' && <Tutorial onDone={openTutorialDone} closeable={tutorialDoneRef.current} />}
      {overlay === 'settings' && <SettingsPanel onClose={() => setOverlay('none')} />}
      {overlay === 'encyclopedia' && <Encyclopedia discovered={discovered} onClose={() => setOverlay('none')} />}
      {overlay === 'mission' && <Mission discovered={discovered} level={stats.level} onClose={() => setOverlay('none')} />}
      {overlay === 'quiz' && <Quiz discovered={discovered} onClose={() => setOverlay('none')} />}
      {overlay === 'learn' && (
        <CurriculumPanel discovered={discovered} curriculumLevel={curriculumLevel} onClose={() => setOverlay('none')} />
      )}
      {overlay === 'achievements' && (
        <AchievementsPanel unlockedIds={unlockedAchievements} onClose={() => setOverlay('none')} />
      )}
      {overlay === 'dotpad' && (
        <div className="overlay-scrim center" onClick={() => setOverlay('none')}>
          <div className="dotpad-modal glass" role="dialog" aria-modal="true" aria-label={ui.navDotpad} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>⠿ Dot Pad</h2>
              <button className="icon-btn" onClick={() => setOverlay('none')} aria-label={ui.close}>✕</button>
            </div>

            {/* ── 연결 섹션 ── */}
            <DotPadConnectSection />

            {/* ── 화면 미리보기 ── */}
            <div className="layer-toggle">
              <button aria-pressed={padMode === 'radar'} onClick={() => setPadMode('radar')}>{ui.radarMode}</button>
              <button aria-pressed={padMode === 'focus'} onClick={() => setPadMode('focus')} disabled={!focusSpecies}>{ui.focusMode}</button>
            </div>
            {padMode === 'radar' ? (
              <>
                <RadarPad grid={radar} ariaLabel={ui.radarHint} />
                <div className="dotpad-cap"><span className="sim">{ui.simLabel}</span><span className="res">60 × 40</span></div>
              </>
            ) : focusSpecies ? (
              <>
                <DotMatrix speciesKey={focusSpecies.key} scale={sizeScale(focusSpecies.sizeCm)} ariaLabel={`${text(focusSpecies, lang).name}`} />
                <div className="dotpad-cap"><span className="sim">{ui.simLabel}</span><span className="res">60 × 40</span></div>
                <button className="btn-primary touch-btn" onClick={() => {
                  const k = lastFocus.current; if (!k) return;
                  a.sfx('send');
                  const t = text(byKey[k], lang);
                  say(`${t.name}. ${t.tactile}`);
                }}>✋ {ui.touchWithDotpad}</button>
              </>
            ) : (
              <p className="empty small">{lang === 'ko' ? '가까운 생물에 다가가면 여기에 촉각 미리보기가 떠요.' : 'Approach a creature to see its tactile preview here.'}</p>
            )}

            {/* ── 키맵 가이드 ── */}
            <details className="keymap-details" open={a.dotpadConnected}>
              <summary className="keymap-summary">
                {lang === 'ko' ? '⌨ Dot Pad 키 사용법' : '⌨ Dot Pad Key Guide'}
              </summary>
              <table className="keymap-table" aria-label={lang === 'ko' ? 'Dot Pad 키맵' : 'Dot Pad keymap'}>
                <thead>
                  <tr>
                    <th>{lang === 'ko' ? '버튼' : 'Key'}</th>
                    <th>{lang === 'ko' ? '동작' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>◀ Panning Left</td><td>{lang === 'ko' ? '왼쪽으로 헤엄' : 'Swim left'}</td></tr>
                  <tr><td>▶ Panning Right</td><td>{lang === 'ko' ? '오른쪽으로 헤엄' : 'Swim right'}</td></tr>
                  <tr><td>F1 / LPF1</td><td>{lang === 'ko' ? '위로 헤엄' : 'Swim up'}</td></tr>
                  <tr><td>F4 / RPF4</td><td>{lang === 'ko' ? '아래로 헤엄' : 'Swim down'}</td></tr>
                  <tr><td>Panning All / F2</td><td>{lang === 'ko' ? '가장 가까운 생물 스캔' : 'Scan nearest creature'}</td></tr>
                  <tr><td>F3</td><td>{lang === 'ko' ? '주변 서베이' : 'Survey surroundings'}</td></tr>
                </tbody>
              </table>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

function DotPadConnectSection() {
  const a = useApp();
  const { ui, lang } = a;
  const [busy, setBusy] = useState(false);
  const ko = lang === 'ko';

  const STATUS_MSG: Record<string, string> = {
    idle:         '',
    scanning:     ko ? '기기 검색 중…' : 'Scanning for device…',
    connecting:   ko ? '연결 중…'       : 'Connecting…',
    connected:    ko ? '연결됨'          : 'Connected',
    disconnected: ko ? '연결 해제됨'    : 'Disconnected',
    error:        a.dotpadStatusDetail ?? (ko ? '연결 오류' : 'Connection error'),
    unsupported:  ko
      ? 'Web Bluetooth를 지원하지 않는 브라우저입니다. Chrome 또는 Edge를 사용해 주세요.'
      : 'Web Bluetooth is not supported in this browser. Use Chrome or Edge.',
  };

  const handleConnect = async () => {
    if (busy || a.dotpadConnected) return;
    setBusy(true); a.initAudio();
    const ok = await a.dotpad.connect();
    setBusy(false);
    if (ok) { a.sfx('send'); a.announce(ui.evConnected); a.speak(ui.evConnected); }
    else if (a.dotpadStatus === 'error' || a.dotpadStatus === 'unsupported') {
      const msg = STATUS_MSG[a.dotpadStatus] ?? '';
      a.announce(msg); a.speak(msg);
    }
  };

  const handleDisconnect = () => {
    a.dotpad.disconnect();
    const msg = ko ? 'Dot Pad 연결이 해제되었습니다.' : 'Dot Pad disconnected.';
    a.announce(msg); a.speak(msg);
  };

  const isScanning = a.dotpadStatus === 'scanning' || a.dotpadStatus === 'connecting';
  const isError    = a.dotpadStatus === 'error' || a.dotpadStatus === 'unsupported';

  return (
    <div className="dotpad-connect-section" aria-live="polite">
      {/* Status indicator strip */}
      <div className={'dp-status-bar' + (a.dotpadConnected ? ' connected' : isError ? ' error' : '')}>
        <span className="dp-status-dot" aria-hidden="true" />
        <span className="dp-status-text">
          {a.dotpadConnected
            ? (ko ? '✓ Dot Pad 연결됨' : '✓ Dot Pad connected')
            : isScanning
              ? STATUS_MSG[a.dotpadStatus]
              : (ko ? 'Dot Pad 미연결' : 'Dot Pad not connected')}
        </span>
      </div>

      {/* Action buttons */}
      <div className="dotpad-row">
        {a.dotpadConnected ? (
          <button className="btn-ghost btn-danger" onClick={handleDisconnect}>
            ⏏ {ko ? '연결 해제' : 'Disconnect'}
          </button>
        ) : (
          <button
            className={'btn-primary dp-connect-btn' + (busy ? ' loading' : '')}
            onClick={handleConnect}
            disabled={busy || a.dotpadStatus === 'unsupported'}
            aria-busy={busy}
          >
            {busy
              ? `⠿ ${STATUS_MSG[a.dotpadStatus]}`
              : `🔗 ${ko ? 'Dot Pad 연결하기' : 'Connect Dot Pad'}`}
          </button>
        )}
      </div>

      {isError && (
        <p className="dotpad-error" role="alert">{STATUS_MSG[a.dotpadStatus]}</p>
      )}
    </div>
  );
}
