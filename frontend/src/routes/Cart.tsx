import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import { api } from '../lib/api';
import { formatPrice } from '../lib/format';
import { debugLog } from '../lib/debug';
import Tabs from '../components/Tabs';
import ProductCard from '../components/ProductCard';
import Modal from '../components/Modal';
import ScoreBadge from '../components/ScoreBadge';
import Toast from '../components/Toast';
import type { RoutineItem, SelectedByStep, ScoreBreakdown } from '../lib/types';

export default function Cart() {
  const navigate = useNavigate();
  const profile = storage.getProfile();
  const selectedPath = storage.getSelectedPath();
  const [selectedByStep, setSelectedByStep] = useState<SelectedByStep | null>(
    storage.getSelectedByStep()
  );
  const [cartItems, setCartItems] = useState<RoutineItem[]>(storage.getCartItems() || []);
  const conflicts = storage.getConflicts();
  const [modalItem, setModalItem] = useState<RoutineItem | null>(null);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const items = useMemo(() => {
    if (!selectedByStep) return [];
    return cartItems.filter(
      (item: RoutineItem) =>
        selectedByStep[item.step as keyof SelectedByStep] === item.product.id
    );
  }, [selectedByStep, cartItems]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price, 0),
    [items]
  );

  const handleRemove = useCallback(
    (step: string) => {
      if (!selectedByStep) return;
      const updated = { ...selectedByStep };
      delete updated[step as keyof SelectedByStep];
      setSelectedByStep(updated);
      storage.setSelectedByStep(updated);
      debugLog('cart:remove', { step, selectedByStep: updated });
    },
    [selectedByStep]
  );

  const handleSwap = useCallback(
    async (step: string, currentProductId: string) => {
      if (!profile || !selectedPath) return;
      setSwapping(step);
      try {
        const budget = storage.getBudget();
        const allergies = storage.getAllergies();
        const result = await api.cartSwap({
          profile,
          selectedPath: {
            strategy_key: selectedPath.strategy_key,
            risk_level: selectedPath.risk_level,
          },
          step,
          currentRoutine: cartItems,
          excludeProductId: currentProductId,
          budget,
          allergies,
        });

        // Update the authoritative state
        const updated = { ...selectedByStep, [step]: result.replacement.product.id } as SelectedByStep;
        setSelectedByStep(updated);
        storage.setSelectedByStep(updated);

        // Update cart items
        const newItems = cartItems.map((item) =>
          item.step === step ? result.replacement : item
        );
        setCartItems(newItems);
        storage.setCartItems(newItems);
        storage.setConflicts(result.conflicts || []);

        debugLog('cart:swap:done', {
          step,
          oldId: currentProductId,
          newId: result.replacement.product.id,
          selectedByStep: updated,
        });

        setToast({ message: `Swapped ${step} successfully`, type: 'success' });
      } catch (err: any) {
        setToast({ message: err.message, type: 'error' });
      } finally {
        setSwapping(null);
      }
    },
    [profile, selectedPath, selectedByStep, cartItems]
  );

  const openAllBuyLinks = () => {
    items.forEach((item) => {
      const link = item.product.buy_links?.[0];
      if (link) window.open(link.url, '_blank');
    });
  };

  const copyShoppingList = async () => {
    const lines = items.map(
      (item) =>
        `${item.product.name} (${item.product.brand}) - ${formatPrice(item.product.price)} - ${item.product.buy_links?.[0]?.url || ''}`
    );
    lines.push(`\nTotal: ${formatPrice(total)}`);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setToast({ message: 'Shopping list copied!', type: 'success' });
    } catch {
      setToast({ message: 'Failed to copy', type: 'error' });
    }
  };

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
            <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${item.value}%` }} />
          </div>
        </div>
      ))}
      <div className="pt-2 border-t flex justify-between">
        <span className="font-medium">Weighted Total</span>
        <span className="font-bold text-lg">{breakdown.weighted_total}/100</span>
      </div>
    </div>
  );

  if (!profile || !selectedByStep) {
    return (
      <div className="min-h-screen flex flex-col">
        <Tabs />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No cart yet. Start with an intake.</p>
            <button onClick={() => navigate('/')} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium">
              Start Intake
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-bold text-brand-700">SkinSync Advisor</h1>
      </header>
      <Tabs />

      <div className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-4">
        <h2 className="text-xl font-bold">Cart · Purchase Validation</h2>

        {/* Compatibility status */}
        {conflicts.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
            <span className="text-green-600 text-lg">✅</span>
            <div>
              <p className="font-medium text-green-800">All products are compatible</p>
              <p className="text-sm text-green-600">This is your validated shopping list. All conflicts have been resolved.</p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚠️</span>
              <p className="font-medium text-yellow-800">Scheduling notes</p>
            </div>
            {conflicts.map((c, i) => (
              <p key={i} className="text-sm text-yellow-700">{c.pair.join(' + ')}: {c.fix}</p>
            ))}
          </div>
        )}

        {/* Top actions */}
        <div className="flex gap-2">
          <button
            onClick={openAllBuyLinks}
            className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Open all buy links
          </button>
          <button
            onClick={copyShoppingList}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Copy shopping list
          </button>
        </div>

        {/* Cart items */}
        <div className="space-y-3">
          {items.map((item: RoutineItem) => (
            <div key={item.product.id} className="relative">
              {swapping === item.step && (
                <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-lg">
                  <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                </div>
              )}
              <ProductCard
                item={item}
                onScoreClick={() => setModalItem(item)}
                onSwap={() => handleSwap(item.step, item.product.id)}
                onRemove={() => handleRemove(item.step)}
                showBuyLinks
              />
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
          <span className="font-bold text-lg">Total</span>
          <span className="font-bold text-xl text-brand-700">{formatPrice(total)}</span>
        </div>

        <p className="text-xs text-gray-400 text-center pb-4">
          Educational shopping support — not medical diagnosis.
        </p>
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
                    <span className="text-brand-500">•</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
