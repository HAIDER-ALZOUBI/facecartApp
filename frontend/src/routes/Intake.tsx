import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { storage } from '../lib/storage';
import { debugLog } from '../lib/debug';
import Stepper from '../components/Stepper';
import YesNoQuestion from '../components/YesNoQuestion';

type Phase = 'input' | 'questions' | 'loading';

export default function Intake() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('input');
  const [text, setText] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Array<{ id: string; question: string }>>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'no'>>({});
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [showAllergyInput, setShowAllergyInput] = useState(false);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleContinue = async () => {
    if (!text.trim()) {
      setError('Please describe your skin concern.');
      return;
    }
    setError('');
    setLoadingMsg('Generating follow-up questions...');
    setPhase('loading');
    debugLog('intake:phase', { from: 'input', to: 'loading' });
    try {
      const result = await api.intakeQuestions(text);
      setQuestions(result.questions);
      setCurrentQ(0);
      setPhase('questions');
      debugLog('intake:phase', { from: 'loading', to: 'questions', questionCount: result.questions.length });
    } catch (err: any) {
      setError(err.message);
      setPhase('input');
    }
  };

  const handleAnswer = (answer: 'yes' | 'no') => {
    const q = questions[currentQ];
    const newAnswers = { ...answers, [q.id]: answer };
    setAnswers(newAnswers);
    debugLog('intake:answer', { questionId: q.id, answer, slide: currentQ + 1 });

    // Q1 is the allergy question
    if (currentQ === 0) {
      if (answer === 'yes') {
        setShowAllergyInput(true);
        return; // Don't advance yet, wait for allergy input
      } else {
        setShowAllergyInput(false);
        setAllergies([]);
      }
    }

    advanceQuestion(newAnswers);
  };

  const handleAllergySubmit = () => {
    const parsed = allergyInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setAllergies(parsed);
    storage.setAllergies(parsed);
    debugLog('intake:allergies', { tokenCount: parsed.length });
    setShowAllergyInput(false);
    advanceQuestion(answers);
  };

  const advanceQuestion = (currentAnswers: Record<string, 'yes' | 'no'>) => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      // All questions answered, submit
      submitProfile(currentAnswers);
    }
  };

  const submitProfile = async (finalAnswers: Record<string, 'yes' | 'no'>) => {
    setLoadingMsg('Analyzing your skin context...');
    setPhase('loading');
    debugLog('intake:phase', { from: 'questions', to: 'loading (profile submit)' });
    try {
      const existingProfile = storage.getProfile();
      const profile = await api.intakeProfile({
        text,
        photoBase64DataUrl: photoDataUrl,
        answers: finalAnswers,
        allergies: allergies.length > 0 ? allergies : null,
        existingProfile,
      });

      storage.setProfile(profile);
      storage.addHistory();

      // Now get paths
      setLoadingMsg('Finding treatment strategies...');
      const pathsResult = await api.analysisPaths(profile);
      storage.setPaths(pathsResult.paths);

      // Get previews
      setLoadingMsg('Building plan previews...');
      const previewResult = await api.analysisPreview(
        profile,
        pathsResult.paths.map((p: any) => ({
          strategy_key: p.strategy_key,
          risk_level: p.risk_level,
        })),
        allergies.length > 0 ? allergies : null
      );
      storage.setPathPreviews(previewResult.previews);

      navigate('/results');
    } catch (err: any) {
      setError(err.message);
      setPhase('questions');
    }
  };

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{loadingMsg}</p>
        </div>
      </div>
    );
  }

  if (phase === 'questions' && questions.length > 0) {
    const q = questions[currentQ];
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-white border-b px-4 py-3">
          <h1 className="text-lg font-bold text-brand-700">SkinSync Advisor</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full">
          <Stepper current={currentQ} total={questions.length} />

          <div className="w-full space-y-6 mt-4">
            <YesNoQuestion
              question={q.question}
              onAnswer={handleAnswer}
              selected={answers[q.id]}
            />

            {showAllergyInput && currentQ === 0 && (
              <div className="space-y-3 animate-in fade-in">
                <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">
                  List your allergies (comma-separated):
                </label>
                <input
                  id="allergies"
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  placeholder="e.g., salicylic acid, fragrance, retinol"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
                />
                <button
                  onClick={handleAllergySubmit}
                  className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

          <p className="text-xs text-gray-400 mt-8 text-center">
            Educational shopping support — not medical diagnosis.
          </p>
        </div>
      </div>
    );
  }

  // Input phase
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-brand-700">SkinSync Advisor</h1>
        <button
          onClick={() => navigate('/how-it-works')}
          className="text-sm text-brand-600 hover:underline"
        >
          How it works
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🧴</div>
          <h2 className="text-2xl font-bold text-gray-800">
            Find Your Perfect Routine
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Tell us about your skin and we'll build a validated, conflict-free shopping list.
          </p>
        </div>

        <div className="w-full space-y-4">
          <div>
            <label htmlFor="skin-text" className="block text-sm font-medium text-gray-700 mb-1">
              Describe what's going on with your skin *
            </label>
            <textarea
              id="skin-text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., I've been getting breakouts on my chin and my skin feels oily by noon. I also have some dark spots from old acne..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Optional: Upload a photo (selfie or close-up)
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
              >
                {photoDataUrl ? 'Photo selected ✓' : 'Choose photo'}
              </button>
              {photoDataUrl && (
                <button
                  onClick={() => { setPhotoDataUrl(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              aria-label="Upload skin photo"
            />
            <p className="text-xs text-gray-400 mt-1">
              Your photo is never saved. It's only sent once for analysis and then discarded.
            </p>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={handleContinue}
            disabled={!text.trim()}
            className="w-full py-4 bg-brand-600 text-white rounded-xl text-lg font-medium hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-8 text-center">
          Educational shopping support — not medical diagnosis.
        </p>
      </div>
    </div>
  );
}
