import { Router, Request, Response } from 'express';
import { validateProfile, validateSelectedPath, validateBudget } from '../utils/validate';
import { validateCart, loadProducts, swapProduct } from '../engine/optimizer';
import { log, error as logError } from '../utils/logger';

const router = Router();

// POST /api/cart/validate — recompute scores + conflicts for a given cart
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { profile, selectedPath, selectedByStep, budget, allergies } = req.body;

    let err = validateProfile(profile);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateSelectedPath(selectedPath);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateBudget(budget);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    if (!selectedByStep || typeof selectedByStep !== 'object') {
      return res.status(400).json({ error: 'selectedByStep is required', requestId: req.id });
    }

    const filledSteps = Object.entries(selectedByStep).filter(([, v]) => v);
    log('cart:validate:start', {
      filledSteps: filledSteps.map(([k, v]) => `${k}=${v}`),
      allergies: allergies?.length || 0,
    }, req);

    const result = validateCart(
      profile,
      selectedPath,
      selectedByStep,
      budget,
      allergies || null
    );

    log('cart:validate:done', {
      cartSize: result.cart.length,
      conflicts: result.conflicts.length,
      total: result.total,
    }, req);

    res.json(result);
  } catch (err: any) {
    logError('cart:validate:error', { message: err.message, stack: err.stack }, req);
    res.status(500).json({ error: 'Failed to validate cart', requestId: req.id });
  }
});

// POST /api/cart/swap — swap a product for the next best alternative
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { profile, selectedPath, step, currentRoutine, excludeProductId, budget, allergies } = req.body;

    let err = validateProfile(profile);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateSelectedPath(selectedPath);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    const { validateStep } = await import('../utils/validate');
    err = validateStep(step);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateBudget(budget);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    if (!excludeProductId || typeof excludeProductId !== 'string') {
      return res.status(400).json({ error: 'excludeProductId is required', requestId: req.id });
    }

    log('cart:swap:start', { step, excludeProductId }, req);

    const result = swapProduct(
      profile,
      selectedPath,
      step,
      currentRoutine || [],
      excludeProductId,
      budget,
      allergies || null
    );

    if (!result) {
      log('cart:swap:no-alt', { step, excludeProductId }, req);
      return res.status(404).json({ error: 'No alternative product found', requestId: req.id });
    }

    log('cart:swap:done', {
      step,
      excludedId: excludeProductId,
      replacementId: result.replacement.product.id,
      replacementScore: result.replacement.score,
      conflictsAfter: result.conflicts.length,
      total: result.total,
    }, req);

    res.json(result);
  } catch (err: any) {
    logError('cart:swap:error', { message: err.message, stack: err.stack }, req);
    res.status(500).json({ error: 'Failed to swap product', requestId: req.id });
  }
});

// GET /api/cart/catalog — return product catalog for the picker UI
router.get('/catalog', async (_req: Request, res: Response) => {
  try {
    const products = loadProducts();
    const catalog = products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      category: p.category,
      key_ingredients: p.key_ingredients,
      rating: p.rating,
      fragrance_free: p.fragrance_free,
    }));
    res.json({ products: catalog });
  } catch (err: any) {
    logError('cart:catalog:error', { message: err.message }, _req);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

export default router;
