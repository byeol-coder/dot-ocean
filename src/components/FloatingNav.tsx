import { useApp } from '../state/AppContext';

interface Props {
  onEncyclopedia: () => void;
  onMission: () => void;
  onQuiz: () => void;
  onLearn: () => void;
  onDotpad: () => void;
  onTutorial: () => void;
  curriculumLevel?: number;
}

export function FloatingNav({ onEncyclopedia, onMission, onQuiz, onLearn, onDotpad, onTutorial, curriculumLevel = 1 }: Props) {
  const { ui, dotpadConnected } = useApp();
  return (
    <nav className="floating-nav" aria-label={ui.appName}>
      <button className="fnav-btn" onClick={onEncyclopedia} aria-label={ui.navEncyclopedia}>
        <span aria-hidden="true">📖</span><small>{ui.navEncyclopedia}</small>
      </button>
      <button className="fnav-btn" onClick={onMission} aria-label={ui.navMission}>
        <span aria-hidden="true">🎯</span><small>{ui.navMission}</small>
      </button>
      <button className="fnav-btn" onClick={onQuiz} aria-label={ui.navQuiz}>
        <span aria-hidden="true">❓</span><small>{ui.navQuiz}</small>
      </button>
      <button className="fnav-btn learn-btn" onClick={onLearn}
        aria-label={`${ui.navLearn} (${ui.learnLevelLabel(curriculumLevel)})`}>
        <span aria-hidden="true">📚</span>
        <small>{ui.navLearn}</small>
        <span className="fnav-level-badge" aria-hidden="true">{curriculumLevel}</span>
      </button>
      <button className={'fnav-btn' + (dotpadConnected ? ' connected' : '')} onClick={onDotpad} aria-label={ui.navDotpad}>
        <span aria-hidden="true">⠿</span><small>Dot Pad</small>
      </button>
      <button className="fnav-btn" onClick={onTutorial} aria-label={ui.navTutorial}>
        <span aria-hidden="true">❔</span><small>{ui.navTutorial}</small>
      </button>
    </nav>
  );
}
