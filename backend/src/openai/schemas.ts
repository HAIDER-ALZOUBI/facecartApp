import { z } from 'zod';

export const SkinContextProfileSchema = z.object({
  barrier_sensitivity: z.enum(['low', 'moderate', 'high']),
  oil_production: z.enum(['low', 'moderate', 'high']),
  inflammation_risk: z.enum(['low', 'moderate', 'elevated']),
  primary_concerns: z.array(z.string()).min(1).max(6),
  likely_triggers: z.array(z.string()).min(0).max(6),
  confidence: z.number().min(0).max(100),
});

export const TreatmentPathSchema = z.object({
  name: z.string(),
  strategy_key: z.enum([
    'salicylic_acid',
    'niacinamide_centella',
    'benzoyl_peroxide',
    'retinoid',
    'barrier_repair',
    'brightening_vitamin_c',
    'hydration_focus',
  ]),
  risk_level: z.enum(['low', 'medium', 'high']),
  explanation: z.string(),
  who_its_for: z.string(),
});

export const TreatmentPathsResponseSchema = z.object({
  paths: z.array(TreatmentPathSchema).length(3),
});

export const QuestionsResponseSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
    })
  ).length(5),
});
