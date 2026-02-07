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
    <nav className="flex border-b border-gray-200 bg-white" aria-label="Main navigation">
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center transition-colors ${
              active
                ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
