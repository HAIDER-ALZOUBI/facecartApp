import type { RoutineItem } from '../lib/types';
import { formatPrice } from '../lib/format';
import ScoreBadge from './ScoreBadge';

interface ProductCardProps {
  item: RoutineItem;
  onScoreClick?: () => void;
  onRemove?: () => void;
  onChangePick?: () => void;
  conflictWarning?: string;
  compact?: boolean;
}

export default function ProductCard({
  item,
  onScoreClick,
  onRemove,
  onChangePick,
  conflictWarning,
  compact,
}: ProductCardProps) {
  const { product, score, refill } = item;

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-card transition-shadow hover:shadow-card-hover ${
      conflictWarning ? 'ring-1 ring-amber-300/60' : ''
    }`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted uppercase tracking-wider font-medium mb-1">{product.category}</p>
          <p className="font-semibold text-lg text-ink leading-snug">{product.name}</p>
          <p className="text-base text-muted mt-0.5">{product.brand}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <ScoreBadge score={score} onClick={onScoreClick} />
          <span className="text-base font-semibold text-ink tabular-nums">{formatPrice(product.price)}</span>
        </div>
      </div>

      {!compact && (
        <div className="text-sm text-muted mt-3">
          Est. refill in {refill.days} days
        </div>
      )}

      {conflictWarning && (
        <p className="text-sm text-amber-600 mt-2 leading-snug">{conflictWarning}</p>
      )}

      {!compact && (onChangePick || onRemove) && (
        <div className="flex items-center gap-5 mt-4 pt-4 border-t border-sand/30">
          {onChangePick && (
            <button
              onClick={onChangePick}
              className="text-base text-brand-600 hover:text-brand-700 font-medium active:press transition-colors"
            >
              Change
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-base text-muted hover:text-rose-500 font-medium active:press transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
