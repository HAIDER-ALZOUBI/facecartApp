import { Router, Request, Response } from 'express';
import { validateProfile, validateSelectedPath, validateBudget } from '../utils/validate';
import { generateRoutine } from '../engine/optimizer';
import { log, error as logError } from '../utils/logger';

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { profile, selectedPath, budget, allergies } = req.body;

    let err = validateProfile(profile);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateSelectedPath(selectedPath);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    err = validateBudget(budget);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    log('routine:generate:start', { selectedPath, budgetPref: budget?.preference }, req);

    const result = generateRoutine(profile, selectedPath, budget, allergies || null);

    const selectedByStep: Record<string, string> = {};
    for (const item of result.cart) {
      selectedByStep[item.step] = item.product.id;
    }

    log('routine:generate:done', {
      total: result.total,
      conflictsCount: result.conflicts.length,
      selectedByStep,
    }, req);

    res.json(result);
  } catch (err: any) {
    logError('routine:generate:error', { message: err.message, stack: err.stack }, req);
    res.status(500).json({ error: 'Failed to generate routine', requestId: req.id });
  }
});

export default router;
