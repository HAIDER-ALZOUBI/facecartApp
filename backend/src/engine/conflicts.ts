import { ConflictRule, ConflictFinding, Product, RoutineItem } from '../utils/constants';
import * as fs from 'fs';
import * as path from 'path';

let conflictRules: ConflictRule[] | null = null;

export function loadConflictRules(): ConflictRule[] {
  if (!conflictRules) {
    const filePath = path.join(__dirname, '../../data/conflicts.json');
    conflictRules = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return conflictRules!;
}

export function findConflictsBetweenIngredients(
  ingredientsA: string[],
  ingredientsB: string[]
): ConflictRule[] {
  const rules = loadConflictRules();
  const found: ConflictRule[] = [];

  const normA = ingredientsA.map((i) => i.toLowerCase());
  const normB = ingredientsB.map((i) => i.toLowerCase());

  for (const rule of rules) {
    const a = rule.a.toLowerCase();
    const b = rule.b.toLowerCase();

    const aInA = normA.some((i) => i.includes(a) || a.includes(i));
    const bInB = normB.some((i) => i.includes(b) || b.includes(i));
    const aInB = normB.some((i) => i.includes(a) || a.includes(i));
    const bInA = normA.some((i) => i.includes(b) || b.includes(i));

    if ((aInA && bInB) || (aInB && bInA)) {
      found.push(rule);
    }
  }

  return found;
}

export function detectConflictsInRoutine(
  routineItems: RoutineItem[]
): ConflictFinding[] {
  const findings: ConflictFinding[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < routineItems.length; i++) {
    for (let j = i + 1; j < routineItems.length; j++) {
      const itemA = routineItems[i];
      const itemB = routineItems[j];

      const conflicts = findConflictsBetweenIngredients(
        itemA.product.key_ingredients,
        itemB.product.key_ingredients
      );

      for (const conflict of conflicts) {
        const key = [conflict.a, conflict.b].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          findings.push({
            pair: [conflict.a, conflict.b],
            risk: conflict.risk,
            alert: conflict.alert,
            fix: conflict.fix,
            involvedProducts: [
              { step: itemA.step, productId: itemA.product.id },
              { step: itemB.step, productId: itemB.product.id },
            ],
          });
        }
      }
    }
  }

  return findings;
}

export function checkProductConflictsWithRoutine(
  productIngredients: string[],
  routineItems: RoutineItem[]
): ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  for (const item of routineItems) {
    const conflicts = findConflictsBetweenIngredients(
      productIngredients,
      item.product.key_ingredients
    );

    for (const conflict of conflicts) {
      findings.push({
        pair: [conflict.a, conflict.b],
        risk: conflict.risk,
        alert: conflict.alert,
        fix: conflict.fix,
        involvedProducts: [
          { step: 'external', productId: 'user_product' },
          { step: item.step, productId: item.product.id },
        ],
      });
    }
  }

  return findings;
}

export function countConflictsForProduct(
  product: Product,
  otherProducts: Product[]
): number {
  let count = 0;
  for (const other of otherProducts) {
    const conflicts = findConflictsBetweenIngredients(
      product.key_ingredients,
      other.key_ingredients
    );
    count += conflicts.length;
  }
  return count;
}
