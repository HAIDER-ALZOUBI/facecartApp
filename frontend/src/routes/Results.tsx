import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import { api } from '../lib/api';
import { formatConcern, formatRisk, riskColor, formatPrice } from '../lib/format';
import ScoreBadge from '../components/ScoreBadge';
import type { TreatmentPath, PathPreview, RoutineItem } from '../lib/types';

function ProductTooltip({ item }: { item: RoutineItem }) {
  return (
    <div className="absolute z-30 bottom-full left-0 mb-2 w-80 bg-white rounded-2xl shadow-xl p-5 animate-tooltip pointer-events-none">
      <p className="font-semibold text-base text-ink">{item.product.name}</p>
      <p className="text-sm text-muted mb-3">{item.product.brand}</p>

      {/* Key ingredients */}
      <div className="mb-3">
        <p className="text-sm uppercase tracking-wider text-muted font-medium mb-1.5">Key Ingredients</p>
        <div className="flex flex-wrap gap-1.5">
          {item.product.key_ingredients.slice(0, 4).map((ki) => (
            <span key={ki} className="px-2.5 py-1 bg-beige text-ink rounded-full text-sm font-medium">
              {ki}
            </span>
          ))}
        </div>
      </div>

      {/* Why chosen */}
      {item.why && item.why.length > 0 && (
        <div>
          <p className="text-sm uppercase tracking-wider text-muted font-medium mb-1.5">Why Compatible</p>
          <ul className="space-y-1">
            {item.why.slice(0, 2).map((w, i) => (
              <li key={i} className="text-sm text-muted leading-snug flex gap-1.5">
                <span className="text-brand-500 shrink-0">&bull;</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PreviewProductRow({ step, item }: { step: string; item: RoutineItem }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex items-center justify-between py-2.5 px-3 -mx-3 rounded-xl hover:bg-beige/50 transition-colors cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-muted uppercase tracking-wider w-24 shrink-0 font-medium">{step}</span>
        <span className="text-ink text-base truncate">{item.product.name}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="text-muted text-base tabular-nums">{formatPrice(item.product.price)}</span>
        <ScoreBadge score={item.score} size={26} />
      </div>
      {hovered && <ProductTooltip item={item} />}
    </div>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const profile = storage.getProfile();
  const paths = storage.getPaths();
  const previews = storage.getPathPreviews();
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [error, setError] = useState('');

  if (!profile || !paths) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-8 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-card max-w-md w-full p-10 text-center">
          <p className="text-lg text-muted mb-6">No results yet. Start with an intake.</p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-4 bg-brand-500 text-white rounded-full text-lg font-semibold hover:bg-brand-600 active:press transition-all duration-200"
          >
            Start Intake
          </button>
        </div>
      </div>
    );
  }

  const selectPath = async (path: TreatmentPath, idx: number) => {
    setLoading(true);
    setSelectedIdx(idx);
    setError('');
    try {
      storage.setSelectedPath(path);
      const budget = storage.getBudget();
      const allergies = storage.getAllergies();

      const result = await api.routineGenerate({
        profile,
        selectedPath: { strategy_key: path.strategy_key, risk_level: path.risk_level },
        budget,
        allergies,
      });

      // Set selected_by_step as the authoritative source
      const selectedByStep: Record<string, string> = {};
      for (const item of result.cart) {
        selectedByStep[item.step] = item.product.id;
      }
      storage.setSelectedByStep(selectedByStep);
      storage.setConflicts(result.conflicts || []);
      storage.setCartItems(result.cart);

      navigate('/cart');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setSelectedIdx(null);
    }
  };

  const getPreview = (strategyKey: string): PathPreview | undefined => {
    return previews?.find((p) => p.strategy_key === strategyKey);
  };

  return (
    <div className="min-h-screen bg-cream animate-fade-in">
      {/* Header */}
      <div className="bg-cream/80 backdrop-blur-sm border-b border-sand/30 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted hover:text-brand-600 transition-colors mb-4 block"
          >
            &larr; Back to intake
          </button>
          <h1 className="text-[44px] font-bold text-ink leading-tight tracking-tight">Choose Your Treatment Path</h1>
          <p className="text-lg text-muted mt-3">
            Each path uses a different strategy. Hover over products to see why they're compatible.
          </p>
        </div>
      </div>

      {error && (
        <div className="max-w-5xl mx-auto px-6 mt-6">
          <p className="text-rose-600 text-base bg-rose-50 border border-rose-200 rounded-2xl px-5 py-3">{error}</p>
        </div>
      )}

      {/* Horizontal scroll path cards */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory -mx-6 px-6 lg:mx-0 lg:px-0 lg:overflow-visible lg:grid lg:grid-cols-3">
          {paths.map((path: TreatmentPath, idx: number) => {
            const preview = getPreview(path.strategy_key);
            const isLoading = loading && selectedIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl shadow-card flex flex-col min-w-[320px] snap-start lg:min-w-0"
              >
                <div className="p-7 flex-1">
                  {/* Path header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1 mr-3">
                      <h3 className="font-bold text-xl text-ink leading-tight">{path.name}</h3>
                      <p className="text-sm text-muted mt-1">{path.who_its_for}</p>
                    </div>
                    <span className={`text-sm px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider shrink-0 ${riskColor(path.risk_level)}`}>
                      {formatRisk(path.risk_level)}
                    </span>
                  </div>

                  <p className="text-lg text-muted mb-5 leading-relaxed">{path.explanation}</p>

                  {/* Plan preview */}
                  {preview && (
                    <div className="bg-beige/60 rounded-2xl p-5 mb-4">
                      <p className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                        Preview Products
                      </p>
                      <div className="space-y-0.5">
                        {(['cleanser', 'treatment', 'moisturizer', 'spf'] as const).map((step) => {
                          const item = preview.plan[step];
                          if (!item) return null;
                          return <PreviewProductRow key={step} step={step} item={item} />;
                        })}
                      </div>
                      <div className="mt-4 pt-3 border-t border-sand/40 flex justify-between items-center">
                        <span className="text-sm font-medium text-muted">Preview Total</span>
                        <span className="font-bold text-lg text-brand-600 tabular-nums">{formatPrice(preview.total)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Select button */}
                <div className="px-7 pb-7">
                  <button
                    onClick={() => selectPath(path, idx)}
                    disabled={loading}
                    className={`w-full py-4 rounded-full text-base font-semibold transition-all duration-200 ${
                      isLoading
                        ? 'bg-brand-600 text-white'
                        : 'bg-brand-500 text-white hover:bg-brand-600 active:press disabled:bg-sand disabled:text-muted'
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Building routine...
                      </span>
                    ) : (
                      'Select Path'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-muted text-center pb-8">
        Educational shopping support — not medical diagnosis.
      </p>
    </div>
  );
}
