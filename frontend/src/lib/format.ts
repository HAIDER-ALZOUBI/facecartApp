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
      return 'text-green-600 bg-green-100';
    case 'medium':
    case 'moderate':
      return 'text-yellow-700 bg-yellow-100';
    case 'high':
    case 'elevated':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function scoreColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function scoreTextColor(score: number): string {
  if (score >= 70) return 'text-green-700';
  if (score >= 40) return 'text-yellow-700';
  return 'text-red-700';
}
