import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import { api } from '../lib/api';
import { formatConcern, formatRisk, riskColor, formatPrice } from '../lib/format';
import ScoreBadge from '../components/ScoreBadge';
import type { TreatmentPath, PathPreview } from '../lib/types';

export default function Results() {
  const navigate = useNavigate();
  const profile = storage.getProfile();
  const paths = storage.getPaths();
  const previews = storage.getPathPreviews();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!profile || !paths) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No results yet. Start with an intake.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium"
          >
            Start Intake
          </button>
        </div>
      </div>
    );
  }

  const selectPath = async (path: TreatmentPath) => {
    setLoading(true);
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

      navigate('/routine');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPreview = (strategyKey: string): PathPreview | undefined => {
    return previews?.find((p) => p.strategy_key === strategyKey);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-bold text-brand-700">SkinSync Advisor</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Profile Section */}
        <section className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-bold mb-3">Skin Context Profile</h2>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-500">Confidence:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-[200px]">
              <div
                className="bg-brand-500 h-3 rounded-full transition-all"
                style={{ width: `${profile.confidence}%` }}
              />
            </div>
            <span className="text-sm font-medium">{profile.confidence}%</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Barrier Sensitivity</p>
              <p className="font-semibold text-sm capitalize">{profile.barrier_sensitivity}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Oil Production</p>
              <p className="font-semibold text-sm capitalize">{profile.oil_production}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Inflammation Risk</p>
              <p className="font-semibold text-sm capitalize">{profile.inflammation_risk}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Primary Concerns</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.primary_concerns.map((c) => (
                  <span key={c} className="px-2 py-1 bg-brand-100 text-brand-700 rounded-full text-xs">
                    {formatConcern(c)}
                  </span>
                ))}
              </div>
            </div>
            {profile.likely_triggers.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Likely Triggers</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.likely_triggers.map((t) => (
                    <span key={t} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Treatment Paths */}
        <section>
          <h2 className="text-lg font-bold mb-3">Choose Your Treatment Path</h2>
          <p className="text-sm text-gray-500 mb-4">
            Each path uses a different strategy. Plan previews show real products from our catalog.
          </p>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <div className="space-y-4">
            {paths.map((path: TreatmentPath, idx: number) => {
              const preview = getPreview(path.strategy_key);
              return (
                <div key={idx} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-base">{path.name}</h3>
                        <p className="text-xs text-gray-500">{path.who_its_for}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${riskColor(path.risk_level)}`}>
                        {formatRisk(path.risk_level)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{path.explanation}</p>

                    {/* Plan Preview */}
                    {preview && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Plan Preview (engine-picked from catalog)
                          </p>
                          <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                            Validated by engine
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {(['cleanser', 'treatment', 'moisturizer', 'spf'] as const).map((step) => {
                            const item = preview.plan[step];
                            if (!item) return null;
                            return (
                              <div key={step} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 uppercase w-20">{step}</span>
                                  <span className="text-gray-800">{item.product.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">{formatPrice(item.product.price)}</span>
                                  <ScoreBadge score={item.score} size={24} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                          <span className="text-sm font-medium">Preview Total</span>
                          <span className="font-bold text-brand-700">{formatPrice(preview.total)}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => selectPath(path)}
                      disabled={loading}
                      className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:bg-gray-300 transition-colors"
                    >
                      {loading ? 'Building routine...' : 'Select This Path'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-xs text-gray-400 text-center pb-4">
          Educational shopping support — not medical diagnosis.
        </p>
      </div>
    </div>
  );
}
