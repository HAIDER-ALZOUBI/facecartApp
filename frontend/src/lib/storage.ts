import type { SkinContextProfile, TreatmentPath, PathPreview, Budget, ConflictFinding, SelectedByStep } from './types';

const PREFIX = 'skinsync_v1_';

function get<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function set(key: string, value: unknown): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

function remove(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

export const storage = {
  // Profile
  getProfile: () => get<SkinContextProfile>('profile'),
  setProfile: (p: SkinContextProfile) => set('profile', p),

  // Paths
  getPaths: () => get<TreatmentPath[]>('paths'),
  setPaths: (p: TreatmentPath[]) => set('paths', p),

  // Path previews
  getPathPreviews: () => get<PathPreview[]>('path_previews'),
  setPathPreviews: (p: PathPreview[]) => set('path_previews', p),

  // Selected path
  getSelectedPath: () => get<TreatmentPath>('selected_path'),
  setSelectedPath: (p: TreatmentPath) => set('selected_path', p),

  // Selected by step (AUTHORITATIVE SOURCE)
  getSelectedByStep: () => get<SelectedByStep>('selected_by_step'),
  setSelectedByStep: (s: SelectedByStep) => set('selected_by_step', s),

  // Budget
  getBudget: () => get<Budget>('budget') || { maxTotal: null, preference: 'balanced' as const },
  setBudget: (b: Budget) => set('budget', b),

  // Conflicts
  getConflicts: () => get<ConflictFinding[]>('conflicts') || [],
  setConflicts: (c: ConflictFinding[]) => set('conflicts', c),

  // History
  getHistory: () => get<string[]>('history') || [],
  addHistory: () => {
    const history = get<string[]>('history') || [];
    history.push(new Date().toISOString());
    set('history', history);
  },

  // Allergies
  getAllergies: () => get<string[]>('allergies'),
  setAllergies: (a: string[]) => set('allergies', a),

  // Cart items cache (derived from products endpoint, for offline rendering)
  getCartItems: () => get<any[]>('cart_items'),
  setCartItems: (items: any[]) => set('cart_items', items),

  // High contrast
  getHighContrast: () => get<boolean>('high_contrast') || false,
  setHighContrast: (v: boolean) => set('high_contrast', v),

  // Reset all
  resetAll: () => {
    const keys = [
      'profile', 'paths', 'path_previews', 'selected_path',
      'selected_by_step', 'budget', 'conflicts', 'history',
      'allergies', 'cart_items', 'high_contrast', 'seen_splash',
    ];
    keys.forEach((k) => remove(k));
  },

  // Check if user has completed intake
  hasResults: (): boolean => {
    return get<SelectedByStep>('selected_by_step') !== null;
  },

  hasProfile: (): boolean => {
    return get<SkinContextProfile>('profile') !== null;
  },
};
