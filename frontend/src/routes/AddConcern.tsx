import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { storage } from '../lib/storage';
import TopNav from '../components/TopNav';

export default function AddConcern() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingProfile = storage.getProfile();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('Please describe your new concern.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const allergies = storage.getAllergies();

      // Generate profile with merge
      const profile = await api.intakeProfile({
        text,
        photoBase64DataUrl: photoDataUrl,
        answers: {},
        allergies,
        existingProfile,
      });

      storage.setProfile(profile);
      storage.addHistory();

      // Re-generate paths
      const pathsResult = await api.analysisPaths(profile);
      storage.setPaths(pathsResult.paths);

      // Re-generate previews
      const previewResult = await api.analysisPreview(
        profile,
        pathsResult.paths.map((p: any) => ({
          strategy_key: p.strategy_key,
          risk_level: p.risk_level,
        })),
        allergies
      );
      storage.setPathPreviews(previewResult.previews);

      // If we have a selected path, re-generate the routine
      const selectedPath = storage.getSelectedPath();
      if (selectedPath) {
        const budget = storage.getBudget();
        const result = await api.routineGenerate({
          profile,
          selectedPath: {
            strategy_key: selectedPath.strategy_key,
            risk_level: selectedPath.risk_level,
          },
          budget,
          allergies,
        });

        const selectedByStep: Record<string, string> = {};
        for (const item of result.cart) {
          selectedByStep[item.step] = item.product.id;
        }
        storage.setSelectedByStep(selectedByStep);
        storage.setConflicts(result.conflicts || []);
        storage.setCartItems(result.cart);
      }

      setSuccess(true);
      setTimeout(() => navigate('/cart'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!existingProfile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <TopNav />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-lg text-muted mb-6">Complete an intake first to add concerns.</p>
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

  return (
    <div className="min-h-screen bg-cream flex flex-col animate-fade-in">
      <TopNav />

      <div className="flex-1 max-w-lg mx-auto w-full p-6 space-y-6">
        <h2 className="text-3xl font-bold text-ink">Add New Concern</h2>
        <p className="text-lg text-muted">
          Describe a new concern. Your existing profile will be updated — not replaced.
        </p>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center">
            <p className="text-emerald-800 font-medium text-2xl mb-3">Profile updated!</p>
            <p className="text-base text-emerald-600">Redirecting to your routine...</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label htmlFor="concern-text" className="block text-lg font-medium text-ink mb-3">
                Describe your new concern *
              </label>
              <textarea
                id="concern-text"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g., I'm noticing some new dark spots on my cheeks..."
                className="w-full px-5 py-4 bg-beige border border-sand rounded-2xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 resize-none text-lg"
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-ink mb-3">
                Optional: New photo
              </label>
              <button
                onClick={() => fileRef.current?.click()}
                className={`px-5 py-3 border border-dashed rounded-full text-base transition-colors ${
                  photoDataUrl
                    ? 'border-brand-400 text-brand-700 bg-brand-50'
                    : 'border-sand text-muted hover:border-brand-400'
                }`}
              >
                {photoDataUrl ? 'Photo selected' : 'Choose photo'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                aria-label="Upload photo"
              />
            </div>

            {error && <p className="text-rose-600 text-base">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
              className="w-full py-5 bg-brand-500 text-white rounded-full text-lg font-semibold hover:bg-brand-600 active:press disabled:bg-sand disabled:text-muted disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Updating profile...' : 'Add Concern & Update'}
            </button>
          </div>
        )}

        <p className="text-sm text-muted text-center">
          Educational shopping support — not medical diagnosis.
        </p>
      </div>
    </div>
  );
}
