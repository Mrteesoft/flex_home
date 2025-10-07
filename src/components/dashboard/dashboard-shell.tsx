"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  ListingReviewSummary,
  NormalizedReview,
  ReviewChannel,
  ReviewsResponse,
} from "@/lib/reviews/types";
import {
  compactName,
  formatDate,
  formatDecimal,
  formatInteger,
} from "@/lib/format";
import { StarRating } from "@/components/ui/star-rating";
import { PropertyInsights } from "./property-insights";

interface DashboardShellProps {
  initialData: ReviewsResponse;
}

type FilterState = {
  property: string;
  channel: string;
  timeRange: "30d" | "90d" | "6m" | "12m" | "all";
  minRating: number;
  category: string;
  approvedOnly: boolean;
  sort: string;
};

const DEFAULT_FILTERS: FilterState = {
  property: "all",
  channel: "all",
  timeRange: "all",
  minRating: 0,
  category: "all",
  approvedOnly: false,
  sort: "date:desc",
};

const TIME_RANGE_DAYS: Record<FilterState["timeRange"], number | null> = {
  "30d": 30,
  "90d": 90,
  "6m": 182,
  "12m": 365,
  all: null,
};

const TIME_RANGE_LABEL: Record<FilterState["timeRange"], string> = {
  "30d": "30 days",
  "90d": "90 days",
  "6m": "6 months",
  "12m": "12 months",
  all: "All time",
};

const formatCategoryLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (segment) => segment.toUpperCase());

const CHANNEL_LABELS: Record<ReviewChannel, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  google: "Google",
  expedia: "Expedia",
  vrbo: "Vrbo",
  flex: "Flex Living",
  direct: "Direct",
  other: "Other",
};

const NAV_ITEMS: Array<{ label: string; href: string; icon: "dashboard" | "calendar" | "buildings" | "analytics" | "reviews"; active?: boolean }> = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", active: true },
  { label: "Bookings", href: "#", icon: "calendar" },
  { label: "Properties", href: "#", icon: "buildings" },
  { label: "Analytics", href: "#", icon: "analytics" },
  { label: "Reviews", href: "#", icon: "reviews" },
];

const NavIcon = ({ name, active }: { name: "dashboard" | "calendar" | "buildings" | "analytics" | "reviews"; active?: boolean }) => {
  const strokeColor = active ? "currentColor" : "rgba(255,255,255,0.65)";

  switch (name) {
    case "calendar":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5.5" width="17" height="15" rx="3" />
          <path d="M16.5 3.5v4" />
          <path d="M7.5 3.5v4" />
          <path d="M3.5 9.5h17" />
        </svg>
      );
    case "buildings":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20v-9a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v9" />
          <path d="M13 20v-5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v5" />
          <path d="M2 20h20" />
        </svg>
      );
    case "analytics":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19v-8" />
          <path d="M10 19v-4" />
          <path d="M16 19V7" />
          <path d="M22 19V3" />
          <path d="M2 21h20" />
        </svg>
      );
    case "reviews":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 14a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
          <path d="M10 8h6" />
          <path d="M10 12h4" />
        </svg>
      );
    case "dashboard":
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h8v8H3z" />
          <path d="M13 3h8v5h-8z" />
          <path d="M13 12h8v9h-8z" />
          <path d="M3 15h8v6H3z" />
        </svg>
      );
  }
};

const buildQuery = (
  filters: FilterState,
  bounds?: { min?: string | null; max?: string | null },
) => {
  const params = new URLSearchParams();
  params.set("sort", filters.sort);

  if (filters.property !== "all") {
    params.set("listingSlug", filters.property);
  }

  if (filters.channel !== "all") {
    params.set("channel", filters.channel);
  }

  if (filters.category !== "all") {
    params.set("category", filters.category);
    params.set("minCategoryRating", filters.minRating.toString());
  } else if (filters.minRating > 0) {
    params.set("minRating", filters.minRating.toString());
  }

  if (filters.approvedOnly) {
    params.set("approved", "true");
  }

  const range = TIME_RANGE_DAYS[filters.timeRange];
  if (range != null) {
    const reference = bounds?.max ? new Date(bounds.max) : new Date();
    if (Number.isNaN(reference.getTime())) {
      reference.setTime(Date.now());
    }

    const start = new Date(reference);
    start.setDate(start.getDate() - range);

    if (bounds?.min) {
      const minDate = new Date(bounds.min);
      if (!Number.isNaN(minDate.getTime()) && start < minDate) {
        start.setTime(minDate.getTime());
      }
    }

    params.set("startDate", start.toISOString());
    params.set("endDate", reference.toISOString());
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

const computeGlobalTrend = (reviews: NormalizedReview[]) => {
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

const computeSources = (reviews: NormalizedReview[]) => {
  if (!reviews.length) return [];
  const totals = new Map<ReviewChannel, number>();
  reviews.forEach((review) => {
    totals.set(review.channel, (totals.get(review.channel) ?? 0) + 1);
  });
  const overall = reviews.length;
  return Array.from(totals.entries())
    .map(([channel, count]) => ({
      channel,
      label: CHANNEL_LABELS[channel],
      count,
      ratio: Number((count / overall).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count);
};

const computeRecentMentions = (reviews: NormalizedReview[]) => {
  const mentionCandidates = reviews
    .filter((review) => review.publicReview)
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() -
        new Date(a.submittedAt).getTime(),
    );

  return mentionCandidates.slice(0, 4);
};

const highlightColor = (rating: number | null) => {
  if (rating == null) return "text-white/60";
  if (rating >= 4.5) return "text-[var(--flex-primary)]";
  if (rating >= 4) return "text-[var(--flex-accent)]";
  if (rating >= 3) return "text-[var(--flex-warning)]";
  return "text-[var(--flex-danger)]";
};

const kpiValue = (value: number | null) =>
  value == null ? "–" : value.toFixed(1);

const ReviewCard = ({
  review,
  onToggle,
  pending,
}: {
  review: NormalizedReview;
  onToggle: (reviewId: string, approved: boolean) => Promise<void>;
  pending: boolean;
}) => (
  <article className="glass-panel flex flex-col gap-4 p-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-white/50">
          {review.channel.toUpperCase()}
        </p>
        <h4 className="text-lg font-semibold text-white">
          {review.listingName}
        </h4>
      </div>
      <div className="flex items-center gap-4">
        <StarRating value={review.normalizedRating} />
        <span className="text-sm text-white/60">
          {formatDate(review.submittedAt)}
        </span>
      </div>
    </header>
    <div className="space-y-3 text-white/80">
      <p className="text-base leading-relaxed text-white/80">
        {review.publicReview ?? "No public review provided."}
      </p>
      <div className="flex flex-wrap gap-2">
        {review.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60"
          >
            {tag}
          </span>
        ))}
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
          {review.type.replace(/-/g, " ")}
        </span>
      </div>
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-4">
      <div className="text-sm text-white/60">
        Guest: <span className="text-white/80">{compactName(review.guestName)}</span>
      </div>
      <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
        <input
          type="checkbox"
          checked={review.isApproved}
          disabled={pending}
          className="size-4 cursor-pointer accent-[var(--flex-primary)]"
          onChange={() => onToggle(review.id, !review.isApproved)}
        />
        {pending ? "Saving…" : "Show on flexliving.com"}
      </label>
    </footer>
  </article>
);

const TrendChart = ({ data }: { data: { period: string; average: number | null }[] }) => {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-white/50">
        Not enough data for a trend yet.
      </div>
    );
  }

  const points = data.filter((point) => point.average != null);
  if (!points.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-white/50">
        No ratings recorded in this range.
      </div>
    );
  }

  const max = Math.max(...points.map((point) => point.average ?? 0), 5);
  const min = Math.min(...points.map((point) => point.average ?? 0), 0);
  const range = max - min || 1;

  const step = points.length > 1 ? 100 / (points.length - 1) : 100;

  const polyline = points
    .map((point, index) => {
      const x = index * step;
      const y = 100 - (((point.average ?? min) - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="h-40 w-full sm:h-48">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-white/0 p-4"
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,255,186,0.6)" />
            <stop offset="100%" stopColor="rgba(99,255,186,0.08)" />
          </linearGradient>
        </defs>
        <polyline
          fill="url(#trendGradient)"
          stroke="none"
          points={`${polyline} ${points.length > 1 ? `${100},100 0,100` : ""}`}
          opacity="0.4"
        />
        <polyline
          fill="none"
          stroke="rgba(99,255,186,1)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyline}
        />
      </svg>
      <div className="mt-3 flex justify-between text-xs uppercase tracking-[0.2em] text-white/40">
        {points.map((point) => (
          <span key={point.period}>{point.period}</span>
        ))}
      </div>
    </div>
  );
};

const SourcesBreakdown = ({
  data,
}: {
  data: { channel: ReviewChannel; label: string; count: number; ratio: number }[];
}) => {
  if (!data.length) {
    return <p className="text-sm text-white/55">No reviews in range.</p>;
  }

  const maxCount = Math.max(...data.map((source) => source.count));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/40">
        <span>Channel</span>
        <span>Reviews</span>
      </div>
      <div className="space-y-3">
        {data.map((source) => {
          const width = maxCount ? (source.count / maxCount) * 100 : 0;
          return (
            <div key={source.channel} className="space-y-2">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>{source.label}</span>
                <span className="text-white/50 tabular-nums">
                  {formatInteger(source.count)} · {Math.round(source.ratio * 100)}%
                </span>
              </div>
              <svg viewBox="0 0 100 12" className="h-3 w-full">
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="12"
                  fill="rgba(148, 163, 184, 0.15)"
                  rx="6"
                />
                <rect
                  x="0"
                  y="0"
                  width={`${Math.max(width, 6)}`}
                  height="12"
                  fill="var(--flex-primary)"
                  rx="6"
                />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TopProperties = ({
  listings,
  onFocus,
}: {
  listings: ListingReviewSummary[];
  onFocus: (slug: string) => void;
}) => {
  if (!listings.length) {
    return (
      <p className="text-sm text-white/50">No properties match the current filters.</p>
    );
  }

  return (
    <div className="space-y-3">
      {listings.slice(0, 5).map((listing) => (
        <div
          key={listing.listingId}
          className="rounded-2xl border border-white/5 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-white">{listing.listingName}</h4>
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                {formatInteger(listing.totalReviews)} reviews
              </p>
            </div>
            <div className={`text-sm font-semibold ${highlightColor(listing.averageRating)}`}>
              {kpiValue(listing.averageRating)}
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--flex-accent)]"
              style={{
                width: `${Math.min(
                  Math.max((listing.averageRating ?? 0) / 5, 0.05) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-white/55">
            <button
              type="button"
              onClick={() => onFocus(listing.listingSlug)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-white/65 transition hover:border-white/25 hover:text-white"
            >
              Focus in dashboard
            </button>
            <Link
              href={`/properties/${listing.listingSlug}`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-white/65 transition hover:border-white/25 hover:text-white"
            >
              Open property →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

const RecentMentions = ({ reviews }: { reviews: NormalizedReview[] }) => {
  if (!reviews.length) {
    return (
      <p className="text-sm text-white/50">
        No recent mentions in this range. Encourage guests to leave feedback!
      </p>
    );
  }

  const SentimentIcon = ({ variant }: { variant: "positive" | "attention" }) => {
    const stroke = variant === "positive" ? "var(--flex-primary)" : "var(--flex-warning)";
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-1"
      >
        <circle cx="12" cy="12" r="9" strokeOpacity="0.8" />
        {variant === "positive" ? (
          <path d="M8.5 12l2.5 2.5L16 9.5" />
        ) : (
          <>
            <path d="M12 7v5" />
            <path d="M12 16h.01" />
          </>
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="rounded-2xl border border-white/5 bg-white/5 p-4"
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex size-8 items-center justify-center rounded-full ${
                review.normalizedRating && review.normalizedRating >= 4.4
                  ? "bg-[var(--flex-primary)]/15"
                  : "bg-[var(--flex-warning)]/15"
              }`}
            >
              <SentimentIcon
                variant={
                  review.normalizedRating && review.normalizedRating >= 4.4
                    ? "positive"
                    : "attention"
                }
              />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-white/40">
                <span>{formatDate(review.submittedAt)}</span>
                <span>{review.channel}</span>
              </div>
              <p className="mt-2 text-sm text-white/80">
                “{review.publicReview}”
              </p>
              <p className="mt-1 text-xs text-white/40">
                {compactName(review.guestName)} @ {review.listingName}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const SidebarNavigation = () => (
  <aside className="relative flex w-full max-w-full flex-shrink-0 flex-col border-b border-white/10 bg-gradient-to-br from-[#0f172a]/95 to-[#050910]/80 px-4 py-6 shadow-2xl backdrop-blur-2xl sm:px-6 lg:h-screen lg:w-64 lg:border-r lg:border-b-0 lg:rounded-r-[36px]">
    <div className="flex items-center justify-between lg:block">
      <div>
        <p className="text-xs uppercase tracking-[0.36em] text-white/50">Flex Living</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Manager Hub</h2>
      </div>
      <span className="mt-0 rounded-full border border-[var(--flex-primary)] bg-[var(--flex-primary-soft)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--flex-primary)] lg:mt-6">
        v1.0
      </span>
    </div>
    <nav className="mt-8 space-y-2">
      {NAV_ITEMS.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
            item.active
              ? "border-[var(--flex-primary)] bg-[var(--flex-primary-soft)] text-white"
              : "border-transparent bg-white/5 text-white/70 hover:border-white/15 hover:text-white"
          }`}
        >
          <NavIcon name={item.icon} active={item.active} />
          {item.label}
        </a>
      ))}
    </nav>
    <div className="mt-auto hidden rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/60 lg:block">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">Support</p>
      <p className="mt-2">
        Curate reviews, update pricing, and sync channel feedback in one workspace.
      </p>
    </div>
  </aside>
);

const MetricCard = ({
  label,
  value,
  helper,
  trend,
}: {
  label: string;
  value: string;
  helper?: string;
  trend?: string;
}) => (
  <div className="metric-card relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-[var(--flex-primary)]/12 via-transparent to-transparent" />
    <div className="relative">
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</p>
      <h3 className="mt-2 text-4xl font-semibold text-white">{value}</h3>
      {helper ? (
        <p className="mt-4 text-sm text-white/65">{helper}</p>
      ) : null}
      {trend ? (
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--flex-primary)]">
          {trend}
        </p>
      ) : null}
    </div>
  </div>
);

const Select = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) => (
  <label className="flex min-w-0 flex-col gap-2 text-xs uppercase tracking-[0.18em] text-white/55">
    <span>{label}</span>
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-medium text-white/85 shadow-sm transition focus:border-[var(--flex-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--flex-primary)]/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/50">
        ▾
      </span>
    </div>
  </label>
);

const RatingSlider = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm">
    <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/60">
      <span>Min rating</span>
      <span className="text-white/70">{value.toFixed(1)}</span>
    </div>
    <input
      type="range"
      min={0}
      max={5}
      step={0.1}
      value={value}
      onChange={(event) => onChange(Number.parseFloat(event.target.value))}
      className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--flex-primary)]"
    />
  </div>
);

export default function DashboardShell({ initialData }: DashboardShellProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [data, setData] = useState<ReviewsResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [refreshNonce, setRefreshNonce] = useState(0);
  const mounted = useRef(false);

  const datasetBounds = useMemo(
    () => ({
      min: initialData.metrics.overall.dateRange.from,
      max: initialData.metrics.overall.dateRange.to,
    }),
    [
      initialData.metrics.overall.dateRange.from,
      initialData.metrics.overall.dateRange.to,
    ],
  );

  const propertyOptions = useMemo(
    () => [
      { value: "all", label: "All properties" },
      ...initialData.listings.map((listing) => ({
        value: listing.listingSlug,
        label: listing.listingName,
      })),
    ],
    [initialData.listings],
  );

  const channelOptions = useMemo(
    () => [
      { value: "all", label: "All channels" },
      ...initialData.meta.filters.channels.map((channel) => ({
        value: channel,
        label: CHANNEL_LABELS[channel],
      })),
    ],
    [initialData.meta.filters.channels],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "Any category" },
      ...initialData.meta.filters.categories.map((category) => ({
        value: category,
        label: formatCategoryLabel(category),
      })),
    ],
    [initialData.meta.filters.categories],
  );

  const trend = useMemo(
    () => computeGlobalTrend(data.reviews),
    [data.reviews],
  );

  const reviewSources = useMemo(
    () => computeSources(data.reviews),
    [data.reviews],
  );

  const recentMentions = useMemo(
    () => computeRecentMentions(data.reviews),
    [data.reviews],
  );

  const focusedListing = useMemo(() => {
    if (filters.property !== "all") {
      return data.listings.find(
        (listing) => listing.listingSlug === filters.property,
      );
    }
    return data.listings[0];
  }, [filters.property, data.listings]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/reviews/hostaway${buildQuery(filters, datasetBounds)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }
        const payload: ReviewsResponse = await response.json();
        setData(payload);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          console.error(fetchError);
          setError("Unable to load the latest reviews. Please retry.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [filters, refreshNonce, datasetBounds]);

  const handleToggleApproved = async (reviewId: string, approved: boolean) => {
    setPending((state) => ({ ...state, [reviewId]: true }));
    setError(null);

    try {
      const response = await fetch("/api/reviews/hostaway/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, approved }),
      });
      if (!response.ok) {
        throw new Error(`Approval update failed with ${response.status}`);
      }
      setRefreshNonce((count) => count + 1);
    } catch (saveError) {
      console.error(saveError);
      setError("Could not update approval status. Please try again.");
    } finally {
      setPending((state) => {
        const next = { ...state };
        delete next[reviewId];
        return next;
      });
    }
  };

  const filterSetter =
    <K extends keyof FilterState>(key: K) =>
    (value: FilterState[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value }));

  const summary = data.metrics.filtered;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--flex-bg)] text-[var(--flex-text)] lg:flex-row">
      <SidebarNavigation />
      <div className="flex-1 px-4 py-8 sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Flex Living
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-white md:text-5xl">
            Reviews Intelligence Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Track guest sentiment across channels, identify at-risk properties, and
            handpick the stories you want to showcase on the Flex Living website.
          </p>
        </div>
        <Link
          href="/properties/shoreditch-heights-a"
          className="inline-flex w-full items-center justify-center rounded-full border border-[var(--flex-primary)] bg-[var(--flex-primary-soft)] px-6 py-3 text-sm font-medium text-[var(--flex-primary)] transition hover:border-[var(--flex-primary-strong)] hover:bg-[var(--flex-primary-strong)]/20 sm:w-auto"
        >
          View sample property page →
        </Link>
          </div>

          <section className="glass-panel p-5 sm:p-6 md:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Property"
            value={filters.property}
            onChange={(value) => filterSetter("property")(value as FilterState["property"])}
            options={propertyOptions}
          />
          <Select
            label="Channel"
            value={filters.channel}
            onChange={(value) => filterSetter("channel")(value as FilterState["channel"])}
            options={channelOptions}
          />
          <Select
            label="Category focus"
            value={filters.category}
            onChange={(value) => filterSetter("category")(value as FilterState["category"])}
            options={categoryOptions}
          />
          <Select
            label="Time window"
            value={filters.timeRange}
            onChange={(value) => filterSetter("timeRange")(value as FilterState["timeRange"])}
            options={Object.entries(TIME_RANGE_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-[1fr_auto_auto_auto] md:gap-6">
          <RatingSlider
            value={filters.minRating}
            onChange={(value) => filterSetter("minRating")(value)}
          />
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/60 shadow-sm">
            <span>Show only approved</span>
            <input
              type="checkbox"
              checked={filters.approvedOnly}
              onChange={(event) => filterSetter("approvedOnly")(event.target.checked)}
              className="size-5 accent-[var(--flex-primary)]"
            />
          </label>
          <Select
            label="Sort"
            value={filters.sort}
            onChange={(value) => filterSetter("sort")(value as FilterState["sort"])}
            options={[
              { value: "date:desc", label: "Newest first" },
              { value: "date:asc", label: "Oldest first" },
              { value: "rating:desc", label: "Rating (high → low)" },
              { value: "rating:asc", label: "Rating (low → high)" },
              { value: "listing:asc", label: "Property name (A → Z)" },
            ]}
          />
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setRefreshNonce((count) => count + 1);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:border-white/20 hover:text-white/85 sm:w-auto"
            >
              Reset
            </button>
          </div>
        </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label="Average rating"
          value={summary.averageRating == null ? "–" : formatDecimal(summary.averageRating)}
          helper="Weighted by channel mix in the selected filters."
          trend={
            reviewSources.length
              ? `${formatInteger(summary.totalReviews)} reviews`
              : undefined
          }
        />
        <MetricCard
          label="Approved for web"
          value={`${formatInteger(summary.approvedReviews)} / ${formatInteger(summary.totalReviews)}`}
          helper="Controls the reviews surfaced on each Flex Living property page."
        />
        <MetricCard
          label="Listings in focus"
          value={formatInteger(data.listings.length)}
        />
        <MetricCard
          label="Date range"
          value={`${formatDate(summary.dateRange.from)} → ${formatDate(summary.dateRange.to)}`}
        />
          </section>

          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="glass-panel p-5 sm:p-6 md:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Trendline
              </p>
              <h2 className="text-2xl font-semibold text-white">
                Guest sentiment over time
              </h2>
            </div>
            <div className="text-right text-sm text-white/55">
              <p>
                Peak this range:{" "}
                <span className="text-white/80">
                  {formatDecimal(
                    trend.reduce<number | null>((peak, point) => {
                      if (point.average == null) return peak;
                      if (peak == null) return point.average;
                      return Math.max(peak, point.average);
                    }, null),
                  )}
                </span>
              </p>
            </div>
          </header>
          <div className="mt-6">
            <TrendChart data={trend} />
          </div>
            </div>
            <div className="space-y-6">
              <div className="glass-panel p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Review sources
            </p>
            <h3 className="mt-1 text-xl font-semibold text-white">
              Channel distribution
            </h3>
            <div className="mt-4">
              <SourcesBreakdown data={reviewSources} />
            </div>
          </div>
              <div className="glass-panel p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Highlights
            </p>
            <h3 className="mt-1 text-xl font-semibold text-white">
              Recent mentions
            </h3>
            <div className="mt-4">
              <RecentMentions reviews={recentMentions} />
            </div>
          </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="glass-panel flex flex-col gap-6 p-5 sm:p-6 md:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Review approvals
              </p>
              <h2 className="text-2xl font-semibold text-white">
                Control what appears on the Flex Living site
              </h2>
            </div>
            <p className="max-w-sm text-sm text-white/55">
              Toggle a review to curate the public feed. Changes take effect
              immediately on the property page in this environment.
            </p>
          </header>
          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="flex min-h-[160px] items-center justify-center text-sm text-white/60">
              Loading fresh insights…
            </div>
          ) : data.reviews.length ? (
            <div className="grid gap-4">
              {data.reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onToggle={handleToggleApproved}
                  pending={Boolean(pending[review.id])}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-white/5 px-8 py-12 text-center text-sm text-white/60">
              No reviews match the current filters. Try expanding the time window
              or adjusting the minimum rating.
            </div>
          )}
        </div>

            <div className="flex h-fit flex-col gap-6">
          <PropertyInsights listing={focusedListing} />
              <div className="glass-panel flex flex-col gap-6 p-5 sm:p-6 md:p-8">
            <header>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Top properties
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                Highest guest sentiment
              </h2>
            </header>
            <TopProperties
              listings={data.listings}
              onFocus={(slug) => filterSetter("property")(slug as FilterState["property"])}
            />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
