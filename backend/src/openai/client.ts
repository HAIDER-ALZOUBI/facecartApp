import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import {
  SkinContextProfileSchema,
  TreatmentPathsResponseSchema,
  QuestionsResponseSchema,
} from './schemas';
import {
  QUESTIONS_SYSTEM_PROMPT,
  PROFILE_SYSTEM_PROMPT,
  PATHS_SYSTEM_PROMPT,
  buildProfileUserPrompt,
  buildPathsUserPrompt,
} from './prompts';
import type { SkinContextProfile } from '../utils/constants';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
    return null;
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function isAIAvailable(): boolean {
  return getClient() !== null;
}

const textModel = () => process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
const visionModel = () => process.env.OPENAI_VISION_MODEL || 'gpt-4o';

export async function generateQuestions(text: string): Promise<{ questions: Array<{ id: string; question: string }> }> {
  const ai = getClient();
  if (!ai) return getFallbackQuestions();

  try {
    const response = await ai.responses.create({
      model: textModel(),
      input: [
        { role: 'system', content: QUESTIONS_SYSTEM_PROMPT },
        { role: 'user', content: `User says: "${text}"\n\nGenerate 5 yes/no follow-up questions. Question 1 MUST ask about skincare ingredient allergies.` },
      ],
      text: {
        format: zodTextFormat(QuestionsResponseSchema, 'questions_response'),
      },
    });

    const parsed = JSON.parse(response.output_text);
    return parsed;
  } catch (err) {
    console.error('OpenAI questions error, using fallback:', (err as Error).message);
    return getFallbackQuestions();
  }
}

function getFallbackQuestions() {
  return {
    questions: [
      { id: 'q1', question: 'Do you have any allergies to skincare ingredients?' },
      { id: 'q2', question: 'Does your skin tend to get oily throughout the day?' },
      { id: 'q3', question: 'Does your skin feel tight or dry after cleansing?' },
      { id: 'q4', question: 'Do you experience frequent breakouts or acne?' },
      { id: 'q5', question: 'Do you currently use sunscreen daily?' },
    ],
  };
}

export async function generateProfile(
  text: string,
  photoBase64DataUrl: string | null,
  answers: Record<string, string>,
  existingProfile: SkinContextProfile | null
): Promise<SkinContextProfile> {
  const ai = getClient();
  if (!ai) return getFallbackProfile(text, answers, existingProfile);

  try {
    const userPrompt = buildProfileUserPrompt(text, answers, existingProfile);
    const model = photoBase64DataUrl ? visionModel() : textModel();

    const userContent: any[] = [{ type: 'input_text', text: userPrompt }];
    if (photoBase64DataUrl) {
      userContent.push({
        type: 'input_image',
        image_url: photoBase64DataUrl,
      });
    }

    const response = await ai.responses.create({
      model,
      input: [
        { role: 'system', content: PROFILE_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      text: {
        format: zodTextFormat(SkinContextProfileSchema, 'skin_context_profile'),
      },
    });

    const parsed = JSON.parse(response.output_text);
    return parsed as SkinContextProfile;
  } catch (err) {
    console.error('OpenAI profile error, using fallback:', (err as Error).message);
    return getFallbackProfile(text, answers, existingProfile);
  }
}

function getFallbackProfile(
  text: string,
  answers: Record<string, string>,
  existingProfile: SkinContextProfile | null
): SkinContextProfile {
  const lower = text.toLowerCase();
  const concerns: string[] = [];
  const triggers: string[] = [];

  if (lower.includes('acne') || lower.includes('breakout') || lower.includes('pimple')) {
    concerns.push('inflammatory_acne');
    triggers.push('possible hormonal factors');
  }
  if (lower.includes('dry') || lower.includes('flak') || lower.includes('tight')) {
    concerns.push('dryness');
    triggers.push('possible over-cleansing');
  }
  if (lower.includes('oil') || lower.includes('shiny') || lower.includes('greasy')) {
    concerns.push('oiliness');
  }
  if (lower.includes('red') || lower.includes('irritat') || lower.includes('sensitiv')) {
    concerns.push('redness');
    concerns.push('sensitivity');
    triggers.push('possible irritant exposure');
  }
  if (lower.includes('dark') || lower.includes('spot') || lower.includes('hyperpigment') || lower.includes('uneven')) {
    concerns.push('hyperpigmentation');
    triggers.push('possible sun exposure');
  }
  if (lower.includes('wrinkle') || lower.includes('aging') || lower.includes('fine line')) {
    concerns.push('aging');
  }
  if (lower.includes('texture') || lower.includes('rough') || lower.includes('bump')) {
    concerns.push('texture');
  }

  if (concerns.length === 0) concerns.push('sensitivity', 'dryness');

  const isOily = answers.q2 === 'yes';
  const isDry = answers.q3 === 'yes';
  const hasAcne = answers.q4 === 'yes';

  if (hasAcne && !concerns.includes('inflammatory_acne')) concerns.push('inflammatory_acne');
  if (isDry && !concerns.includes('dryness')) concerns.push('dryness');
  if (isOily && !concerns.includes('oiliness')) concerns.push('oiliness');

  let profile: SkinContextProfile = {
    barrier_sensitivity: lower.includes('sensitiv') || isDry ? 'high' : 'moderate',
    oil_production: isOily ? 'high' : isDry ? 'low' : 'moderate',
    inflammation_risk: hasAcne || lower.includes('red') ? 'elevated' : 'moderate',
    primary_concerns: [...new Set(concerns)],
    likely_triggers: [...new Set(triggers)],
    confidence: 35,
  };

  if (existingProfile) {
    profile = mergeProfiles(existingProfile, profile);
  }

  return profile;
}

function mergeProfiles(existing: SkinContextProfile, incoming: SkinContextProfile): SkinContextProfile {
  const riskOrder = { low: 0, moderate: 1, high: 2, elevated: 2 };
  const pickHigher = <T extends string>(a: T, b: T): T => {
    return (riskOrder[a as keyof typeof riskOrder] || 0) >= (riskOrder[b as keyof typeof riskOrder] || 0) ? a : b;
  };

  return {
    barrier_sensitivity: pickHigher(existing.barrier_sensitivity, incoming.barrier_sensitivity) as any,
    oil_production: pickHigher(existing.oil_production, incoming.oil_production) as any,
    inflammation_risk: pickHigher(existing.inflammation_risk, incoming.inflammation_risk) as any,
    primary_concerns: [...new Set([...existing.primary_concerns, ...incoming.primary_concerns])],
    likely_triggers: [...new Set([...existing.likely_triggers, ...incoming.likely_triggers])],
    confidence: Math.round((existing.confidence + incoming.confidence) / 2),
  };
}

export async function generatePaths(
  profile: SkinContextProfile
): Promise<{
  paths: Array<{
    name: string;
    strategy_key: string;
    risk_level: string;
    explanation: string;
    who_its_for: string;
  }>;
}> {
  const ai = getClient();
  if (!ai) return getFallbackPaths(profile);

  try {
    const userPrompt = buildPathsUserPrompt(profile);

    const response = await ai.responses.create({
      model: textModel(),
      input: [
        { role: 'system', content: PATHS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      text: {
        format: zodTextFormat(TreatmentPathsResponseSchema, 'treatment_paths_response'),
      },
    });

    const parsed = JSON.parse(response.output_text);
    return parsed;
  } catch (err) {
    console.error('OpenAI paths error, using fallback:', (err as Error).message);
    return getFallbackPaths(profile);
  }
}

function getFallbackPaths(profile: SkinContextProfile) {
  const concerns = profile.primary_concerns;
  const paths: Array<{
    name: string;
    strategy_key: string;
    risk_level: string;
    explanation: string;
    who_its_for: string;
  }> = [];

  if (concerns.includes('inflammatory_acne') || concerns.includes('oiliness')) {
    paths.push({
      name: 'Gentle Acne Control',
      strategy_key: 'salicylic_acid',
      risk_level: 'low',
      explanation: 'Salicylic acid gently unclogs pores and reduces oiliness without over-drying.',
      who_its_for: 'Best for oily or acne-prone skin that needs gentle daily care',
    });
    paths.push({
      name: 'Calming & Balancing',
      strategy_key: 'niacinamide_centella',
      risk_level: 'low',
      explanation: 'Niacinamide and centella calm inflammation while balancing oil production.',
      who_its_for: 'Best for sensitive skin with redness or irritation',
    });
    paths.push({
      name: 'Strong Acne Fighter',
      strategy_key: 'benzoyl_peroxide',
      risk_level: 'high',
      explanation: 'Benzoyl peroxide kills acne-causing bacteria but may cause dryness initially.',
      who_its_for: 'Best for persistent acne that hasn\'t responded to gentler options',
    });
  } else if (concerns.includes('hyperpigmentation') || concerns.includes('dark_spots')) {
    paths.push({
      name: 'Brightening Path',
      strategy_key: 'brightening_vitamin_c',
      risk_level: 'low',
      explanation: 'Vitamin C and brightening agents fade dark spots and even out skin tone.',
      who_its_for: 'Best for uneven skin tone and sun damage',
    });
    paths.push({
      name: 'Gentle Renewal',
      strategy_key: 'niacinamide_centella',
      risk_level: 'low',
      explanation: 'Niacinamide helps fade dark spots while centella soothes and repairs.',
      who_its_for: 'Best for sensitive skin with mild discoloration',
    });
    paths.push({
      name: 'Active Renewal',
      strategy_key: 'retinoid',
      risk_level: 'high',
      explanation: 'Retinoids speed cell turnover to fade spots faster but require careful use.',
      who_its_for: 'Best for those comfortable with potent actives',
    });
  } else if (concerns.includes('dryness') || concerns.includes('barrier_damage')) {
    paths.push({
      name: 'Barrier Repair',
      strategy_key: 'barrier_repair',
      risk_level: 'low',
      explanation: 'Focus on rebuilding the skin barrier with ceramides and soothing ingredients.',
      who_its_for: 'Best for damaged, dry, or over-exfoliated skin',
    });
    paths.push({
      name: 'Deep Hydration',
      strategy_key: 'hydration_focus',
      risk_level: 'low',
      explanation: 'Layer hydrating ingredients to restore moisture and plumpness.',
      who_its_for: 'Best for chronically dry or dehydrated skin',
    });
    paths.push({
      name: 'Calming Recovery',
      strategy_key: 'niacinamide_centella',
      risk_level: 'low',
      explanation: 'Gentle calming ingredients that won\'t further irritate compromised skin.',
      who_its_for: 'Best for sensitive, reactive skin needing gentle care',
    });
  } else {
    paths.push({
      name: 'Gentle Daily Care',
      strategy_key: 'niacinamide_centella',
      risk_level: 'low',
      explanation: 'A gentle, balanced approach using calming and skin-strengthening ingredients.',
      who_its_for: 'Best for most skin types as a safe starting point',
    });
    paths.push({
      name: 'Hydration Boost',
      strategy_key: 'hydration_focus',
      risk_level: 'low',
      explanation: 'Focus on deep hydration to keep skin healthy and balanced.',
      who_its_for: 'Best for normal to dry skin wanting a simple routine',
    });
    paths.push({
      name: 'Brightening Routine',
      strategy_key: 'brightening_vitamin_c',
      risk_level: 'medium',
      explanation: 'Add vitamin C for antioxidant protection and a brighter complexion.',
      who_its_for: 'Best for those wanting to improve overall skin radiance',
    });
  }

  return { paths };
}
