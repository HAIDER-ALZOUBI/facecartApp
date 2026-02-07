import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import { formatPrice } from '../lib/format';
import { debugLog } from '../lib/debug';
import TopNav from '../components/TopNav';
import Modal from '../components/Modal';
import ScoreBadge from '../components/ScoreBadge';
import type { RoutineItem, ScoreBreakdown } from '../lib/types';

export default function Routine() {
  const navigate = useNavigate();
  const profile = storage.getProfile();
  const selectedByStep = storage.getSelectedByStep();
  const cartItems = storage.getCartItems() || [];
  const conflicts = storage.getConflicts();
  const [modalItem, setModalItem] = useState<RoutineItem | null>(null);

  // Derive routine items from selectedByStep + cartItems
  const routineItems = useMemo(() => {
    if (!selectedByStep) return [];
    return cartItems.filter(
      (item: RoutineItem) => selectedByStep[item.step as keyof typeof selectedByStep] === item.product.id
    );
  }, [selectedByStep, cartItems]);

  const getItemForStep = (step: string): RoutineItem | undefined => {
    return routineItems.find((i: RoutineItem) => i.step === step);
  };

  const hasSPF = !!getItemForStep('spf');

  // Log routine derivation and SPF warning
  useEffect(() => {
    debugLog('routine:derived', {
      steps: routineItems.map((i: RoutineItem) => i.step),
      productIds: routineItems.map((i: RoutineItem) => i.product.id),
      spfMissing: !hasSPF,
    });
  }, [routineItems, hasSPF]);

  const amSteps = ['cleanser', 'treatment', 'moisturizer', 'spf'];
  const pmSteps = ['cleanser', 'treatment', 'moisturizer'];

  if (!profile || !selectedByStep) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <TopNav />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-lg text-muted mb-6">No routine yet. Start with an intake.</p>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-4 bg-brand-500 text-white rounded-full text-lg font-semibold hover:bg-brand-600 active:press transition-all duration-200"
            >
              Start Intake
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderBreakdown = (breakdown: ScoreBreakdown) => (
    <div className="space-y-4">
      {[
        { label: 'Ingredient Relevance (50%)', value: breakdown.ingredient_relevance },
        { label: 'Sensitivity Match (20%)', value: breakdown.sensitivity_match },
        { label: 'Conflict Risk (15%)', value: breakdown.conflict_risk },
        { label: 'User Rating (15%)', value: breakdown.rating },
      ].map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-base mb-1.5">
            <span className="text-muted">{item.label}</span>
            <span className="font-semibold text-ink">{Math.round(item.value)}/100</span>
          </div>
          <div className="bg-beige rounded-full h-2.5">
            <div
              className="bg-brand-500 h-2.5 rounded-full transition-all"
              style={{ width: `${item.value}%` }}
            />
          </div>
        </div>
      ))}
      <div className="pt-3 border-t border-sand/40 flex justify-between items-center">
        <span className="font-medium text-lg text-ink">Weighted Total</span>
        <span className="font-bold text-2xl text-ink">{Math.round(breakdown.weighted_total)}/100</span>
      </div>
    </div>
  );

  const renderRoutineColumn = (title: string, steps: string[]) => (
    <div className="flex-1 min-w-0">
      <h3 className="font-bold text-2xl mb-4 text-ink capitalize">{title}</h3>
      <div className="space-y-3">
        {steps.map((step) => {
          const item = getItemForStep(step);
          if (!item) {
            if (step === 'spf') return null;
            return (
              <div key={step} className="rounded-2xl border border-dashed border-sand p-5 text-center text-base text-muted">
                No {step} selected
              </div>
            );
          }
          return (
            <button
              key={step}
              onClick={() => setModalItem(item)}
              className="w-full text-left bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all active:press"
            >
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted uppercase tracking-wider font-medium mb-1">{step}</p>
                  <p className="text-lg font-semibold text-ink leading-snug truncate">{item.product.name}</p>
                  <p className="text-base text-muted mt-0.5">{item.product.brand}</p>
                </div>
                <ScoreBadge score={item.score} size={36} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col animate-fade-in">
      <TopNav />

      <div className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-6">
        {/* Confidence */}
        <div className="bg-white rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-4">
            <span className="text-base text-muted">Profile Confidence</span>
            <div className="flex-1 bg-beige rounded-full h-2.5 max-w-[180px]">
              <div
                className="bg-brand-500 h-2.5 rounded-full transition-all"
                style={{ width: `${profile.confidence}%` }}
              />
            </div>
            <span className="text-xl font-bold text-ink tabular-nums">{Math.round(profile.confidence)}%</span>
          </div>
        </div>

        {/* SPF Warning */}
        {!hasSPF && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
            <span className="text-amber-700 text-base font-bold">SPF</span>
            <div>
              <p className="font-medium text-lg text-amber-800">SPF missing (recommended)</p>
              <p className="text-base text-amber-600">
                Daily SPF is recommended for most skin concerns. Consider adding one to your routine.
              </p>
            </div>
          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="font-medium text-lg text-amber-800 mb-3">Scheduling Notes</p>
            {conflicts.map((c, i) => (
              <div key={i} className="text-base text-amber-700 mb-1.5">
                {c.pair.join(' + ')}: {c.fix}
              </div>
            ))}
          </div>
        )}

        {/* Morning / Night horizontal columns */}
        <div className="flex flex-col md:flex-row gap-5">
          {renderRoutineColumn('Morning', amSteps)}
          {renderRoutineColumn('Night', pmSteps)}
        </div>

        {/* Refill predictions */}
        <section className="bg-white rounded-2xl p-6 shadow-card">
          <h3 className="font-bold text-2xl mb-4 text-ink">Refill Predictor</h3>
          <div className="space-y-3">
            {routineItems.map((item: RoutineItem) => (
              <div key={item.product.id} className="flex justify-between text-base">
                <span className="text-muted">{item.product.name}</span>
                <span className="text-ink">
                  Est. refill in <strong>{item.refill.days}</strong> days ({item.refill.date_iso})
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Back to cart */}
        <button
          onClick={() => navigate('/cart')}
          className="w-full py-5 border border-sand rounded-full text-lg font-medium text-ink hover:bg-beige active:press transition-all"
        >
          &larr; Edit in Cart
        </button>

        {/* Settings */}
        <div className="pt-2 pb-10 text-center space-y-4">
          <button
            onClick={() => {
              if (confirm('Reset all data? This cannot be undone.')) {
                storage.resetAll();
                navigate('/');
              }
            }}
            className="text-base text-rose-500 hover:underline"
          >
            Reset All Data
          </button>
          <p className="text-sm text-muted">
            Educational shopping support — not medical diagnosis.
          </p>
        </div>
      </div>

      {/* Score breakdown modal */}
      <Modal
        open={!!modalItem}
        onClose={() => setModalItem(null)}
        title={modalItem ? `${modalItem.product.name} — Score Breakdown` : ''}
      >
        {modalItem && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <ScoreBadge score={modalItem.score} size={52} />
              <div>
                <p className="font-bold text-lg text-ink">{modalItem.product.name}</p>
                <p className="text-base text-muted">{modalItem.product.brand}</p>
              </div>
            </div>
            {renderBreakdown(modalItem.score_breakdown)}
            <div>
              <p className="font-medium text-base mb-3 text-ink">Why chosen:</p>
              <ul className="space-y-2">
                {modalItem.why.map((w, i) => (
                  <li key={i} className="text-base text-muted flex gap-2">
                    <span className="text-brand-500">&bull;</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
