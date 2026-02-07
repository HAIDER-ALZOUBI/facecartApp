import { Router, Request, Response } from 'express';
import { generatePaths } from '../openai/client';
import { validateProfile } from '../utils/validate';
import { generatePreview } from '../engine/optimizer';
import { log, error as logError } from '../utils/logger';

const router = Router();

router.post('/paths', async (req: Request, res: Response) => {
  try {
    const { profile } = req.body;
    const err = validateProfile(profile);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    log('analysis:paths:start', { concerns: profile.primary_concerns }, req);

    const result = await generatePaths(profile);

    log('analysis:paths:done', {
      strategies: result.paths.map((p: any) => p.strategy_key),
      riskLevels: result.paths.map((p: any) => p.risk_level),
    }, req);

    res.json(result);
  } catch (err: any) {
    logError('analysis:paths:error', { message: err.message, stack: err.stack }, req);
    res.status(500).json({ error: 'Failed to generate paths', requestId: req.id });
  }
});

router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { profile, paths, allergies } = req.body;
    const err = validateProfile(profile);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ error: 'paths array is required', requestId: req.id });
    }

    log('analysis:preview:start', { pathCount: paths.length, strategies: paths.map((p: any) => p.strategy_key) }, req);

    const previews = paths.map((p: { strategy_key: string; risk_level: string }) =>
      generatePreview(profile, p, allergies || null)
    );

    log('analysis:preview:done', {
      previewTotals: previews.map((p: any) => ({ strategy: p.strategy_key, total: p.total, conflicts: p.conflicts.length })),
    }, req);

    res.json({ previews });
  } catch (err: any) {
    logError('analysis:preview:error', { message: err.message, stack: err.stack }, req);
    res.status(500).json({ error: 'Failed to generate previews', requestId: req.id });
  }
});

export default router;
