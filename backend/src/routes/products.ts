import { Router, Request, Response } from 'express';
import { validateProfile, validateSelectedPath, validateBudget, validateStep } from '../utils/validate';
import { getOptionsForStep, swapProduct, loadProducts } from '../engine/optimizer';
import { checkProductConflictsWithRoutine } from '../engine/conflicts';
import { generateSearchLink } from '../engine/links';
import { log, error as logError } from '../utils/logger';
import type { RoutineItem } from '../utils/constants';

const router = Router();

router.post('/options', async (req: Request, res: Response) => {
  try {
    const { profile, selectedPath, step, currentRoutine, budget, allergies } = req.body;

    let err = validateProfile(profile);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateSelectedPath(selectedPath);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateStep(step);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateBudget(budget);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    log('products:options:start', { step, strategy: selectedPath?.strategy_key }, req);

    const options = getOptionsForStep(
      profile,
      selectedPath,
      step,
      currentRoutine || [],
      budget,
      allergies || null
    );
    const sliced = options.slice(0, 10);

    log('products:options:done', {
      step,
      count: sliced.length,
      top3: sliced.slice(0, 3).map((o: any) => ({ id: o.product.id, score: o.score })),
    }, req);

    res.json({ options: sliced });
  } catch (err: any) {
    logError('products:options:error', { message: err.message, stack: err.stack }, req);
    res.status(500).json({ error: 'Failed to get product options', requestId: req.id });
  }
});

// Cart swap endpoint
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { profile, selectedPath, step, currentRoutine, excludeProductId, budget, allergies } = req.body;

    let err = validateProfile(profile);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateSelectedPath(selectedPath);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateStep(step);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateBudget(budget);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    if (!excludeProductId || typeof excludeProductId !== 'string') {
      return res.status(400).json({ error: 'excludeProductId is required', requestId: req.id });
    }

    const conflictsBefore = (currentRoutine || []).length; // rough proxy
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

// Existing product check endpoint
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { existing, currentRoutine } = req.body;

    if (!existing || !existing.name || !existing.key_ingredient) {
      return res.status(400).json({ error: 'existing.name and existing.key_ingredient are required', requestId: req.id });
    }

    log('existing:check:start', { keyIngredient: existing.key_ingredient, routineSize: (currentRoutine || []).length }, req);

    const ingredientList = [existing.key_ingredient.toLowerCase()];
    const conflicts = checkProductConflictsWithRoutine(ingredientList, currentRoutine || []);

    const buyLink = {
      label: 'Search',
      url: generateSearchLink(existing.name),
    };

    const hasConflict = conflicts.length > 0;
    log('existing:check:done', { keyIngredient: existing.key_ingredient, conflictFound: hasConflict, conflictsCount: conflicts.length }, req);

    if (!hasConflict) {
      res.json({
        status: 'ok',
        message: `No conflicts found. "${existing.name}" appears compatible with your current routine.`,
        conflicts: [],
        buy_link: buyLink,
      });
    } else {
      const conflictSummary = conflicts
        .map((c) => `${c.pair.join(' + ')}: ${c.alert} — ${c.fix}`)
        .join('; ');

      res.json({
        status: 'conflict',
        message: `Potential conflicts detected: ${conflictSummary}`,
        conflicts,
        buy_link: buyLink,
      });
    }
  } catch (err: any) {
    logError('existing:check:error', { message: err.message, stack: err.stack }, req);
    res.status(500).json({ error: 'Failed to check existing product', requestId: req.id });
  }
});

export default router;
