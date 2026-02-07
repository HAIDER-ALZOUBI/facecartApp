import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { storage } from '../lib/storage';
import Tabs from '../components/Tabs';

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          ← Back
        </button>
        <h1 className="text-lg font-bold text-brand-700">Add Product I Already Own</h1>
      </header>
      {storage.hasResults() && <Tabs />}

      <div className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        <p className="text-sm text-gray-500">
          Enter a product you already own to check for conflicts with your current routine.
        </p>

        <div>
          <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1">
            Product Name *
          </label>
          <input
            id="product-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Paula's Choice 2% BHA Exfoliant"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="step-type" className="block text-sm font-medium text-gray-700 mb-1">
            Step Type
          </label>
          <select
            id="step-type"
            value={stepType}
            onChange={(e) => setStepType(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
          >
            {STEP_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="key-ingredient" className="block text-sm font-medium text-gray-700 mb-1">
            Key Active Ingredient
          </label>
          <select
            id="key-ingredient"
            value={keyIngredient}
            onChange={(e) => setKeyIngredient(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
          >
            {INGREDIENT_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {i.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          onClick={handleCheck}
          disabled={loading || !name.trim()}
          className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:bg-gray-300 transition-colors"
        >
          {loading ? 'Checking...' : 'Check Conflicts'}
        </button>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {result.status === 'ok' ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-600 text-lg">✅</span>
                  <p className="font-medium text-green-800">No conflicts found</p>
                </div>
                <p className="text-sm text-green-600">{result.message}</p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <p className="font-medium text-yellow-800">Conflicts detected</p>
                </div>
                <p className="text-sm text-yellow-700 mb-2">{result.message}</p>
                {result.conflicts?.map((c: any, i: number) => (
                  <div key={i} className="text-sm text-yellow-700 bg-yellow-100 rounded-lg p-2 mb-1">
                    <strong>{c.pair.join(' + ')}</strong>: {c.alert}
                    <br />
                    <span className="text-yellow-600">Fix: {c.fix}</span>
                  </div>
                ))}
              </div>
            )}

            {result.buy_link && (
              <a
                href={result.buy_link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 bg-brand-100 text-brand-700 rounded-xl font-medium text-center hover:bg-brand-200 transition-colors"
              >
                🔍 Search for "{name}" online
              </a>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pb-4">
          Educational shopping support — not medical diagnosis.
        </p>
      </div>
    </div>
  );
}
