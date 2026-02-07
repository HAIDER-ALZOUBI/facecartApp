import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { storage } from '../lib/storage';
import Tabs from '../components/Tabs';

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
      setTimeout(() => navigate('/routine'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!existingProfile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Tabs />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Complete an intake first to add concerns.</p>
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-bold text-brand-700">SkinSync Advisor</h1>
      </header>
      <Tabs />

      <div className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        <h2 className="text-xl font-bold">Add New Concern</h2>
        <p className="text-sm text-gray-500">
          Describe a new concern. Your existing profile will be updated — not replaced.
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-green-800 font-medium text-lg mb-2">Profile updated!</p>
            <p className="text-sm text-green-600">Redirecting to your routine...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="concern-text" className="block text-sm font-medium text-gray-700 mb-1">
                Describe your new concern *
              </label>
              <textarea
                id="concern-text"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g., I'm noticing some new dark spots on my cheeks..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Optional: New photo
              </label>
              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-brand-400"
              >
                {photoDataUrl ? 'Photo selected ✓' : 'Choose photo'}
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

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
              className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:bg-gray-300 transition-colors"
            >
              {loading ? 'Updating profile...' : 'Add Concern & Update'}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Educational shopping support — not medical diagnosis.
        </p>
      </div>
    </div>
  );
}
