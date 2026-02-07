import {
  Product,
  SkinContextProfile,
  SelectedPath,
  ScoreBreakdown,
  ConcernsAndActives,
} from '../utils/constants';
import { countConflictsForProduct } from './conflicts';
import * as fs from 'fs';
import * as path from 'path';

let concernsData: ConcernsAndActives | null = null;

export function loadConcernsAndActives(): ConcernsAndActives {
  if (!concernsData) {
    const filePath = path.join(__dirname, '../../data/concerns-and-actives.json');
    concernsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return concernsData!;
}

export function getDesiredActives(
  profile: SkinContextProfile,
  strategyKey: string
): string[] {
  const data = loadConcernsAndActives();
  const actives = new Set<string>();

  for (const concern of profile.primary_concerns) {
    const mapped = data.concerns_to_actives[concern];
    if (mapped) mapped.forEach((a) => actives.add(a));
  }

  const strategyActives = data.strategy_to_actives[strategyKey];
  if (strategyActives) strategyActives.forEach((a) => actives.add(a));

  return Array.from(actives);
}

export function scoreIngredientRelevance(
  product: Product,
  desiredActives: string[],
  primaryConcerns: string[]
): number {
  if (desiredActives.length === 0) return 50;

  let score = 0;
  let maxPoints = 0;

  // Key ingredients match desired actives (60% weight)
  const ingredientPoints = 60;
  maxPoints += ingredientPoints;
  const matchingIngredients = product.key_ingredients.filter((ki) =>
    desiredActives.some(
      (da) => ki.toLowerCase().includes(da.toLowerCase()) || da.toLowerCase().includes(ki.toLowerCase())
    )
  );
  score += Math.min(1, matchingIngredients.length / Math.max(1, Math.min(3, desiredActives.length))) * ingredientPoints;

  // Concern overlap (40% weight)
  const concernPoints = 40;
  maxPoints += concernPoints;
  const matchingConcerns = product.concerns.filter((c) =>
    primaryConcerns.some(
      (pc) => c.toLowerCase().includes(pc.toLowerCase()) || pc.toLowerCase().includes(c.toLowerCase())
    )
  );
  score += Math.min(1, matchingConcerns.length / Math.max(1, primaryConcerns.length)) * concernPoints;

  return Math.round((score / maxPoints) * 100);
}

export function scoreSensitivityMatch(
  product: Product,
  profile: SkinContextProfile,
  riskLevel: string
): number {
  const data = loadConcernsAndActives();
  let score = 70; // Start at 70, adjust up/down

  const harshActives = data.harsh_actives;
  const barrierHelpers = data.barrier_helpers;

  const productHarsh = product.key_ingredients.filter((ki) =>
    harshActives.some((ha) => ki.toLowerCase().includes(ha.toLowerCase()))
  );
  const productBarrier = product.key_ingredients.filter((ki) =>
    barrierHelpers.some((bh) => ki.toLowerCase().includes(bh.toLowerCase()))
  );

  if (profile.barrier_sensitivity === 'high') {
    // Penalize harsh actives unless high risk is accepted
    if (riskLevel !== 'high') {
      score -= productHarsh.length * 20;
    } else {
      score -= productHarsh.length * 5;
    }
    // Reward barrier helpers
    score += productBarrier.length * 10;
  } else if (profile.barrier_sensitivity === 'moderate') {
    score -= productHarsh.length * 10;
    score += productBarrier.length * 5;
  }

  // Reward fragrance-free for sensitive/high barrier sensitivity
  if (product.fragrance_free) {
    if (profile.barrier_sensitivity === 'high') score += 15;
    else if (profile.barrier_sensitivity === 'moderate') score += 5;
  } else {
    if (profile.barrier_sensitivity === 'high') score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreConflictRisk(
  product: Product,
  otherProducts: Product[]
): number {
  const conflicts = countConflictsForProduct(product, otherProducts);
  if (conflicts === 0) return 100;
  if (conflicts === 1) return 50;
  if (conflicts === 2) return 20;
  return 0;
}

export function scoreRating(product: Product): number {
  return Math.round((product.rating / 5) * 100);
}

export function computeScore(
  product: Product,
  profile: SkinContextProfile,
  selectedPath: SelectedPath,
  otherProducts: Product[]
): ScoreBreakdown {
  const desiredActives = getDesiredActives(profile, selectedPath.strategy_key);

  const ingredient_relevance = scoreIngredientRelevance(
    product,
    desiredActives,
    profile.primary_concerns
  );
  const sensitivity_match = scoreSensitivityMatch(
    product,
    profile,
    selectedPath.risk_level
  );
  const conflict_risk = scoreConflictRisk(product, otherProducts);
  const rating = scoreRating(product);

  const weighted_total = Math.round(
    0.5 * ingredient_relevance +
    0.2 * sensitivity_match +
    0.15 * conflict_risk +
    0.15 * rating
  );

  return {
    ingredient_relevance,
    sensitivity_match,
    conflict_risk,
    rating,
    weighted_total,
  };
}
