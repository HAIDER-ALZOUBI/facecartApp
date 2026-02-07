export interface SkinContextProfile {
  barrier_sensitivity: 'low' | 'moderate' | 'high';
  oil_production: 'low' | 'moderate' | 'high';
  inflammation_risk: 'low' | 'moderate' | 'elevated';
  primary_concerns: string[];
  likely_triggers: string[];
  confidence: number;
}

export interface TreatmentPath {
  name: string;
  strategy_key: string;
  risk_level: 'low' | 'medium' | 'high';
  explanation: string;
  who_its_for: string;
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

export interface ConflictFinding {
  pair: [string, string];
  risk: string;
  alert: string;
  fix: string;
  involvedProducts: Array<{ step: string; productId: string }>;
}

export interface PathPreview {
  strategy_key: string;
  plan: Record<string, RoutineItem>;
  total: number;
  conflicts: ConflictFinding[];
}

export type StepType = 'cleanser' | 'treatment' | 'moisturizer' | 'spf';

export interface Budget {
  maxTotal: number | null;
  preference: 'low' | 'balanced' | 'premium';
}

export interface SelectedByStep {
  cleanser?: string;
  treatment?: string;
  moisturizer?: string;
  spf?: string;
}
