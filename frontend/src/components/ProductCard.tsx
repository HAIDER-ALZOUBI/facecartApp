import type { RoutineItem } from '../lib/types';
import { formatPrice } from '../lib/format';
import ScoreBadge from './ScoreBadge';

interface ProductCardProps {
  item: RoutineItem;
  onScoreClick?: () => void;
  onSwap?: () => void;
  onRemove?: () => void;
  showBuyLinks?: boolean;
  compact?: boolean;
}

export default function ProductCard({
  item,
  onScoreClick,
  onSwap,
  onRemove,
  showBuyLinks,
  compact,
}: ProductCardProps) {
  const { product, score, refill } = item;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-3 items-start">
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl shrink-0">
        {product.category === 'cleanser' && '🧴'}
        {product.category === 'treatment' && '💧'}
        {product.category === 'moisturizer' && '🧊'}
        {product.category === 'spf' && '☀️'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{product.category}</p>
            <p className="font-semibold text-sm truncate">{product.name}</p>
            <p className="text-xs text-gray-500">{product.brand}</p>
          </div>
          <ScoreBadge score={score} onClick={onScoreClick} />
        </div>
        <div className="flex items-center gap-3 mt-2 text-sm">
          <span className="font-medium text-brand-700">{formatPrice(product.price)}</span>
          {!compact && (
            <span className="text-xs text-gray-400">
              Est. refill in {refill.days} days
            </span>
          )}
        </div>
        {!compact && (
          <div className="flex flex-wrap gap-2 mt-2">
            {onSwap && (
              <button
                onClick={onSwap}
                className="text-xs px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Swap
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            )}
            {showBuyLinks && product.buy_links && product.buy_links.length > 0 && (
              <div className="flex gap-1">
                {product.buy_links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1 rounded-full bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
