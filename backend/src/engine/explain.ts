import { Product, SkinContextProfile, SelectedPath, ScoreBreakdown } from '../utils/constants';
import { getDesiredActives, loadConcernsAndActives } from './scoring';

export function generateWhy(
  product: Product,
  profile: SkinContextProfile,
  selectedPath: SelectedPath,
  breakdown: ScoreBreakdown
): string[] {
  const why: string[] = [];
  const desiredActives = getDesiredActives(profile, selectedPath.strategy_key);
  const data = loadConcernsAndActives();

  // Ingredient match reason
  const matchingIngredients = product.key_ingredients.filter((ki) =>
    desiredActives.some(
      (da) => ki.toLowerCase().includes(da.toLowerCase()) || da.toLowerCase().includes(ki.toLowerCase())
    )
  );
  if (matchingIngredients.length > 0) {
    why.push(
      `Contains ${matchingIngredients.slice(0, 2).join(' and ')}, which may help with your concerns`
    );
  }

  // Concern match
  const matchingConcerns = product.concerns.filter((c) =>
    profile.primary_concerns.some(
      (pc) => c.toLowerCase().includes(pc.toLowerCase()) || pc.toLowerCase().includes(c.toLowerCase())
    )
  );
  if (matchingConcerns.length > 0) {
    why.push(`Formulated to address ${matchingConcerns.slice(0, 2).join(' and ')}`);
  }

  // Sensitivity
  if (product.fragrance_free && profile.barrier_sensitivity !== 'low') {
    why.push('Fragrance-free formula is gentler on sensitive skin');
  }

  // Rating
  if (product.rating >= 4.5) {
    why.push(`Highly rated by users (${product.rating}/5)`);
  } else if (product.rating >= 4.0) {
    why.push(`Well-rated by users (${product.rating}/5)`);
  }

  // Barrier helpers
  const barrierHelpers = data.barrier_helpers;
  const hasBarrierHelpers = product.key_ingredients.some((ki) =>
    barrierHelpers.some((bh) => ki.toLowerCase().includes(bh.toLowerCase()))
  );
  if (hasBarrierHelpers && profile.barrier_sensitivity !== 'low') {
    why.push('Contains barrier-supporting ingredients');
  }

  // Score-based
  if (breakdown.weighted_total >= 80) {
    why.push('Excellent overall compatibility with your profile');
  } else if (breakdown.weighted_total >= 60) {
    why.push('Good compatibility with your skin profile');
  }

  // Why good for specific concerns from product data
  for (const concern of profile.primary_concerns) {
    const explanation = product.why_good_for[concern];
    if (explanation) {
      why.push(explanation);
      break; // Only add one why_good_for
    }
  }

  // Return 2-4 reasons
  return why.slice(0, 4);
}
