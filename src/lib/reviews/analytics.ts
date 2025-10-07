import type { NormalizedReview, ReviewChannel } from "./types";

export const computeGlobalTrend = (reviews: NormalizedReview[]) => {
  const buckets = new Map<
    string,
    { total: number; count: number; normalizedTotal: number }
  >();

  reviews.forEach((review) => {
    const date = new Date(review.submittedAt);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) {
      buckets.set(key, { total: 0, count: 0, normalizedTotal: 0 });
    }
    const bucket = buckets.get(key)!;
    bucket.count += 1;
    bucket.normalizedTotal += review.normalizedRating ?? 0;
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([period, { count, normalizedTotal }]) => ({
      period,
      average: count ? Number((normalizedTotal / count).toFixed(2)) : null,
    }));
};

export const computeCategoryBreakdown = (reviews: NormalizedReview[]) => {
  const totals = new Map<
    string,
    { label: string; total: number; count: number }
  >();

  reviews.forEach((review) => {
    review.categoryRatings.forEach((category) => {
      if (category.normalizedRating == null) return;
      if (!totals.has(category.key)) {
        totals.set(category.key, { label: category.label, total: 0, count: 0 });
      }
      const record = totals.get(category.key)!;
      record.total += category.normalizedRating;
      record.count += 1;
    });
  });

  return Array.from(totals.entries())
    .map(([key, stats]) => ({
      key,
      label: stats.label,
      average: stats.count ? stats.total / stats.count : null,
      count: stats.count,
    }))
    .filter((category) => category.average != null)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
};

export const computeChannelDistribution = (reviews: NormalizedReview[]) => {
  const totals = new Map<ReviewChannel, number>();
  reviews.forEach((review) => {
    totals.set(review.channel, (totals.get(review.channel) ?? 0) + 1);
  });

  const overall = reviews.length || 1;

  return Array.from(totals.entries())
    .map(([channel, count]) => ({
      channel,
      count,
      ratio: count / overall,
    }))
    .sort((a, b) => b.count - a.count);
};

export const computeRecurringIssues = (reviews: NormalizedReview[]) => {
  const frequencies = new Map<string, number>();

  reviews.forEach((review) => {
    review.tags.forEach((tag) => {
      if (!tag) return;
      const key = tag.toLowerCase();
      frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
    });
  });

  return Array.from(frequencies.entries())
    .map(([tag, count]) => ({
      tag,
      count,
    }))
    .sort((a, b) => b.count - a.count);
};

export const formatIssueLabel = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
