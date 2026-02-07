import { useNavigate, useLocation } from 'react-router-dom';

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bg-cream/80 backdrop-blur-sm border-b border-sand/30 px-6 py-4 flex items-center justify-between">
      <button
        onClick={() => navigate('/add-concern')}
        className={`w-11 h-11 flex items-center justify-center rounded-full text-xl transition-colors active:press ${
          location.pathname === '/add-concern'
            ? 'bg-brand-50 text-brand-600'
            : 'text-muted hover:bg-beige hover:text-ink'
        }`}
        aria-label="Add concern"
        title="Add concern"
      >
        +
      </button>

      <span className="text-xl font-semibold text-ink tracking-tight select-none">
        FaceCart
      </span>

      <button
        onClick={() => navigate('/cart')}
        className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors active:press ${
          location.pathname === '/cart'
            ? 'bg-brand-50 text-brand-600'
            : 'text-muted hover:bg-beige hover:text-ink'
        }`}
        aria-label="Cart"
        title="Cart"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      </button>
    </nav>
  );
}
