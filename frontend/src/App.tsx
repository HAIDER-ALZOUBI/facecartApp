import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { storage } from './lib/storage';
import Intake from './routes/Intake';
import Results from './routes/Results';
import Routine from './routes/Routine';
import Cart from './routes/Cart';
import AddConcern from './routes/AddConcern';
import ExistingProduct from './routes/ExistingProduct';
import HowItWorks from './routes/HowItWorks';
import DebugPanel from './components/DebugPanel';

export default function App() {
  const [highContrast, setHighContrast] = useState(storage.getHighContrast());

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  const toggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    storage.setHighContrast(next);
  };

  return (
    <div className="relative min-h-screen">
      {/* High contrast toggle */}
      <button
        onClick={toggleContrast}
        className="fixed top-2 right-2 z-50 text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
        aria-label="Toggle high contrast mode"
        title="Toggle high contrast"
      >
        {highContrast ? '◑ Normal' : '◐ High Contrast'}
      </button>

      <Routes>
        <Route path="/" element={<Intake />} />
        <Route path="/results" element={<Results />} />
        <Route path="/routine" element={<Routine />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/add-concern" element={<AddConcern />} />
        <Route path="/existing-product" element={<ExistingProduct />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <DebugPanel />
    </div>
  );
}
