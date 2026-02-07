import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import { api } from '../lib/api';
import { formatPrice } from '../lib/format';
import { debugLog } from '../lib/debug';
import TopNav from '../components/TopNav';
import ProductCard from '../components/ProductCard';
import Modal from '../components/Modal';
import ScoreBadge from '../components/ScoreBadge';
import Toast from '../components/Toast';
import type { RoutineItem, SelectedByStep, ScoreBreakdown, StepType, ConflictFinding } from '../lib/types';

const DEV_LOGS = typeof window !== 'undefined' && window.location.hostname === 'localhost';

function devLog(event: string, data?: unknown) {
  if (!DEV_LOGS) return;
  console.log(`[Cart] ${event}`, data ?? '');
  debugLog(`cart:${event}`, data);
}

const ALL_STEPS: StepType[] = ['cleanser', 'treatment', 'moisturizer', 'spf'];

export default function Cart() {
  const navigate = useNavigate();
  const profile = storage.getProfile();
  const selectedPath = storage.getSelectedPath();
  const [selectedByStep, setSelectedByStepState] = useState<SelectedByStep | null>(
    storage.getSelectedByStep()
  );
  const [cartItems, setCartItems] = useState<RoutineItem[]>(storage.getCartItems() || []);
  const [conflicts, setConflicts] = useState<ConflictFinding[]>(storage.getConflicts());
  const [modalItem, setModalItem] = useState<RoutineItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [validating, setValidating] = useState(false);

  // Product picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<StepType | null>(null);
  const [options, setOptions] = useState<RoutineItem[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Derive displayed items from cartItems that match selectedByStep
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

  // Compute which steps have conflicts (for item-level indicators)
  const conflictsByStep = useMemo(() => {
    const map: Record<string, string> = {};
    if (conflicts.length === 0) return map;

    // Build a set of conflicting ingredient names
    const conflictIngredients = new Set<string>();
    conflicts.forEach(c => c.pair.forEach(p => conflictIngredients.add(p.toLowerCase())));

    // Check each item's key ingredients against conflict set
    items.forEach(item => {
      const matching = item.product.key_ingredients.filter(ki =>
        conflictIngredients.has(ki.toLowerCase().replace(/\s+/g, '_'))
      );
      if (matching.length > 0) {
        // Find the specific conflict for this item
        const relevantConflict = conflicts.find(c =>
          c.pair.some(p => matching.some(m => m.toLowerCase().replace(/\s+/g, '_') === p.toLowerCase()))
        );
        if (relevantConflict) {
          map[item.step] = `${relevantConflict.pair.join(' + ')}: ${relevantConflict.fix}`;
        }
      }
    });
    return map;
  }, [items, conflicts]);

  const updateSelectedByStep = useCallback((updated: SelectedByStep) => {
    devLog('selected_by_step:change', updated);
    setSelectedByStepState(updated);
    storage.setSelectedByStep(updated);
  }, []);

  const revalidate = useCallback(
    async (sbs: SelectedByStep) => {
      if (!profile || !selectedPath) return;
      setValidating(true);
      try {
        const budget = storage.getBudget();
        const allergies = storage.getAllergies();
        devLog('validate:start', {
          steps: Object.entries(sbs).filter(([, v]) => v).map(([k]) => k),
        });

        const result = await api.cartValidate({
          profile,
          selectedPath: {
            strategy_key: selectedPath.strategy_key,
            risk_level: selectedPath.risk_level,
          },
          selectedByStep: sbs as Record<string, string | undefined>,
          budget,
          allergies,
        });

        devLog('validate:done', {
          cartSize: result.cart.length,
          conflicts: result.conflicts.length,
          total: result.total,
        });

        setCartItems(result.cart);
        storage.setCartItems(result.cart);
        setConflicts(result.conflicts);
        storage.setConflicts(result.conflicts);

        if (result.conflicts.length > 0) {
          devLog('conflicts:detected', result.conflicts.map((c: any) => c.pair.join(' + ')));
        }
      } catch (err: any) {
        devLog('validate:error', err.message);
        setToast({ message: `Validation failed: ${err.message}`, type: 'error' });
      } finally {
        setValidating(false);
      }
    },
    [profile, selectedPath]
  );

  const handleRemove = useCallback(
    async (step: string) => {
      if (!selectedByStep) return;
      const updated = { ...selectedByStep };
      delete updated[step as keyof SelectedByStep];
      updateSelectedByStep(updated);
      devLog('remove', { step });
      await revalidate(updated);
      setToast({ message: `Removed ${step}`, type: 'info' });
    },
    [selectedByStep, updateSelectedByStep, revalidate]
  );

  const loadOptions = useCallback(
    async (step: StepType) => {
      if (!profile || !selectedPath) return;
      setOptionsLoading(true);
      setOptions([]);
      try {
        const budget = storage.getBudget();
        const allergies = storage.getAllergies();
        devLog('options:load', { step });
        const result = await api.productOptions({
          profile,
          selectedPath: {
            strategy_key: selectedPath.strategy_key,
            risk_level: selectedPath.risk_level,
          },
          step,
          currentRoutine: cartItems,
          budget,
          allergies,
        });
        devLog('options:loaded', { step, count: result.options.length });
        setOptions(result.options);
      } catch (err: any) {
        devLog('options:error', err.message);
        setToast({ message: `Failed to load options: ${err.message}`, type: 'error' });
      } finally {
        setOptionsLoading(false);
      }
    },
    [profile, selectedPath, cartItems]
  );

  const openPicker = useCallback(
    (step: StepType) => {
      setPickerStep(step);
      setPickerSearch('');
      setPickerOpen(true);
      loadOptions(step);
    },
    [loadOptions]
  );

  useEffect(() => {
    if (pickerOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [pickerOpen]);

  const handlePickProduct = useCallback(
    async (productId: string) => {
      if (!pickerStep || !selectedByStep) return;
      const updated = { ...selectedByStep, [pickerStep]: productId } as SelectedByStep;
      updateSelectedByStep(updated);
      setPickerOpen(false);
      setPickerStep(null);

      devLog('pick:product', { step: pickerStep, productId });

      await revalidate(updated);
      setToast({ message: `Updated ${pickerStep}`, type: 'success' });
    },
    [pickerStep, selectedByStep, updateSelectedByStep, revalidate]
  );

  const filteredOptions = useMemo(() => {
    if (!pickerSearch.trim()) return options;
    const q = pickerSearch.toLowerCase();
    return options.filter(
      (o) =>
        o.product.name.toLowerCase().includes(q) ||
        o.product.brand.toLowerCase().includes(q) ||
        o.product.key_ingredients.some((ki) => ki.toLowerCase().includes(q))
    );
  }, [options, pickerSearch]);

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
            <div className="bg-brand-500 h-2.5 rounded-full" style={{ width: `${item.value}%` }} />
          </div>
        </div>
      ))}
      <div className="pt-3 border-t border-sand/40 flex justify-between items-center">
        <span className="font-medium text-lg text-ink">Weighted Total</span>
        <span className="font-bold text-2xl text-ink">{Math.round(breakdown.weighted_total)}/100</span>
      </div>
    </div>
  );

  if (!profile || !selectedByStep) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <TopNav />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-lg text-muted mb-6">No cart yet. Start with an intake.</p>
            <button onClick={() => navigate('/')} className="px-8 py-4 bg-brand-500 text-white rounded-full text-lg font-semibold hover:bg-brand-600 active:press transition-all duration-200">
              Start Intake
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasProducts = items.length > 0;

  return (
    <div className="min-h-screen bg-cream flex flex-col animate-fade-in">
      <TopNav />

      <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
        {/* Cart header */}
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-ink flex items-center gap-3">
            Your Cart
            {validating && (
              <span className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin inline-block" />
            )}
          </h2>
          <button
            onClick={() => {
              setPickerStep(null);
              setPickerSearch('');
              setPickerOpen(true);
            }}
            className="px-5 py-3 bg-brand-500 text-white rounded-full text-base font-semibold hover:bg-brand-600 active:press transition-all duration-200"
          >
            + Add Product
          </button>
        </div>

        {/* Conflicts summary (only show when conflicts exist) */}
        {conflicts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-700 text-base font-bold">Warning</span>
              <p className="font-medium text-lg text-amber-800">
                {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} detected
              </p>
            </div>
            {conflicts.map((c, i) => (
              <div key={i} className="text-base text-amber-700 mb-1.5">
                <strong>{c.pair.join(' + ')}</strong>: {c.alert}
                <br />
                <span className="text-amber-600">Fix: {c.fix}</span>
              </div>
            ))}
          </div>
        )}

        {/* No-conflict confirmation (neutral, not a big banner) */}
        {conflicts.length === 0 && hasProducts && !validating && (
          <p className="text-lg text-muted">All products compatible — no conflicts detected.</p>
        )}

        {/* Cart items -- show all 4 steps, filled or empty */}
        <div className="space-y-3">
          {ALL_STEPS.map((step) => {
            const item = items.find((i) => i.step === step);
            if (item) {
              return (
                <ProductCard
                  key={step}
                  item={item}
                  onScoreClick={() => setModalItem(item)}
                  onRemove={() => handleRemove(item.step)}
                  onChangePick={() => openPicker(step)}
                  conflictWarning={conflictsByStep[step]}
                />
              );
            }
            // Empty step row
            return (
              <div
                key={step}
                className="rounded-2xl border border-dashed border-sand p-6 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-muted uppercase tracking-wider font-medium mb-1">{step}</p>
                  <p className="text-base text-muted">No product selected</p>
                </div>
                <button
                  onClick={() => openPicker(step)}
                  className="px-5 py-3 bg-brand-500 text-white rounded-full text-base font-medium hover:bg-brand-600 active:press transition-all"
                >
                  Add
                </button>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="bg-white rounded-2xl p-6 shadow-card flex justify-between items-center">
          <span className="font-semibold text-lg text-ink">Estimated Total</span>
          <span className="font-bold text-2xl text-ink tabular-nums">{formatPrice(total)}</span>
        </div>

        {/* Confirm Cart button */}
        <button
          onClick={() => navigate('/routine')}
          disabled={!hasProducts}
          className="w-full py-5 bg-brand-500 text-white rounded-full text-lg font-semibold hover:bg-brand-600 active:press disabled:bg-sand disabled:text-muted disabled:cursor-not-allowed transition-all duration-200"
        >
          Confirm Cart &rarr; View Routine
        </button>

        <p className="text-sm text-muted text-center pb-6">
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
                    <span className="text-brand-500">&bull;</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Product Picker Modal */}
      <Modal
        open={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerStep(null); }}
        title={pickerStep ? `Select ${pickerStep}` : 'Add Product'}
      >
        <div className="space-y-4">
          {/* Step selector when opened from global "Add Product" button */}
          {!pickerStep && (
            <div className="space-y-2">
              <p className="text-base text-muted">Choose a step:</p>
              {ALL_STEPS.map((step) => (
                <button
                  key={step}
                  onClick={() => {
                    setPickerStep(step);
                    loadOptions(step);
                  }}
                  className="w-full text-left px-5 py-4 rounded-xl bg-white hover:bg-brand-50 transition-colors flex items-center justify-between"
                >
                  <span className="capitalize font-medium text-lg text-ink">{step}</span>
                  {selectedByStep[step] ? (
                    <span className="text-sm text-brand-600 font-medium">Selected</span>
                  ) : (
                    <span className="text-sm text-muted">Empty</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Product options list */}
          {pickerStep && (
            <>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search by name, brand, or ingredient..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full px-5 py-4 bg-beige border border-sand rounded-2xl text-base focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
              />
              {optionsLoading && (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                </div>
              )}
              {!optionsLoading && filteredOptions.length === 0 && (
                <p className="text-base text-muted text-center py-6">No products found for this step.</p>
              )}
              <div className="max-h-80 overflow-y-auto space-y-2">
                {filteredOptions.map((option) => {
                  const isSelected = selectedByStep[pickerStep] === option.product.id;
                  return (
                    <button
                      key={option.product.id}
                      onClick={() => handlePickProduct(option.product.id)}
                      disabled={isSelected}
                      className={`w-full text-left px-5 py-4 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-brand-50 ring-1 ring-brand-300 opacity-60 cursor-default'
                          : 'bg-white hover:bg-brand-50 active:press'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-base text-ink truncate">{option.product.name}</p>
                          <p className="text-sm text-muted">{option.product.brand}</p>
                          <p className="text-sm text-muted/60 truncate mt-0.5">
                            {option.product.key_ingredients.slice(0, 3).join(' · ')}
                          </p>
                        </div>
                        <div className="text-right ml-4 shrink-0 flex flex-col items-end gap-1.5">
                          <ScoreBadge score={option.score} size={28} />
                          <p className="font-semibold text-base text-ink tabular-nums">{formatPrice(option.product.price)}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <p className="text-sm text-brand-600 mt-1.5 font-medium">Currently selected</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
