import { FoodReview, HostelHouseCode, HOUSE_CODES } from '@/types';

export { HOUSE_CODES };

export interface ReviewAggregate {
  count: number;
  overall: number;
  quality: number;
  quantity: number;
  taste: number;
  cleanliness: number;
  houses: Record<HostelHouseCode, { average: number; count: number }>;
}

const round1 = (n: number) => Number(n.toFixed(1));

export function aggregateReviews(reviews: FoodReview[]): ReviewAggregate {
  const houses = {} as ReviewAggregate['houses'];
  const houseSums = {} as Record<HostelHouseCode, { sum: number; count: number }>;
  HOUSE_CODES.forEach((c) => {
    houseSums[c] = { sum: 0, count: 0 };
  });

  let overall = 0;
  let quality = 0;
  let quantity = 0;
  let taste = 0;
  let cleanliness = 0;

  reviews.forEach((r) => {
    overall += r.overall_rating;
    quality += r.quality_rating;
    quantity += r.quantity_rating;
    taste += r.taste_rating;
    cleanliness += r.cleanliness_rating;
    if (houseSums[r.cleanliness_house]) {
      houseSums[r.cleanliness_house].sum += r.cleanliness_rating;
      houseSums[r.cleanliness_house].count += 1;
    }
  });

  const n = reviews.length;
  HOUSE_CODES.forEach((c) => {
    const h = houseSums[c];
    houses[c] = { average: h.count ? round1(h.sum / h.count) : 0, count: h.count };
  });

  return {
    count: n,
    overall: n ? round1(overall / n) : 0,
    quality: n ? round1(quality / n) : 0,
    quantity: n ? round1(quantity / n) : 0,
    taste: n ? round1(taste / n) : 0,
    cleanliness: n ? round1(cleanliness / n) : 0,
    houses
  };
}

export function scoreBadge(score: number): { text: string; className: string } {
  if (score >= 4.5) return { text: 'Excellent', className: 'bg-emerald-100 text-emerald-800' };
  if (score >= 3.8) return { text: 'Good', className: 'bg-teal-100 text-teal-800' };
  if (score >= 2.8) return { text: 'Average', className: 'bg-amber-100 text-amber-800' };
  return { text: 'Needs improvement', className: 'bg-rose-100 text-rose-800' };
}
