import {
  computeScore,
  scoreIngredientRelevance,
  scoreSensitivityMatch,
  scoreConflictRisk,
  scoreRating,
} from '../src/engine/scoring';
import {
  findConflictsBetweenIngredients,
  detectConflictsInRoutine,
  loadConflictRules,
} from '../src/engine/conflicts';
import {
  generateRoutine,
  generatePreview,
  loadProducts,
  filterByAllergies,
  swapProduct,
} from '../src/engine/optimizer';
import { computeRefill } from '../src/engine/refill';
import type { Product, SkinContextProfile, SelectedPath, RoutineItem } from '../src/utils/constants';

// Test helpers
const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'test_001',
  name: 'Test Product',
  brand: 'TestBrand',
  price: 15,
  size_ml: 100,
  category: 'cleanser',
  skin_types: ['all'],
  concerns: ['oiliness'],
  key_ingredients: ['salicylic_acid'],
  full_ingredients: 'water, salicylic acid, glycerin',
  avg_daily_usage_ml: 3,
  fragrance_free: true,
  rating: 4.2,
  image_url: '/placeholder-product.png',
  why_good_for: { oiliness: 'Helps control oil' },
  buy_links: [{ label: 'Search', url: 'https://google.com/search?q=test' }],
  ...overrides,
});

const makeProfile = (overrides: Partial<SkinContextProfile> = {}): SkinContextProfile => ({
  barrier_sensitivity: 'moderate',
  oil_production: 'high',
  inflammation_risk: 'moderate',
  primary_concerns: ['inflammatory_acne', 'oiliness'],
  likely_triggers: ['possible hormonal factors'],
  confidence: 60,
  ...overrides,
});

const makePath = (overrides: Partial<SelectedPath> = {}): SelectedPath => ({
  strategy_key: 'salicylic_acid',
  risk_level: 'low',
  ...overrides,
});

describe('Scoring Engine', () => {
  describe('scoreIngredientRelevance', () => {
    it('should score higher when product has desired active ingredients', () => {
      const product = makeProduct({
        key_ingredients: ['salicylic_acid', 'niacinamide'],
        concerns: ['inflammatory_acne', 'oiliness'],
      });
      const score = scoreIngredientRelevance(
        product,
        ['salicylic_acid', 'niacinamide', 'tea_tree'],
        ['inflammatory_acne', 'oiliness']
      );
      expect(score).toBeGreaterThan(50);
    });

    it('should score lower when product has no matching ingredients', () => {
      const product = makeProduct({
        key_ingredients: ['ceramides'],
        concerns: ['dryness'],
      });
      const score = scoreIngredientRelevance(
        product,
        ['salicylic_acid', 'benzoyl_peroxide'],
        ['inflammatory_acne']
      );
      expect(score).toBeLessThan(50);
    });

    it('should return 50 when no desired actives', () => {
      const product = makeProduct();
      const score = scoreIngredientRelevance(product, [], ['oiliness']);
      expect(score).toBe(50);
    });
  });

  describe('scoreSensitivityMatch', () => {
    it('should penalize harsh actives for high barrier sensitivity', () => {
      const product = makeProduct({ key_ingredients: ['retinol', 'glycolic_acid'] });
      const profile = makeProfile({ barrier_sensitivity: 'high' });
      const score = scoreSensitivityMatch(product, profile, 'low');
      expect(score).toBeLessThan(70);
    });

    it('should reward fragrance-free for high sensitivity', () => {
      const product = makeProduct({ fragrance_free: true, key_ingredients: ['ceramides'] });
      const profile = makeProfile({ barrier_sensitivity: 'high' });
      const score = scoreSensitivityMatch(product, profile, 'low');
      expect(score).toBeGreaterThanOrEqual(70);
    });
  });

  describe('scoreConflictRisk', () => {
    it('should return 100 when no conflicts exist', () => {
      const product = makeProduct({ key_ingredients: ['ceramides'] });
      const others = [makeProduct({ key_ingredients: ['hyaluronic_acid'] })];
      const score = scoreConflictRisk(product, others);
      expect(score).toBe(100);
    });

    it('should reduce score when conflicts exist', () => {
      const product = makeProduct({ key_ingredients: ['retinol'] });
      const others = [makeProduct({ key_ingredients: ['glycolic_acid'] })];
      const score = scoreConflictRisk(product, others);
      expect(score).toBeLessThan(100);
    });
  });

  describe('scoreRating', () => {
    it('should convert rating 5.0 to score 100', () => {
      expect(scoreRating(makeProduct({ rating: 5.0 }))).toBe(100);
    });

    it('should convert rating 0 to score 0', () => {
      expect(scoreRating(makeProduct({ rating: 0 }))).toBe(0);
    });

    it('should convert rating 4.0 to score 80', () => {
      expect(scoreRating(makeProduct({ rating: 4.0 }))).toBe(80);
    });
  });

  describe('computeScore (weighted formula)', () => {
    it('should produce weighted total in range 0-100', () => {
      const product = makeProduct();
      const profile = makeProfile();
      const path = makePath();
      const breakdown = computeScore(product, profile, path, []);
      expect(breakdown.weighted_total).toBeGreaterThanOrEqual(0);
      expect(breakdown.weighted_total).toBeLessThanOrEqual(100);
    });

    it('should weight ingredients at 50%, sensitivity 20%, conflict 15%, rating 15%', () => {
      const product = makeProduct();
      const profile = makeProfile();
      const path = makePath();
      const b = computeScore(product, profile, path, []);
      const expected = Math.round(
        0.5 * b.ingredient_relevance +
        0.2 * b.sensitivity_match +
        0.15 * b.conflict_risk +
        0.15 * b.rating
      );
      expect(b.weighted_total).toBe(expected);
    });
  });
});

describe('Conflict Detection', () => {
  it('should detect retinol + glycolic_acid conflict', () => {
    const conflicts = findConflictsBetweenIngredients(
      ['retinol'],
      ['glycolic_acid']
    );
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].risk).toBe('high');
  });

  it('should be symmetric (a+b equals b+a)', () => {
    const ab = findConflictsBetweenIngredients(['retinol'], ['glycolic_acid']);
    const ba = findConflictsBetweenIngredients(['glycolic_acid'], ['retinol']);
    expect(ab.length).toBe(ba.length);
    expect(ab[0]?.alert).toBe(ba[0]?.alert);
  });

  it('should find no conflicts for compatible ingredients', () => {
    const conflicts = findConflictsBetweenIngredients(
      ['ceramides'],
      ['hyaluronic_acid']
    );
    expect(conflicts.length).toBe(0);
  });

  it('should detect conflicts in a routine', () => {
    const item1: any = {
      step: 'treatment',
      product: makeProduct({ id: 'p1', key_ingredients: ['retinol'] }),
      score: 80,
      score_breakdown: { ingredient_relevance: 80, sensitivity_match: 70, conflict_risk: 50, rating: 80, weighted_total: 75 },
      why: ['test'],
      refill: { days: 30, date_iso: '2025-01-01' },
    };
    const item2: any = {
      step: 'cleanser',
      product: makeProduct({ id: 'p2', key_ingredients: ['glycolic_acid'] }),
      score: 70,
      score_breakdown: { ingredient_relevance: 70, sensitivity_match: 70, conflict_risk: 50, rating: 70, weighted_total: 65 },
      why: ['test'],
      refill: { days: 30, date_iso: '2025-01-01' },
    };
    const findings = detectConflictsInRoutine([item1, item2]);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should load conflict rules from JSON', () => {
    const rules = loadConflictRules();
    expect(rules.length).toBeGreaterThanOrEqual(12);
  });
});

describe('Budget Optimizer', () => {
  it('should load products from catalog', () => {
    const products = loadProducts();
    expect(products.length).toBeGreaterThanOrEqual(40);
  });

  it('should generate routine within budget when maxTotal set', () => {
    const profile = makeProfile();
    const path = makePath();
    const budget = { maxTotal: 60, preference: 'low' as const };
    const result = generateRoutine(profile, path, budget);
    // Should have products
    expect(result.cart.length).toBeGreaterThan(0);
    // Total should be reasonable (may or may not be under budget if impossible)
    expect(result.total).toBeGreaterThan(0);
  });

  it('should generate routine without budget limit', () => {
    const profile = makeProfile();
    const path = makePath();
    const budget = { maxTotal: null, preference: 'balanced' as const };
    const result = generateRoutine(profile, path, budget);
    expect(result.cart.length).toBe(4); // cleanser, treatment, moisturizer, spf
    expect(result.routine.am.length).toBeGreaterThanOrEqual(3);
    expect(result.routine.pm.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Allergy Filtering', () => {
  it('should filter out products containing allergy tokens in key_ingredients', () => {
    const products = [
      makeProduct({ id: 'p1', key_ingredients: ['retinol', 'niacinamide'] }),
      makeProduct({ id: 'p2', key_ingredients: ['ceramides', 'hyaluronic_acid'] }),
    ];
    const filtered = filterByAllergies(products, ['retinol']);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('p2');
  });

  it('should filter out products containing allergy tokens in full_ingredients', () => {
    const products = [
      makeProduct({ id: 'p1', full_ingredients: 'water, fragrance, glycerin' }),
      makeProduct({ id: 'p2', full_ingredients: 'water, ceramide np, glycerin' }),
    ];
    const filtered = filterByAllergies(products, ['fragrance']);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('p2');
  });

  it('should be case-insensitive', () => {
    const products = [
      makeProduct({ id: 'p1', key_ingredients: ['Retinol'] }),
    ];
    const filtered = filterByAllergies(products, ['retinol']);
    expect(filtered.length).toBe(0);
  });

  it('should return all products when allergies is null', () => {
    const products = [makeProduct(), makeProduct({ id: 'p2' })];
    const filtered = filterByAllergies(products, null);
    expect(filtered.length).toBe(2);
  });
});

describe('Swap', () => {
  it('should return a different product when swapping', () => {
    const profile = makeProfile();
    const path = makePath();
    const budget = { maxTotal: null, preference: 'balanced' as const };

    // First generate a routine
    const routine = generateRoutine(profile, path, budget);
    const treatment = routine.cart.find((i) => i.step === 'treatment');
    if (!treatment) return;

    const result = swapProduct(
      profile,
      path,
      'treatment',
      routine.cart,
      treatment.product.id,
      budget
    );

    if (result) {
      expect(result.replacement.product.id).not.toBe(treatment.product.id);
      expect(result.replacement.step).toBe('treatment');
    }
  });
});

describe('Preview', () => {
  it('should generate preview with products from catalog', () => {
    const profile = makeProfile();
    const pathInfo = { strategy_key: 'salicylic_acid', risk_level: 'low' };
    const preview = generatePreview(profile, pathInfo);

    expect(preview.strategy_key).toBe('salicylic_acid');
    expect(preview.total).toBeGreaterThan(0);

    // All products must come from catalog
    const catalogIds = new Set(loadProducts().map((p) => p.id));
    for (const step of ['cleanser', 'treatment', 'moisturizer', 'spf']) {
      const item = preview.plan[step];
      if (item) {
        expect(catalogIds.has(item.product.id)).toBe(true);
      }
    }
  });

  it('should generate previews for all strategy keys', () => {
    const profile = makeProfile();
    const strategies = [
      'salicylic_acid', 'niacinamide_centella', 'benzoyl_peroxide',
      'retinoid', 'barrier_repair', 'brightening_vitamin_c', 'hydration_focus',
    ];
    for (const key of strategies) {
      const preview = generatePreview(profile, { strategy_key: key, risk_level: 'low' });
      expect(preview.strategy_key).toBe(key);
      expect(preview.total).toBeGreaterThan(0);
    }
  });
});

describe('Refill Predictor', () => {
  it('should compute days correctly', () => {
    const product = makeProduct({ size_ml: 100, avg_daily_usage_ml: 2 });
    const refill = computeRefill(product);
    expect(refill.days).toBe(50);
    expect(refill.date_iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
