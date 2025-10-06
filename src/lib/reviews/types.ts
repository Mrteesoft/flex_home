export type ReviewChannel =
  | "airbnb"
  | "booking"
  | "google"
  | "expedia"
  | "flex"
  | "vrbo"
  | "direct"
  | "other";

export type ReviewStatus = "published" | "pending" | "hidden" | "archived";

export type ReviewType =
  | "guest-to-host"
  | "host-to-guest"
  | "guest-to-guest"
  | "host-to-host"
  | "unknown";

export interface HostawayCategoryRating {
  category: string;
  rating: number | null;
}

export interface HostawayReview {
  id: number;
  listingId: number;
  listingName: string;
  type: ReviewType;
  channel?: ReviewChannel | string | null;
  status?: ReviewStatus | string | null;
  rating?: number | null;
  ratingScale?: number | null;
  publicReview?: string | null;
  privateReview?: string | null;
  reviewCategory?: HostawayCategoryRating[];
  submittedAt?: string | null;
  guestName?: string | null;
  managerResponse?: string | null;
  tags?: string[];
  publishOnFlex?: boolean;
}

export interface HostawayReviewEnvelope {
  status: string;
  result: HostawayReview[];
}

export interface NormalizedCategoryRating {
  key: string;
  label: string;
  rating: number | null;
  scale: number;
  normalizedRating: number | null;
}

export interface NormalizedReview {
  id: string;
  sourceId: number;
  listingId: number;
  listingName: string;
  listingSlug: string;
  submittedAt: string;
  channel: ReviewChannel;
  type: ReviewType;
  status: ReviewStatus;
  guestName: string | null;
  publicReview: string | null;
  privateReview: string | null;
  managerResponse: string | null;
  rating: number | null;
  ratingScale: number;
  normalizedRating: number | null;
  categoryRatings: NormalizedCategoryRating[];
  tags: string[];
  isApproved: boolean;
}

export interface ListingChannelBreakdown {
  channel: ReviewChannel;
  label: string;
  count: number;
  ratio: number;
}

export interface ListingCategoryAverages {
  category: string;
  average: number | null;
  scale: number;
  normalizedAverage: number | null;
}

export interface ListingTrendPoint {
  period: string;
  averageRating: number | null;
  normalizedAverage: number | null;
  reviewCount: number;
}

export interface ListingReviewSummary {
  listingId: number;
  listingName: string;
  listingSlug: string;
  totalReviews: number;
  approvedReviews: number;
  lastReviewDate: string | null;
  averageRating: number | null;
  ratingScale: number;
  normalizedAverageRating: number | null;
  channels: ListingChannelBreakdown[];
  categoryAverages: ListingCategoryAverages[];
  ratingTrend: ListingTrendPoint[];
}

export interface CollectionMetrics {
  totalReviews: number;
  approvedReviews: number;
  averageRating: number | null;
  ratingScale: number;
  normalizedAverageRating: number | null;
  dateRange: {
    from: string | null;
    to: string | null;
  };
}

export interface ReviewsResponse {
  meta: {
    generatedAt: string;
    filters: {
      channels: ReviewChannel[];
      reviewTypes: ReviewType[];
      categories: string[];
      statuses: ReviewStatus[];
      dateRange: {
        min: string | null;
        max: string | null;
      };
    };
  };
  metrics: {
    overall: CollectionMetrics;
    filtered: CollectionMetrics;
  };
  listings: ListingReviewSummary[];
  reviews: NormalizedReview[];
}
