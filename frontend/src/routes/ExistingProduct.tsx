import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { storage } from '../lib/storage';
import TopNav from '../components/TopNav';

const STEP_OPTIONS = ['cleanser', 'treatment', 'moisturizer', 'spf', 'toner', 'serum'];
const INGREDIENT_OPTIONS = [
  'retinol', 'glycolic_acid', 'salicylic_acid', 'vitamin_c',
  'benzoyl_peroxide', 'niacinamide', 'ceramides', 'hyaluronic_acid',
  'lactic_acid', 'other',
];

export default function ExistingProduct() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [stepType, setStepType] = useState('cleanser');
  const [keyIngredient, setKeyIngredient] = useState('retinol');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (!name.trim()) {
      setError('Please enter a product name.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const cartItems = storage.getCartItems() || [];
      const res = await api.existingCheck({
        existing: { name, step_type: stepType, key_ingredient: keyIngredient },
        currentRoutine: cartItems,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col animate-fade-in">
      <header className="bg-cream/80 backdrop-blur-sm border-b border-sand/30 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-muted hover:text-ink transition-colors active:press text-lg">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-ink">Add Product I Already Own</h1>
      </header>
      {storage.hasResults() && <TopNav />}

      <div className="flex-1 max-w-lg mx-auto w-full p-6 space-y-6">
        <p className="text-lg text-muted">
          Enter a product you already own to check for conflicts with your current routine.
        </p>

        <div>
          <label htmlFor="product-name" className="block text-lg font-medium text-ink mb-3">
            Product Name *
          </label>
          <input
            id="product-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Paula's Choice 2% BHA Exfoliant"
            className="w-full px-5 py-4 bg-beige border border-sand rounded-2xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 text-lg"
          />
        </div>

        <div>
          <label htmlFor="step-type" className="block text-lg font-medium text-ink mb-3">
            Step Type
          </label>
          <select
            id="step-type"
            value={stepType}
            onChange={(e) => setStepType(e.target.value)}
            className="w-full px-5 py-4 bg-beige border border-sand rounded-2xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 text-lg"
          >
            {STEP_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="key-ingredient" className="block text-lg font-medium text-ink mb-3">
            Key Active Ingredient
          </label>
          <select
            id="key-ingredient"
            value={keyIngredient}
            onChange={(e) => setKeyIngredient(e.target.value)}
            className="w-full px-5 py-4 bg-beige border border-sand rounded-2xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 text-lg"
          >
            {INGREDIENT_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {i.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-rose-600 text-base">{error}</p>}

        <button
          onClick={handleCheck}
          disabled={loading || !name.trim()}
          className="w-full py-5 bg-brand-500 text-white rounded-full text-lg font-semibold hover:bg-brand-600 active:press disabled:bg-sand disabled:text-muted disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? 'Checking...' : 'Check Conflicts'}
        </button>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {result.status === 'ok' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-emerald-600 text-base font-bold">OK</span>
                  <p className="font-medium text-lg text-emerald-800">No conflicts found</p>
                </div>
                <p className="text-base text-emerald-600">{result.message}</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-amber-700 text-base font-bold">Warning</span>
                  <p className="font-medium text-lg text-amber-800">Conflicts detected</p>
                </div>
                <p className="text-base text-amber-700 mb-3">{result.message}</p>
                {result.conflicts?.map((c: any, i: number) => (
                  <div key={i} className="text-base text-amber-700 bg-amber-100 rounded-xl p-3 mb-2">
                    <strong>{c.pair.join(' + ')}</strong>: {c.alert}
                    <br />
                    <span className="text-amber-600">Fix: {c.fix}</span>
                  </div>
                ))}
              </div>
            )}

            {result.buy_link && (
              <a
                href={result.buy_link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 bg-beige text-brand-600 rounded-full text-lg font-medium text-center hover:bg-sand/60 transition-colors"
              >
                Search for "{name}" online
              </a>
            )}
          </div>
        )}

        <p className="text-sm text-muted text-center pb-6">
          Educational shopping support — not medical diagnosis.
        </p>
      </div>
    </div>
  );
}
