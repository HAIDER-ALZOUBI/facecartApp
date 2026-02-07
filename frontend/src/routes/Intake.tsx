import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { storage } from '../lib/storage';
import { debugLog } from '../lib/debug';
import { formatConcern } from '../lib/format';
import Stepper from '../components/Stepper';
import YesNoQuestion from '../components/YesNoQuestion';
import type { SkinContextProfile } from '../lib/types';

type Phase = 'input' | 'questions' | 'analyzing' | 'summary';

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
  const [analyzeStep, setAnalyzeStep] = useState('');
  const [profileResult, setProfileResult] = useState<SkinContextProfile | null>(null);
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
    setAnalyzeStep('Generating follow-up questions...');
    setPhase('analyzing');
    debugLog('intake:phase', { from: 'input', to: 'analyzing' });
    try {
      const result = await api.intakeQuestions(text);
      setQuestions(result.questions);
      setCurrentQ(0);
      setPhase('questions');
      debugLog('intake:phase', { from: 'analyzing', to: 'questions', questionCount: result.questions.length });
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
        return;
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
      submitProfile(currentAnswers);
    }
  };

  const submitProfile = async (finalAnswers: Record<string, 'yes' | 'no'>) => {
    setAnalyzeStep('Analyzing your skin context...');
    setPhase('analyzing');
    debugLog('intake:phase', { from: 'questions', to: 'analyzing (profile submit)' });
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

      // Get paths
      setAnalyzeStep('Finding treatment strategies...');
      const pathsResult = await api.analysisPaths(profile);
      storage.setPaths(pathsResult.paths);

      // Get previews
      setAnalyzeStep('Building plan previews...');
      const previewResult = await api.analysisPreview(
        profile,
        pathsResult.paths.map((p: any) => ({
          strategy_key: p.strategy_key,
          risk_level: p.risk_level,
        })),
        allergies.length > 0 ? allergies : null
      );
      storage.setPathPreviews(previewResult.previews);

      setProfileResult(profile);
      setPhase('summary');
    } catch (err: any) {
      setError(err.message);
      setPhase('questions');
    }
  };

  const handleSummaryNext = () => {
    navigate('/results');
  };

  // --- Analyzing screen ---
  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-8 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-card max-w-lg w-full p-10 text-center">
          {/* Animated dots */}
          <div className="flex justify-center gap-2.5 mb-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-brand-400 animate-soft-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>
          <h2 className="text-3xl font-bold text-ink mb-3">Analyzing your skin context...</h2>
          <p className="text-lg text-muted mb-8">Building a conflict-free routine from our catalog.</p>

          {/* Skeleton preview */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-soft-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                <div className="w-10 h-10 rounded-xl bg-sand/40" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-sand/40 rounded-full w-3/4" />
                  <div className="h-2.5 bg-sand/40 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted mt-8">{analyzeStep}</p>
        </div>
      </div>
    );
  }

  // --- Summary screen (post-analysis, before path selection) ---
  if (phase === 'summary' && profileResult) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-8 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-card max-w-lg w-full p-10">
          <h2 className="text-3xl font-bold text-ink mb-2">Your Skin Profile</h2>
          <p className="text-lg text-muted mb-8">Here's what we found. Review and continue to choose a treatment path.</p>

          {/* Confidence */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-medium text-ink">Analysis Confidence</span>
              <span className="text-2xl font-bold text-brand-600 tabular-nums">{Math.round(profileResult.confidence)}%</span>
            </div>
            <div className="w-full bg-beige rounded-full h-2.5">
              <div
                className="bg-brand-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${profileResult.confidence}%` }}
              />
            </div>
          </div>

          {/* Primary concerns */}
          <div className="mb-6">
            <p className="text-sm uppercase tracking-wider text-muted font-medium mb-3">Primary Concerns</p>
            <div className="flex flex-wrap gap-2">
              {profileResult.primary_concerns.map((c) => (
                <span key={c} className="px-4 py-2 bg-brand-50 text-brand-700 rounded-full text-sm font-medium border border-brand-200">
                  {formatConcern(c)}
                </span>
              ))}
            </div>
          </div>

          {/* Likely triggers */}
          {profileResult.likely_triggers.length > 0 && (
            <div className="mb-6">
              <p className="text-sm uppercase tracking-wider text-muted font-medium mb-3">Likely Triggers</p>
              <div className="flex flex-wrap gap-2">
                {profileResult.likely_triggers.map((t) => (
                  <span key={t} className="px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-200">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Profile stats */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            <div className="bg-beige rounded-2xl p-4 text-center">
              <p className="text-sm text-muted uppercase tracking-wider mb-1">Barrier</p>
              <p className="font-bold text-lg text-ink capitalize">{profileResult.barrier_sensitivity}</p>
            </div>
            <div className="bg-beige rounded-2xl p-4 text-center">
              <p className="text-sm text-muted uppercase tracking-wider mb-1">Oil</p>
              <p className="font-bold text-lg text-ink capitalize">{profileResult.oil_production}</p>
            </div>
            <div className="bg-beige rounded-2xl p-4 text-center">
              <p className="text-sm text-muted uppercase tracking-wider mb-1">Inflammation</p>
              <p className="font-bold text-lg text-ink capitalize">{profileResult.inflammation_risk}</p>
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={handleSummaryNext}
            className="w-full py-5 bg-brand-500 text-white rounded-full text-lg font-semibold hover:bg-brand-600 active:press transition-all duration-200"
          >
            Choose Treatment Path
          </button>
        </div>

        <p className="text-sm text-muted mt-8 text-center">
          Educational shopping support — not medical diagnosis.
        </p>
      </div>
    );
  }

  // --- Questions phase (slide wizard) ---
  if (phase === 'questions' && questions.length > 0) {
    const q = questions[currentQ];
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-8 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-card max-w-lg w-full p-10">
          <Stepper current={currentQ} total={questions.length} />

          <div className="mt-8 space-y-8">
            <YesNoQuestion
              question={q.question}
              onAnswer={handleAnswer}
              selected={answers[q.id]}
            />

            {showAllergyInput && currentQ === 0 && (
              <div className="space-y-4 pt-2">
                <label htmlFor="allergies" className="block text-base font-medium text-ink">
                  List your allergies (comma-separated):
                </label>
                <input
                  id="allergies"
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  placeholder="e.g., salicylic acid, fragrance, retinol"
                  className="w-full px-5 py-4 bg-beige border border-sand rounded-2xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 text-lg"
                />
                <button
                  onClick={handleAllergySubmit}
                  className="w-full py-4 bg-brand-500 text-white rounded-full text-lg font-semibold hover:bg-brand-600 active:press transition-all duration-200"
                >
                  Continue
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-rose-600 text-base mt-4">{error}</p>}
        </div>

        <p className="text-sm text-muted mt-8 text-center">
          Educational shopping support — not medical diagnosis.
        </p>
      </div>
    );
  }

  // --- Input phase ---
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-card max-w-lg w-full p-10">
        <div className="text-center mb-10">
          <p className="text-sm font-bold text-brand-500 uppercase tracking-[0.2em] mb-4">FaceCart</p>
          <h2 className="text-[44px] font-bold text-ink leading-[1.05] tracking-tight">
            Find Your Perfect Routine
          </h2>
          <p className="text-muted mt-4 text-lg leading-relaxed">
            Tell us about your skin and we'll build a validated, conflict-free shopping list.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="skin-text" className="block text-lg font-medium text-ink mb-3">
              Describe what's going on with your skin *
            </label>
            <textarea
              id="skin-text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., I've been getting breakouts on my chin and my skin feels oily by noon. I also have some dark spots from old acne..."
              className="w-full px-5 py-4 bg-beige border border-sand rounded-2xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 resize-none text-lg"
            />
          </div>

          <div>
            <label className="block text-lg font-medium text-ink mb-3">
              Optional: Upload a photo
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className={`px-5 py-3 border border-dashed rounded-full text-base transition-colors ${
                  photoDataUrl
                    ? 'border-brand-400 text-brand-700 bg-brand-50'
                    : 'border-sand text-muted hover:border-brand-400 hover:text-brand-600'
                }`}
              >
                {photoDataUrl ? 'Photo selected' : 'Choose photo'}
              </button>
              {photoDataUrl && (
                <button
                  onClick={() => { setPhotoDataUrl(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="text-sm text-rose-500 hover:underline"
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
            <p className="text-sm text-muted mt-2">
              Your photo is never saved. It's only sent once for analysis and then discarded.
            </p>
          </div>

          {error && <p className="text-rose-600 text-base">{error}</p>}

          <button
            onClick={handleContinue}
            disabled={!text.trim()}
            className="w-full py-5 bg-brand-500 text-white rounded-full text-lg font-semibold hover:bg-brand-600 active:press disabled:bg-sand disabled:text-muted disabled:cursor-not-allowed transition-all duration-200"
          >
            Continue
          </button>
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={() => navigate('/how-it-works')}
            className="text-base text-muted hover:text-brand-600 transition-colors"
          >
            How it works
          </button>
        </div>
      </div>

      <p className="text-sm text-muted mt-8 text-center">
        Educational shopping support — not medical diagnosis.
      </p>
    </div>
  );
}
