export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatConcern(concern: string): string {
  return concern
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatRisk(risk: string): string {
  const map: Record<string, string> = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    moderate: 'Moderate',
    elevated: 'Elevated',
  };
  return map[risk] || risk;
}

export function riskColor(risk: string): string {
  switch (risk) {
    case 'low':
      return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
    case 'medium':
    case 'moderate':
      return 'text-amber-700 bg-amber-50 border border-amber-200';
    case 'high':
    case 'elevated':
      return 'text-rose-700 bg-rose-50 border border-rose-200';
    default:
      return 'text-muted bg-beige border border-sand';
  }
}

export function scoreColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-400';
  return 'bg-rose-400';
}

export function scoreTextColor(score: number): string {
  if (score >= 70) return 'text-emerald-700';
  if (score >= 40) return 'text-amber-700';
  return 'text-rose-700';
}
