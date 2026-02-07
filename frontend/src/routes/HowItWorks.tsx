import { useNavigate } from 'react-router-dom';

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream flex flex-col animate-fade-in">
      <header className="bg-cream/80 backdrop-blur-sm border-b border-sand/30 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-muted hover:text-ink transition-colors active:press text-lg">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-ink">How It Works</h1>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full p-8 space-y-10">
        <div className="text-center mb-10">
          <h2 className="text-[44px] font-bold text-ink leading-tight tracking-tight">
            AI Profile + Rules Engine + External Buy
          </h2>
          <p className="text-lg text-muted mt-4">
            Your validated, conflict-free skincare shopping list in 3 steps.
          </p>
        </div>

        {/* Step 1 */}
        <div className="bg-white rounded-3xl p-8 shadow-card">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-2xl font-bold text-brand-600 shrink-0">
              1
            </div>
            <div>
              <h3 className="font-bold text-2xl mb-3 text-ink">AI Extracts Your Shopping Profile</h3>
              <p className="text-muted text-lg leading-relaxed">
                You describe your skin concerns (and optionally upload a photo). Our AI analyzes
                your input and generates a <strong className="text-ink">Skin Context Profile</strong> — including barrier
                sensitivity, oil production, inflammation risk, and primary concerns.
              </p>
              <p className="text-muted text-lg mt-3 leading-relaxed">
                The AI also suggests 3 treatment strategy paths. It never picks products — it only
                identifies your shopping profile and strategy direction.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-3xl p-8 shadow-card">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-2xl font-bold text-brand-600 shrink-0">
              2
            </div>
            <div>
              <h3 className="font-bold text-2xl mb-3 text-ink">Rules Engine Scores & Validates</h3>
              <p className="text-muted text-lg leading-relaxed">
                A <strong className="text-ink">deterministic rules engine</strong> (no AI involved) scores every product
                in our catalog against your profile using:
              </p>
              <ul className="text-lg text-muted mt-3 space-y-2 ml-5 list-disc">
                <li>Ingredient relevance to your concerns (50%)</li>
                <li>Sensitivity match for your barrier type (20%)</li>
                <li>Conflict risk against your routine (15%)</li>
                <li>Aggregated user ratings (15%)</li>
              </ul>
              <p className="text-muted text-lg mt-3 leading-relaxed">
                The engine uses product INCI/ingredients, a local conflict-rules database, and
                aggregated user ratings. It checks for ingredient conflicts (e.g., retinol + AHA)
                and resolves them with scheduling suggestions or swaps.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-3xl p-8 shadow-card">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-2xl font-bold text-brand-600 shrink-0">
              3
            </div>
            <div>
              <h3 className="font-bold text-2xl mb-3 text-ink">Cart Validates & Links Out to Buy</h3>
              <p className="text-muted text-lg leading-relaxed">
                Your validated shopping list shows compatibility scores, conflict status, and
                external buy links. We <strong className="text-ink">never sell products</strong> — every item links
                out to search engines or retailer sites where you can purchase.
              </p>
              <p className="text-muted text-lg mt-3 leading-relaxed">
                You can swap products, check existing products you own for conflicts, and add new
                concerns anytime. The system admits uncertainty with a confidence meter and uses
                conservative recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div className="bg-beige rounded-3xl p-8">
          <h3 className="font-bold text-2xl mb-3 text-ink">About Confidence</h3>
          <p className="text-lg text-muted leading-relaxed">
            The confidence meter (0-100%) reflects how certain the system is about your profile.
            Text-only analysis without photos typically shows lower confidence. The system errs
            on the side of caution — when uncertain, it recommends gentler products and flags
            more potential triggers.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-5 bg-brand-500 text-white rounded-full text-xl font-semibold hover:bg-brand-600 active:press transition-all duration-200"
        >
          Get Started
        </button>

        <p className="text-sm text-muted text-center pb-6">
          Educational shopping support — not medical diagnosis.
        </p>
      </div>
    </div>
  );
}
