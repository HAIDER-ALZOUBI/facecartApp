import { useNavigate } from 'react-router-dom';

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          ← Back
        </button>
        <h1 className="text-lg font-bold text-brand-700">How It Works</h1>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            AI Profile + Rules Engine + External Buy
          </h2>
          <p className="text-gray-500 mt-2">
            Your validated, conflict-free skincare shopping list in 3 steps.
          </p>
        </div>

        {/* Step 1 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-xl font-bold text-brand-700 shrink-0">
              1
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">AI Extracts Your Shopping Profile</h3>
              <p className="text-gray-600 text-sm">
                You describe your skin concerns (and optionally upload a photo). Our AI analyzes
                your input and generates a <strong>Skin Context Profile</strong> — including barrier
                sensitivity, oil production, inflammation risk, and primary concerns.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                The AI also suggests 3 treatment strategy paths. It never picks products — it only
                identifies your shopping profile and strategy direction.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-xl font-bold text-brand-700 shrink-0">
              2
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Rules Engine Scores & Validates</h3>
              <p className="text-gray-600 text-sm">
                A <strong>deterministic rules engine</strong> (no AI involved) scores every product
                in our catalog against your profile using:
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4 list-disc">
                <li>Ingredient relevance to your concerns (50%)</li>
                <li>Sensitivity match for your barrier type (20%)</li>
                <li>Conflict risk against your routine (15%)</li>
                <li>Aggregated user ratings (15%)</li>
              </ul>
              <p className="text-gray-500 text-sm mt-2">
                The engine uses product INCI/ingredients, a local conflict-rules database, and
                aggregated user ratings. It checks for ingredient conflicts (e.g., retinol + AHA)
                and resolves them with scheduling suggestions or swaps.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-xl font-bold text-brand-700 shrink-0">
              3
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Cart Validates & Links Out to Buy</h3>
              <p className="text-gray-600 text-sm">
                Your validated shopping list shows compatibility scores, conflict status, and
                external buy links. We <strong>never sell products</strong> — every item links
                out to search engines or retailer sites where you can purchase.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                You can swap products, check existing products you own for conflicts, and add new
                concerns anytime. The system admits uncertainty with a confidence meter and uses
                conservative recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div className="bg-brand-50 rounded-xl p-6">
          <h3 className="font-bold text-base mb-2 text-brand-800">About Confidence</h3>
          <p className="text-sm text-brand-700">
            The confidence meter (0–100%) reflects how certain the system is about your profile.
            Text-only analysis without photos typically shows lower confidence. The system errs
            on the side of caution — when uncertain, it recommends gentler products and flags
            more potential triggers.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-4 bg-brand-600 text-white rounded-xl text-lg font-medium hover:bg-brand-700 transition-colors"
        >
          Get Started
        </button>

        <p className="text-xs text-gray-400 text-center pb-4">
          Educational shopping support — not medical diagnosis.
        </p>
      </div>
    </div>
  );
}
