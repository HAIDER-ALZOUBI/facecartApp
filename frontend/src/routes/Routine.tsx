import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import { formatPrice } from '../lib/format';
import { debugLog } from '../lib/debug';
import Tabs from '../components/Tabs';
import ProductCard from '../components/ProductCard';
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

  // AM: Cleanser → Treatment → Moisturizer → SPF
  // PM: Cleanser → Treatment → Moisturizer
  const amSteps = ['cleanser', 'treatment', 'moisturizer', 'spf'];
  const pmSteps = ['cleanser', 'treatment', 'moisturizer'];

  if (!profile || !selectedByStep) {
    return (
      <div className="min-h-screen flex flex-col">
        <Tabs />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No routine yet. Start with an intake.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium"
            >
              Start Intake
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderBreakdown = (breakdown: ScoreBreakdown) => (
    <div className="space-y-3">
      {[
        { label: 'Ingredient Relevance (50%)', value: breakdown.ingredient_relevance },
        { label: 'Sensitivity Match (20%)', value: breakdown.sensitivity_match },
        { label: 'Conflict Risk (15%)', value: breakdown.conflict_risk },
        { label: 'User Rating (15%)', value: breakdown.rating },
      ].map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">{item.label}</span>
            <span className="font-medium">{item.value}/100</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-brand-500 h-2 rounded-full"
              style={{ width: `${item.value}%` }}
            />
          </div>
        </div>
      ))}
      <div className="pt-2 border-t flex justify-between">
        <span className="font-medium">Weighted Total</span>
        <span className="font-bold text-lg">{breakdown.weighted_total}/100</span>
      </div>
    </div>
  );

  const renderRoutineSection = (title: string, steps: string[]) => (
    <div>
      <h3 className="font-bold text-base mb-3">{title}</h3>
      <div className="space-y-2">
        {steps.map((step) => {
          const item = getItemForStep(step);
          if (!item) {
            if (step === 'spf') return null;
            return (
              <div key={step} className="bg-gray-100 rounded-lg p-3 text-center text-sm text-gray-400">
                No {step} selected
              </div>
            );
          }
          return (
            <ProductCard
              key={step}
              item={item}
              onScoreClick={() => setModalItem(item)}
              compact
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-bold text-brand-700">SkinSync Advisor</h1>
      </header>
      <Tabs />

      <div className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-4">
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/')}
            className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Re-Analyze Skin
          </button>
          <button
            onClick={() => navigate('/cart')}
            className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Edit Routine
          </button>
          <button
            onClick={() => navigate('/existing-product')}
            className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Add Product I Already Own
          </button>
        </div>

        {/* Confidence */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Profile Confidence:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2.5 max-w-[150px]">
              <div
                className="bg-brand-500 h-2.5 rounded-full"
                style={{ width: `${profile.confidence}%` }}
              />
            </div>
            <span className="text-sm font-medium">{profile.confidence}%</span>
          </div>
        </div>

        {/* SPF Warning */}
        {!hasSPF && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">☀️</span>
            <div>
              <p className="font-medium text-yellow-800">SPF missing (recommended)</p>
              <p className="text-sm text-yellow-600">
                Daily SPF is recommended for most skin concerns. Consider adding one to your routine.
              </p>
            </div>
          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="font-medium text-yellow-800 mb-2">Scheduling Notes</p>
            {conflicts.map((c, i) => (
              <div key={i} className="text-sm text-yellow-700 mb-1">
                {c.pair.join(' + ')}: {c.fix}
              </div>
            ))}
          </div>
        )}

        {/* AM Routine */}
        {renderRoutineSection('☀️ AM Routine', amSteps)}

        {/* PM Routine */}
        {renderRoutineSection('🌙 PM Routine', pmSteps)}

        {/* Refill predictions */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold text-base mb-3">Refill Predictor</h3>
          <div className="space-y-2">
            {routineItems.map((item: RoutineItem) => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.product.name}</span>
                <span className="text-gray-800">
                  Est. refill in <strong>{item.refill.days}</strong> days ({item.refill.date_iso})
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Settings */}
        <div className="pt-4 pb-8 text-center space-y-3">
          <button
            onClick={() => {
              if (confirm('Reset all data? This cannot be undone.')) {
                storage.resetAll();
                navigate('/');
              }
            }}
            className="text-sm text-red-500 hover:underline"
          >
            Reset All Data
          </button>
          <p className="text-xs text-gray-400">
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
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ScoreBadge score={modalItem.score} size={48} />
              <div>
                <p className="font-bold">{modalItem.product.name}</p>
                <p className="text-sm text-gray-500">{modalItem.product.brand}</p>
              </div>
            </div>
            {renderBreakdown(modalItem.score_breakdown)}
            <div>
              <p className="font-medium text-sm mb-2">Why chosen:</p>
              <ul className="space-y-1">
                {modalItem.why.map((w, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                    <span className="text-brand-500">•</span>
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
