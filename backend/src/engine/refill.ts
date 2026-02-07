import { Product } from '../utils/constants';

export function computeRefill(product: Product): { days: number; date_iso: string } {
  const days = Math.floor(product.size_ml / product.avg_daily_usage_ml);
  const refillDate = new Date();
  refillDate.setDate(refillDate.getDate() + days);
  return {
    days,
    date_iso: refillDate.toISOString().split('T')[0],
  };
}
