export const STRATEGY_KEYS = [
  'salicylic_acid',
  'niacinamide_centella',
  'benzoyl_peroxide',
  'retinoid',
  'barrier_repair',
  'brightening_vitamin_c',
  'hydration_focus',
] as const;

export type StrategyKey = (typeof STRATEGY_KEYS)[number];

export const RISK_LEVELS = ['low', 'medium', 'high'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const STEP_TYPES = ['cleanser', 'treatment', 'moisturizer', 'spf'] as const;
export type StepType = (typeof STEP_TYPES)[number];

export const BARRIER_SENSITIVITY = ['low', 'moderate', 'high'] as const;
export const OIL_PRODUCTION = ['low', 'moderate', 'high'] as const;
export const INFLAMMATION_RISK = ['low', 'moderate', 'elevated'] as const;

export const BUDGET_PREFERENCES = ['low', 'balanced', 'premium'] as const;
export type BudgetPreference = (typeof BUDGET_PREFERENCES)[number];

export interface SkinContextProfile {
  barrier_sensitivity: 'low' | 'moderate' | 'high';
  oil_production: 'low' | 'moderate' | 'high';
  inflammation_risk: 'low' | 'moderate' | 'elevated';
  primary_concerns: string[];
  likely_triggers: string[];
  confidence: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  size_ml: number;
  category: StepType;
  skin_types: string[];
  concerns: string[];
  key_ingredients: string[];
  full_ingredients: string;
  avg_daily_usage_ml: number;
  fragrance_free: boolean;
  rating: number;
  image_url: string;
  why_good_for: Record<string, string>;
  buy_links: Array<{ label: string; url: string }>;
}

export interface ScoreBreakdown {
  ingredient_relevance: number;
  sensitivity_match: number;
  conflict_risk: number;
  rating: number;
  weighted_total: number;
}

export interface RoutineItem {
  step: StepType;
  product: Product;
  score: number;
  score_breakdown: ScoreBreakdown;
  why: string[];
  refill: { days: number; date_iso: string };
}

export interface ConflictRule {
  a: string;
  b: string;
  risk: string;
  alert: string;
  fix: string;
}

export interface ConflictFinding {
  pair: [string, string];
  risk: string;
  alert: string;
  fix: string;
  involvedProducts: Array<{ step: string; productId: string }>;
}

export interface SelectedPath {
  strategy_key: string;
  risk_level: RiskLevel;
}

export interface Budget {
  maxTotal: number | null;
  preference: BudgetPreference;
}

export interface ConcernsAndActives {
  concerns_to_actives: Record<string, string[]>;
  strategy_to_actives: Record<string, string[]>;
  harsh_actives: string[];
  barrier_helpers: string[];
}
