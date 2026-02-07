import { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // When video ends, begin fade-out
    const handleEnded = () => {
      setFading(true);
      setTimeout(onDone, 500);
    };

    // Fallback: if video stalls or doesn't play, auto-dismiss after 3s
    const fallback = setTimeout(() => {
      setFading(true);
      setTimeout(onDone, 500);
    }, 3000);

    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('ended', handleEnded);
      clearTimeout(fallback);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[200] bg-cream flex items-center justify-center transition-opacity duration-500 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <video
        ref={videoRef}
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
}
