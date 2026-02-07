import { scoreColor } from '../lib/format';

interface ScoreBadgeProps {
  score: number;
  size?: number;
  onClick?: () => void;
}

export default function ScoreBadge({ score, size = 36, onClick }: ScoreBadgeProps) {
  const bg = scoreColor(score);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${bg} text-white font-bold rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-110`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={`Compatibility score: ${score}. Click for details.`}
      title={`Score: ${score}/100`}
    >
      {score}
    </button>
  );
}
