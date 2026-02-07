import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Intake from './routes/Intake';
import Results from './routes/Results';
import Routine from './routes/Routine';
import Cart from './routes/Cart';
import AddConcern from './routes/AddConcern';
import ExistingProduct from './routes/ExistingProduct';
import HowItWorks from './routes/HowItWorks';
import DebugPanel from './components/DebugPanel';
import SplashScreen from './components/SplashScreen';

const SPLASH_KEY = 'skinsync_v1_seen_splash';

export default function App() {
  const [showSplash, setShowSplash] = useState(
    () => !localStorage.getItem(SPLASH_KEY)
  );

  const handleSplashDone = () => {
    localStorage.setItem(SPLASH_KEY, 'true');
    setShowSplash(false);
  };

  return (
    <div className="relative min-h-screen">
      {showSplash && <SplashScreen onDone={handleSplashDone} />}

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
