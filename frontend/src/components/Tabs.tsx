import { useNavigate, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/routine', label: 'Routine' },
  { path: '/cart', label: 'Cart' },
  { path: '/add-concern', label: '+ Add Concern' },
];

export default function Tabs() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="flex border-b border-sand/30 bg-cream" aria-label="Main navigation">
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex-1 py-4 px-4 text-base font-medium text-center transition-colors ${
              active
                ? 'text-brand-600 border-b-2 border-brand-500 bg-brand-50/50'
                : 'text-muted hover:text-ink hover:bg-beige/50'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
