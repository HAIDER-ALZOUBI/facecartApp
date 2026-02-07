import {
  Product,
  SkinContextProfile,
  SelectedPath,
  Budget,
  RoutineItem,
  StepType,
} from '../utils/constants';
import { computeScore } from './scoring';
import { generateWhy } from './explain';
import { computeRefill } from './refill';
import { detectConflictsInRoutine } from './conflicts';
import { ensureBuyLinks } from './links';
import * as fs from 'fs';
import * as path from 'path';

let products: Product[] | null = null;

export function loadProducts(): Product[] {
  if (!products) {
    const filePath = path.join(__dirname, '../../data/products.json');
    products = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return products!;
}

export function filterByAllergies(allProducts: Product[], allergies: string[] | null): Product[] {
  if (!allergies || allergies.length === 0) return allProducts;

  return allProducts.filter((product) => {
    for (const allergy of allergies) {
      const token = allergy.trim().toLowerCase();
      if (!token) continue;
      // Check key_ingredients
      if (product.key_ingredients.some((ki) => ki.toLowerCase().includes(token))) {
        return false;
      }
      // Check full_ingredients
      if (product.full_ingredients.toLowerCase().includes(token)) {
        return false;
      }
    }
    return true;
  });
}

export function getProductsByCategory(category: StepType, allergies?: string[] | null): Product[] {
  let allProducts = loadProducts().filter((p) => p.category === category);
  if (allergies) {
    allProducts = filterByAllergies(allProducts, allergies);
  }
  return allProducts;
}

export function scoreAndRankProducts(
  productsForStep: Product[],
  profile: SkinContextProfile,
  selectedPath: SelectedPath,
  otherProducts: Product[],
  budget: Budget
): Array<RoutineItem & { rank: number }> {
  const scored = productsForStep.map((product) => {
    const breakdown = computeScore(product, profile, selectedPath, otherProducts);
    const why = generateWhy(product, profile, selectedPath, breakdown);
    const refill = computeRefill(product);

    // Ensure buy links
    product.buy_links = ensureBuyLinks(product.buy_links, product.name, product.brand);

    return {
      product,
      score: breakdown.weighted_total,
      score_breakdown: breakdown,
      why,
      refill,
    };
  });

  // Apply budget preference bias
  scored.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (budget.preference === 'low') {
      // Bias towards cheaper, but score still primary
      return scoreDiff !== 0 ? scoreDiff : a.product.price - b.product.price;
    } else if (budget.preference === 'premium') {
      // Bias towards higher rated/priced
      return scoreDiff !== 0 ? scoreDiff : b.product.price - a.product.price;
    }
    return scoreDiff;
  });

  return scored.map((s, idx) => ({
    ...s,
    step: productsForStep[0]?.category || ('cleanser' as StepType),
    rank: idx + 1,
  }));
}

export function selectBestForStep(
  step: StepType,
  profile: SkinContextProfile,
  selectedPath: SelectedPath,
  otherProducts: Product[],
  budget: Budget,
  excludeIds: string[] = [],
  allergies?: string[] | null
): RoutineItem | null {
  let candidates = getProductsByCategory(step, allergies).filter(
    (p) => !excludeIds.includes(p.id)
  );

  if (candidates.length === 0) return null;

  const ranked = scoreAndRankProducts(candidates, profile, selectedPath, otherProducts, budget);

  return ranked.length > 0
    ? { ...ranked[0], step }
    : null;
}

export function generateRoutine(
  profile: SkinContextProfile,
  selectedPath: SelectedPath,
  budget: Budget,
  allergies?: string[] | null
): {
  routine: { am: RoutineItem[]; pm: RoutineItem[] };
  cart: RoutineItem[];
  conflicts: any[];
  total: number;
} {
  const steps: StepType[] = ['cleanser', 'treatment', 'moisturizer', 'spf'];
  const selectedItems: RoutineItem[] = [];
  const selectedProducts: Product[] = [];

  for (const step of steps) {
    const item = selectBestForStep(
      step,
      profile,
      selectedPath,
      selectedProducts,
      budget,
      [],
      allergies
    );
    if (item) {
      selectedItems.push(item);
      selectedProducts.push(item.product);
    }
  }

  // Check budget constraint
  let total = selectedItems.reduce((sum, item) => sum + item.product.price, 0);
  if (budget.maxTotal !== null && total > budget.maxTotal) {
    // Try to optimize by swapping expensive items with cheaper alternatives
    for (let i = selectedItems.length - 1; i >= 0; i--) {
      if (total <= budget.maxTotal!) break;
      const step = selectedItems[i].step;
      const exclude = [selectedItems[i].product.id];
      const others = selectedProducts.filter((p) => p.id !== selectedItems[i].product.id);

      const cheaper = selectBestForStep(
        step,
        profile,
        selectedPath,
        others,
        { ...budget, preference: 'low' },
        exclude,
        allergies
      );
      if (cheaper && cheaper.product.price < selectedItems[i].product.price) {
        total -= selectedItems[i].product.price;
        total += cheaper.product.price;
        selectedProducts[i] = cheaper.product;
        selectedItems[i] = cheaper;
      }
    }
  }

  // Detect conflicts
  const conflicts = detectConflictsInRoutine(selectedItems);

  // Build AM/PM routine from selected items
  const cleanser = selectedItems.find((i) => i.step === 'cleanser');
  const treatment = selectedItems.find((i) => i.step === 'treatment');
  const moisturizer = selectedItems.find((i) => i.step === 'moisturizer');
  const spf = selectedItems.find((i) => i.step === 'spf');

  const am: RoutineItem[] = [];
  const pm: RoutineItem[] = [];

  if (cleanser) { am.push(cleanser); pm.push(cleanser); }
  if (treatment) { am.push(treatment); pm.push(treatment); }
  if (moisturizer) { am.push(moisturizer); pm.push(moisturizer); }
  if (spf) { am.push(spf); } // No SPF in PM

  total = selectedItems.reduce((sum, item) => sum + item.product.price, 0);

  return {
    routine: { am, pm },
    cart: selectedItems,
    conflicts,
    total: Math.round(total * 100) / 100,
  };
}

export function generatePreview(
  profile: SkinContextProfile,
  pathInfo: { strategy_key: string; risk_level: string },
  allergies?: string[] | null,
  excludeProductIds: string[] = []
) {
  const selectedPath: SelectedPath = {
    strategy_key: pathInfo.strategy_key,
    risk_level: pathInfo.risk_level as any,
  };
  const budget: Budget = { maxTotal: null, preference: 'balanced' };

  const steps: StepType[] = ['cleanser', 'treatment', 'moisturizer', 'spf'];
  const plan: Record<string, RoutineItem> = {};
  const selectedProducts: Product[] = [];

  for (const step of steps) {
    const item = selectBestForStep(step, profile, selectedPath, selectedProducts, budget, excludeProductIds, allergies);
    if (item) {
      plan[step] = item;
      selectedProducts.push(item.product);
    }
  }

  const items = Object.values(plan);
  const conflicts = detectConflictsInRoutine(items);
  const total = items.reduce((sum, item) => sum + item.product.price, 0);

  return {
    strategy_key: pathInfo.strategy_key,
    plan,
    total: Math.round(total * 100) / 100,
    conflicts,
  };
}

export function getOptionsForStep(
  profile: SkinContextProfile,
  selectedPath: SelectedPath,
  step: StepType,
  currentRoutine: RoutineItem[],
  budget: Budget,
  allergies?: string[] | null
): Array<RoutineItem & { rank: number }> {
  const otherProducts = currentRoutine
    .filter((i) => i.step !== step)
    .map((i) => i.product);

  const candidates = getProductsByCategory(step, allergies);
  return scoreAndRankProducts(candidates, profile, selectedPath, otherProducts, budget);
}

export function validateCart(
  profile: SkinContextProfile,
  selectedPath: SelectedPath,
  selectedByStep: Record<string, string | null>,
  budget: Budget,
  allergies?: string[] | null
): {
  cart: RoutineItem[];
  routine: { am: RoutineItem[]; pm: RoutineItem[] };
  conflicts: any[];
  total: number;
} {
  const allProducts = loadProducts();
  const steps: StepType[] = ['cleanser', 'treatment', 'moisturizer', 'spf'];
  const selectedItems: RoutineItem[] = [];

  // First pass: look up each selected product and build basic RoutineItem
  for (const step of steps) {
    const productId = selectedByStep[step];
    if (!productId) continue;

    const product = allProducts.find((p) => p.id === productId);
    if (!product) continue;

    // Collect for scoring later
    selectedItems.push({
      step,
      product,
      score: 0,
      score_breakdown: { ingredient_relevance: 0, sensitivity_match: 0, conflict_risk: 0, rating: 0, weighted_total: 0 },
      why: [],
      refill: computeRefill(product),
    });
  }

  // Second pass: score each product against others in the cart
  for (let i = 0; i < selectedItems.length; i++) {
    const item = selectedItems[i];
    const otherProducts = selectedItems
      .filter((_, idx) => idx !== i)
      .map((si) => si.product);

    const breakdown = computeScore(item.product, profile, selectedPath, otherProducts);
    const why = generateWhy(item.product, profile, selectedPath, breakdown);
    item.product.buy_links = ensureBuyLinks(item.product.buy_links, item.product.name, item.product.brand);

    item.score = breakdown.weighted_total;
    item.score_breakdown = breakdown;
    item.why = why;
  }

  // Detect conflicts
  const conflicts = detectConflictsInRoutine(selectedItems);

  // Check allergy violations and add as conflict-like findings
  if (allergies && allergies.length > 0) {
    for (const item of selectedItems) {
      for (const allergy of allergies) {
        const token = allergy.trim().toLowerCase();
        if (!token) continue;
        const inKey = item.product.key_ingredients.some((ki) => ki.toLowerCase().includes(token));
        const inFull = item.product.full_ingredients.toLowerCase().includes(token);
        if (inKey || inFull) {
          conflicts.push({
            pair: [token, item.product.name],
            risk: 'high',
            alert: `${item.product.name} contains "${allergy}" which is in your allergy list.`,
            fix: `Remove this product or remove "${allergy}" from your allergies.`,
            involvedProducts: [{ step: item.step, productId: item.product.id }],
          });
        }
      }
    }
  }

  // Build AM/PM routine
  const cleanser = selectedItems.find((i) => i.step === 'cleanser');
  const treatment = selectedItems.find((i) => i.step === 'treatment');
  const moisturizer = selectedItems.find((i) => i.step === 'moisturizer');
  const spf = selectedItems.find((i) => i.step === 'spf');

  const am: RoutineItem[] = [];
  const pm: RoutineItem[] = [];

  if (cleanser) { am.push(cleanser); pm.push(cleanser); }
  if (treatment) { am.push(treatment); pm.push(treatment); }
  if (moisturizer) { am.push(moisturizer); pm.push(moisturizer); }
  if (spf) { am.push(spf); }

  const total = selectedItems.reduce((sum, item) => sum + item.product.price, 0);

  return {
    cart: selectedItems,
    routine: { am, pm },
    conflicts,
    total: Math.round(total * 100) / 100,
  };
}

export function swapProduct(
  profile: SkinContextProfile,
  selectedPath: SelectedPath,
  step: StepType,
  currentRoutine: RoutineItem[],
  excludeProductId: string,
  budget: Budget,
  allergies?: string[] | null
): {
  replacement: RoutineItem & { rank: number };
  updatedRoutine: RoutineItem[];
  conflicts: any[];
  total: number;
} | null {
  const otherProducts = currentRoutine
    .filter((i) => i.step !== step)
    .map((i) => i.product);

  const replacement = selectBestForStep(
    step,
    profile,
    selectedPath,
    otherProducts,
    budget,
    [excludeProductId],
    allergies
  );

  if (!replacement) return null;

  const updatedRoutine = currentRoutine.map((item) =>
    item.step === step ? replacement : item
  );

  const conflicts = detectConflictsInRoutine(updatedRoutine);
  const total = updatedRoutine.reduce((sum, item) => sum + item.product.price, 0);

  return {
    replacement: { ...replacement, rank: 1 },
    updatedRoutine,
    conflicts,
    total: Math.round(total * 100) / 100,
  };
}
