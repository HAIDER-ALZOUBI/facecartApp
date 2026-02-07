import { STEP_TYPES, STRATEGY_KEYS, RISK_LEVELS, BUDGET_PREFERENCES } from './constants';

export function validateText(text: unknown): string | null {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return 'text is required and must be a non-empty string';
  }
  return null;
}

export function validateProfile(profile: unknown): string | null {
  if (!profile || typeof profile !== 'object') return 'profile is required';
  const p = profile as Record<string, unknown>;
  if (!['low', 'moderate', 'high'].includes(p.barrier_sensitivity as string))
    return 'invalid barrier_sensitivity';
  if (!['low', 'moderate', 'high'].includes(p.oil_production as string))
    return 'invalid oil_production';
  if (!['low', 'moderate', 'elevated'].includes(p.inflammation_risk as string))
    return 'invalid inflammation_risk';
  if (!Array.isArray(p.primary_concerns)) return 'primary_concerns must be an array';
  if (!Array.isArray(p.likely_triggers)) return 'likely_triggers must be an array';
  if (typeof p.confidence !== 'number') return 'confidence must be a number';
  return null;
}

export function validateSelectedPath(path: unknown): string | null {
  if (!path || typeof path !== 'object') return 'selectedPath is required';
  const p = path as Record<string, unknown>;
  if (!STRATEGY_KEYS.includes(p.strategy_key as any)) return 'invalid strategy_key';
  if (!RISK_LEVELS.includes(p.risk_level as any)) return 'invalid risk_level';
  return null;
}

export function validateBudget(budget: unknown): string | null {
  if (!budget || typeof budget !== 'object') return 'budget is required';
  const b = budget as Record<string, unknown>;
  if (b.maxTotal !== null && typeof b.maxTotal !== 'number') return 'maxTotal must be number or null';
  if (!BUDGET_PREFERENCES.includes(b.preference as any)) return 'invalid budget preference';
  return null;
}

export function validateStep(step: unknown): string | null {
  if (!STEP_TYPES.includes(step as any)) return 'invalid step type';
  return null;
}
