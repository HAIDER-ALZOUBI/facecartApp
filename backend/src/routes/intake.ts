import { Router, Request, Response } from 'express';
import { generateQuestions, generateProfile, isAIAvailable } from '../openai/client';
import { validateText } from '../utils/validate';
import { log, error as logError } from '../utils/logger';

const router = Router();

router.post('/questions', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const err = validateText(text);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    const aiAvailable = isAIAvailable();
    log('intake:questions:start', { textLength: text?.length, branch: aiAvailable ? 'openai' : 'fallback' }, req);

    const result = await generateQuestions(text);

    // Ensure Q1 is always the allergy question
    if (
      result.questions.length > 0 &&
      !result.questions[0].question.toLowerCase().includes('allerg')
    ) {
      result.questions[0] = {
        id: 'q1',
        question: 'Do you have any allergies to skincare ingredients?',
      };
    }

    // Ensure we have exactly 5 questions
    while (result.questions.length < 5) {
      const fallbacks = [
        { id: `q${result.questions.length + 1}`, question: 'Does your skin tend to get oily throughout the day?' },
        { id: `q${result.questions.length + 1}`, question: 'Does your skin feel tight or dry after cleansing?' },
        { id: `q${result.questions.length + 1}`, question: 'Do you experience frequent breakouts or acne?' },
        { id: `q${result.questions.length + 1}`, question: 'Do you currently use sunscreen daily?' },
      ];
      result.questions.push(fallbacks[result.questions.length - 1] || fallbacks[0]);
    }
    result.questions = result.questions.slice(0, 5);

    log('intake:questions:done', { questionsCount: result.questions.length }, req);

    res.json(result);
  } catch (err: any) {
    logError('intake:questions:error', { message: err.message, stack: err.stack }, req);
    res.status(500).json({ error: 'Failed to generate questions', requestId: req.id });
  }
});

router.post('/profile', async (req: Request, res: Response) => {
  try {
    const { text, photoBase64DataUrl, answers, allergies, existingProfile } = req.body;

    const err = validateText(text);
    if (err) return res.status(400).json({ error: err, requestId: req.id });

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers is required and must be an object', requestId: req.id });
    }

    const aiAvailable = isAIAvailable();
    log('intake:profile:start', {
      hasPhoto: !!photoBase64DataUrl,
      branch: aiAvailable ? 'openai' : 'fallback',
      allergiesCount: Array.isArray(allergies) ? allergies.length : 0,
      hasMerge: !!existingProfile,
    }, req);

    // Note: allergies are NOT passed to OpenAI. They are stored client-side
    // and used only by the deterministic engine to filter products.
    const profile = await generateProfile(
      text,
      photoBase64DataUrl || null,
      answers,
      existingProfile || null
    );

    log('intake:profile:done', { confidence: profile.confidence, concerns: profile.primary_concerns }, req);

    res.json(profile);
  } catch (err: any) {
    logError('intake:profile:error', { message: err.message, stack: err.stack }, req);
    res.status(500).json({ error: 'Failed to generate profile', requestId: req.id });
  }
});

export default router;
