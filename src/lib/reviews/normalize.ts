import hostawayEnvelope from "@/data/hostaway-reviews.json";
import {
  CollectionMetrics,
  HostawayReview,
  HostawayReviewEnvelope,
  ListingCategoryAverages,
  ListingChannelBreakdown,
  ListingReviewSummary,
  ListingTrendPoint,
  NormalizedCategoryRating,
  NormalizedReview,
  ReviewChannel,
  ReviewStatus,
  ReviewsResponse,
  ReviewType,
} from "./types";
import { approvalsStore } from "./store";

type HostawayEnvelope = HostawayReviewEnvelope;

const DEFAULT_RATING_SCALE = 5;
const NORMALIZED_TARGET_SCALE = 5;

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;
const HTML_DANGEROUS_CHARS = /[<>"'`]/g;

const sanitizeText = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutControl = trimmed.replace(CONTROL_CHARACTERS, "");
  if (!withoutControl) return null;
  return withoutControl.replace(HTML_DANGEROUS_CHARS, "");
};

const sanitizeAndFallback = (
  value: string | null | undefined,
  fallback: string,
): string => sanitizeText(value) ?? fallback;

const CHANNEL_LABELS: Record<ReviewChannel, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  google: "Google",
  expedia: "Expedia",
  vrbo: "Vrbo",
  direct: "Direct",
  flex: "Flex Living",
  other: "Other",
};

const REVIEW_TYPE_FALLBACKS: Record<string, ReviewType> = {
  "guest-to-host": "guest-to-host",
  "host-to-guest": "host-to-guest",
  "guest-to-guest": "guest-to-guest",
  "host-to-host": "host-to-host",
};

const REVIEW_STATUS_FALLBACKS: Record<string, ReviewStatus> = {
  published: "published",
  pending: "pending",
  hidden: "hidden",
  archived: "archived",
};

export const hostawayMockData = hostawayEnvelope as HostawayEnvelope;

export const getHostawayReviews = (): HostawayReview[] =>
  (hostawayMockData.result ?? []).map((review) => ({
    ...review,
  }));

const toSlug = (value: string) =>
  sanitizeAndFallback(value, "listing")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const coerceChannel = (value?: string | null): ReviewChannel => {
  if (!value) return "other";
  const normalized = value.toLowerCase();
  if (normalized.includes("airbnb")) return "airbnb";
  if (normalized.includes("booking")) return "booking";
  if (normalized.includes("google")) return "google";
  if (normalized.includes("expedia")) return "expedia";
  if (normalized.includes("vrbo")) return "vrbo";
  if (normalized.includes("flex")) return "flex";
  if (normalized.includes("direct")) return "direct";
  return "other";
};

const coerceType = (value?: string | null): ReviewType => {
  if (!value) return "unknown";
  const normalized = value.toLowerCase();
  return REVIEW_TYPE_FALLBACKS[normalized] ?? "unknown";
};

const coerceStatus = (value?: string | null): ReviewStatus => {
  if (!value) return "published";
  const normalized = value.toLowerCase();
  return REVIEW_STATUS_FALLBACKS[normalized] ?? "published";
};

const detectScale = (rating?: number | null, ratingScale?: number | null) => {
  if (ratingScale && ratingScale > 0) return ratingScale;
  if (rating == null) return DEFAULT_RATING_SCALE;
  if (rating <= 5) return 5;
  if (rating <= 10) return 10;
  if (rating <= 20) return 20;
  if (rating <= 100) return 100;
  return DEFAULT_RATING_SCALE;
};

const normalizeValueToTarget = (
  value: number | null | undefined,
  scale: number,
  targetScale = NORMALIZED_TARGET_SCALE,
) => {
  if (value == null) return null;
  if (scale <= 0 || Number.isNaN(scale)) return null;
  return Number(((value / scale) * targetScale).toFixed(2));
};

const humanizeCategory = (key: string) =>
  sanitizeAndFallback(key, "General")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (segment) => segment.toUpperCase());

const normalizeCategories = (
  categories: HostawayReview["reviewCategory"],
): NormalizedCategoryRating[] => {
  if (!categories?.length) return [];

  return categories.map(({ category, rating }) => {
    const scale = detectScale(rating, undefined);
    const normalized = normalizeValueToTarget(rating, scale);
    const safeKey = sanitizeAndFallback(category, "other");
    return {
      key: safeKey,
      label: humanizeCategory(safeKey),
      rating: rating ?? null,
      scale,
      normalizedRating: normalized,
    };
  });
};

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoString = (date: Date | null) =>
  date ? date.toISOString() : null;

const normalizeReview = (review: HostawayReview): NormalizedReview => {
  const {
    id,
    listingId,
    listingName,
    type,
    channel,
    status,
    rating,
    ratingScale,
    publicReview,
    privateReview,
    reviewCategory,
    submittedAt,
    guestName,
    managerResponse,
    tags,
    publishOnFlex,
  } = review;

  const scale = detectScale(rating ?? null, ratingScale ?? null);
  const normalizedRating = normalizeValueToTarget(rating ?? null, scale);
  const normalizedCategories = normalizeCategories(reviewCategory);
  const safeListingName = sanitizeAndFallback(listingName, "Flex Living Listing");
  const slug = toSlug(safeListingName);
  const date = parseDate(submittedAt) ?? new Date(0);
  const approvalOverride = approvalsStore.getApproval(String(id));

  return {
    id: `hostaway-${id}`,
    sourceId: id,
    listingId,
    listingName: safeListingName,
    listingSlug: slug,
    submittedAt: date.toISOString(),
    channel: coerceChannel(channel),
    type: coerceType(type),
    status: coerceStatus(status),
    guestName: sanitizeText(guestName),
    publicReview: sanitizeText(publicReview),
    privateReview: sanitizeText(privateReview),
    managerResponse: sanitizeText(managerResponse),
    rating: rating ?? null,
    ratingScale: scale,
    normalizedRating,
    categoryRatings: normalizedCategories,
    tags: (tags ?? [])
      .map((tag) => sanitizeText(tag))
      .filter((tag): tag is string => Boolean(tag)),
    isApproved:
      approvalOverride ?? (typeof publishOnFlex === "boolean"
        ? publishOnFlex
        : normalizedRating != null && normalizedRating >= 4.4),
  };
};

const average = (values: (number | null)[]): number | null => {
  const filtered = values.filter(
    (value): value is number => value != null && !Number.isNaN(value),
  );
  if (!filtered.length) return null;
  const sum = filtered.reduce((total, value) => total + value, 0);
  return Number((sum / filtered.length).toFixed(2));
};

const buildChannelBreakdown = (
  reviews: NormalizedReview[],
): ListingChannelBreakdown[] => {
  if (!reviews.length) return [];
  const counts = new Map<ReviewChannel, number>();
  for (const review of reviews) {
    counts.set(review.channel, (counts.get(review.channel) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([channel, count]) => ({
    channel,
    label: CHANNEL_LABELS[channel],
    count,
    ratio: Number((count / reviews.length).toFixed(2)),
  }));
};

const buildCategoryAverages = (
  reviews: NormalizedReview[],
): ListingCategoryAverages[] => {
  const tracked = new Map<string, { scale: number; values: number[] }>();
  for (const review of reviews) {
    for (const category of review.categoryRatings) {
      if (!tracked.has(category.key)) {
        tracked.set(category.key, { scale: category.scale, values: [] });
      }
      if (category.normalizedRating != null) {
        const record = tracked.get(category.key)!;
        record.values.push(category.normalizedRating);
      }
    }
  }

  return Array.from(tracked.entries()).map(([key, info]) => {
    const normalizedAverage = average(info.values);
    return {
      category: humanizeCategory(key),
      average:
        normalizedAverage == null
          ? null
          : Number(
              ((normalizedAverage / NORMALIZED_TARGET_SCALE) * info.scale).toFixed(
                2,
              ),
            ),
      scale: info.scale,
      normalizedAverage,
    };
  });
};

const buildTrend = (reviews: NormalizedReview[]): ListingTrendPoint[] => {
  if (!reviews.length) return [];
  const buckets = new Map<string, NormalizedReview[]>();

  for (const review of reviews) {
    const date = new Date(review.submittedAt);
    const period = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(period)) {
      buckets.set(period, []);
    }
    buckets.get(period)!.push(review);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([period, periodReviews]) => {
      const normalizedAverage = average(
        periodReviews.map((r) => r.normalizedRating),
      );
      return {
        period,
        averageRating: normalizedAverage,
        normalizedAverage,
        reviewCount: periodReviews.length,
      };
    });
};

const buildListingSummaries = (
  reviews: NormalizedReview[],
): ListingReviewSummary[] => {
  const groups = new Map<
    number,
    { info: NormalizedReview; reviews: NormalizedReview[] }
  >();

  for (const review of reviews) {
    if (!groups.has(review.listingId)) {
      groups.set(review.listingId, { info: review, reviews: [] });
    }
    groups.get(review.listingId)!.reviews.push(review);
  }

  return Array.from(groups.values())
    .map(({ info, reviews: listingReviews }) => {
      const normalizedAverage = average(
        listingReviews.map((review) => review.normalizedRating),
      );
      const sortedByDate = [...listingReviews].sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() -
          new Date(a.submittedAt).getTime(),
      );

      return {
        listingId: info.listingId,
        listingName: info.listingName,
        listingSlug: info.listingSlug,
        totalReviews: listingReviews.length,
        approvedReviews: listingReviews.filter((r) => r.isApproved).length,
        lastReviewDate: sortedByDate.length
          ? sortedByDate[0].submittedAt
          : null,
        averageRating: normalizedAverage,
        ratingScale: NORMALIZED_TARGET_SCALE,
        normalizedAverageRating: normalizedAverage,
        channels: buildChannelBreakdown(listingReviews),
        categoryAverages: buildCategoryAverages(listingReviews),
        ratingTrend: buildTrend(listingReviews),
      };
    })
    .sort((a, b) => {
      if (a.averageRating == null && b.averageRating == null) {
        return a.listingName.localeCompare(b.listingName);
      }
      if (a.averageRating == null) return 1;
      if (b.averageRating == null) return -1;
      return b.averageRating - a.averageRating;
    });
};

const computeMetrics = (reviews: NormalizedReview[]): CollectionMetrics => {
  const normalizedAverage = average(reviews.map((r) => r.normalizedRating));
  const approved = reviews.filter((review) => review.isApproved);
  const dates = reviews
    .map((review) => new Date(review.submittedAt))
    .filter((date) => !Number.isNaN(date.getTime()));

  const from = dates.length
    ? new Date(Math.min(...dates.map((date) => date.getTime())))
    : null;
  const to = dates.length
    ? new Date(Math.max(...dates.map((date) => date.getTime())))
    : null;

  return {
    totalReviews: reviews.length,
    approvedReviews: approved.length,
    averageRating: normalizedAverage,
    ratingScale: NORMALIZED_TARGET_SCALE,
    normalizedAverageRating: normalizedAverage,
    dateRange: {
      from: toIsoString(from),
      to: toIsoString(to),
    },
  };
};

interface ReviewFilters {
  listingId?: number;
  listingSlug?: string;
  channels?: ReviewChannel[];
  types?: ReviewType[];
  statuses?: ReviewStatus[];
  approved?: boolean | null;
  minRating?: number | null;
  maxRating?: number | null;
  category?: string;
  minCategoryRating?: number | null;
  startDate?: string;
  endDate?: string;
  search?: string;
  sort?: string;
}

const toBoolean = (value?: string | null) => {
  if (value == null) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const parseFloatOrNull = (value?: string | null) => {
  if (value == null) return null;
  const result = Number.parseFloat(value);
  return Number.isNaN(result) ? null : result;
};

const gatherFiltersFromSearchParams = (
  params: URLSearchParams,
): ReviewFilters => {
  const listingId = params.get("listingId");
  const listingSlug = params.get("listingSlug") ?? undefined;
  const channels = params.get("channel")?.split(",").filter(Boolean);
  const types = params.get("type")?.split(",").filter(Boolean);
  const statuses = params.get("status")?.split(",").filter(Boolean);
  const approved = toBoolean(params.get("approved"));
  const minRating = parseFloatOrNull(params.get("minRating"));
  const maxRating = parseFloatOrNull(params.get("maxRating"));
  const category = params.get("category") ?? undefined;
  const minCategoryRating = parseFloatOrNull(params.get("minCategoryRating"));
  const startDate = params.get("startDate") ?? undefined;
  const endDate = params.get("endDate") ?? undefined;
  const search = params.get("search") ?? undefined;
  const sort = params.get("sort") ?? undefined;

  return {
    listingId: listingId ? Number.parseInt(listingId, 10) : undefined,
    listingSlug,
    channels: channels?.map((value) => coerceChannel(value)),
    types: types?.map((value) => coerceType(value)),
    statuses: statuses?.map((value) => coerceStatus(value)),
    approved,
    minRating,
    maxRating,
    category: category?.toLowerCase(),
    minCategoryRating,
    startDate,
    endDate,
    search,
    sort,
  };
};

const matchesFilters = (review: NormalizedReview, filters: ReviewFilters) => {
  if (
    filters.listingId != null &&
    review.listingId !== filters.listingId
  ) {
    return false;
  }
  if (
    filters.listingSlug &&
    review.listingSlug !== filters.listingSlug
  ) {
    return false;
  }
  if (filters.channels?.length && !filters.channels.includes(review.channel)) {
    return false;
  }
  if (filters.types?.length && !filters.types.includes(review.type)) {
    return false;
  }
  if (filters.statuses?.length && !filters.statuses.includes(review.status)) {
    return false;
  }
  if (
    filters.approved != null &&
    review.isApproved !== filters.approved
  ) {
    return false;
  }
  if (filters.minRating != null) {
    if (
      review.normalizedRating == null ||
      review.normalizedRating < filters.minRating
    ) {
      return false;
    }
  }
  if (filters.maxRating != null) {
    if (
      review.normalizedRating == null ||
      review.normalizedRating > filters.maxRating
    ) {
      return false;
    }
  }
  if (filters.category) {
    const categoryMatch = review.categoryRatings.find(
      (category) => category.key.toLowerCase() === filters.category,
    );
    if (!categoryMatch) {
      return false;
    }
    if (
      filters.minCategoryRating != null &&
      (categoryMatch.normalizedRating == null ||
        categoryMatch.normalizedRating < filters.minCategoryRating)
    ) {
      return false;
    }
  }
  const startDate = filters.startDate ? parseDate(filters.startDate) : null;
  const endDate = filters.endDate ? parseDate(filters.endDate) : null;
  if (startDate || endDate) {
    const submitted = parseDate(review.submittedAt);
    if (!submitted) return false;
    if (startDate && submitted < startDate) return false;
    if (endDate && submitted > endDate) return false;
  }
  if (filters.search) {
    const lowerQuery = filters.search.toLowerCase();
    const haystack = [
      review.listingName,
      review.guestName ?? "",
      review.publicReview ?? "",
      review.privateReview ?? "",
      review.managerResponse ?? "",
      ...review.tags,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(lowerQuery)) {
      return false;
    }
  }
  return true;
};

const applySorting = (
  reviews: NormalizedReview[],
  sort?: string,
): NormalizedReview[] => {
  if (!sort) {
    return reviews.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() -
        new Date(a.submittedAt).getTime(),
    );
  }

  const [field, direction] = sort.split(":");
  const multiplier = direction === "asc" ? 1 : -1;

  switch (field) {
    case "rating":
      return reviews.sort((a, b) => {
        const aValue = a.normalizedRating ?? -Infinity;
        const bValue = b.normalizedRating ?? -Infinity;
        return (aValue - bValue) * multiplier * -1;
      });
    case "listing":
      return reviews.sort(
        (a, b) => a.listingName.localeCompare(b.listingName) * multiplier,
      );
    case "channel":
      return reviews.sort(
        (a, b) => a.channel.localeCompare(b.channel) * multiplier,
      );
    case "date":
    default:
      return reviews.sort(
        (a, b) =>
          (new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime()) *
          multiplier,
      );
  }
};

const collectMetaFilters = (
  reviews: NormalizedReview[],
) => {
  const channels = new Set<ReviewChannel>();
  const types = new Set<ReviewType>();
  const categories = new Set<string>();
  const statuses = new Set<ReviewStatus>();
  const dates = reviews
    .map((review) => parseDate(review.submittedAt))
    .filter((date): date is Date => !!date);

  for (const review of reviews) {
    channels.add(review.channel);
    types.add(review.type);
    statuses.add(review.status);
    for (const category of review.categoryRatings) {
      categories.add(category.key);
    }
  }

  const minDate = dates.length
    ? new Date(Math.min(...dates.map((date) => date.getTime())))
    : null;
  const maxDate = dates.length
    ? new Date(Math.max(...dates.map((date) => date.getTime())))
    : null;

  return {
    channels: Array.from(channels).sort(),
    reviewTypes: Array.from(types).sort(),
    categories: Array.from(categories).sort(),
    statuses: Array.from(statuses).sort(),
    dateRange: {
      min: toIsoString(minDate),
      max: toIsoString(maxDate),
    },
  };
};

export const buildHostawayResponse = (
  requestUrl: string,
): ReviewsResponse => {
  const allNormalized = getHostawayReviews().map((review) =>
    normalizeReview(review),
  );

  const url = new URL(requestUrl, "http://localhost");
  const filters = gatherFiltersFromSearchParams(url.searchParams);
  const filteredReviews = allNormalized.filter((review) =>
    matchesFilters(review, filters),
  );
  const sortedReviews = applySorting(filteredReviews, filters.sort);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      filters: collectMetaFilters(allNormalized),
    },
    metrics: {
      overall: computeMetrics(allNormalized),
      filtered: computeMetrics(sortedReviews),
    },
    listings: buildListingSummaries(sortedReviews),
    reviews: sortedReviews,
  };
};

export const refreshApprovals = () => {
  const reviews = getHostawayReviews();
  for (const review of reviews) {
    approvalsStore.ensureInitialValue(
      String(review.id),
      review.publishOnFlex ?? null,
    );
  }
};
