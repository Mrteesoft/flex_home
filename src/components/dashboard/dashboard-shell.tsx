"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  ListingReviewSummary,
  NormalizedReview,
  ReviewChannel,
  ReviewsResponse,
} from "@/lib/reviews/types";
import { compactName, formatDate, formatDecimal, formatInteger } from "@/lib/format";
import { StarRating } from "@/components/ui/star-rating";
import { PropertyInsights } from "./property-insights";
import { SidebarNavigation } from "./sidebar-navigation";
import { computeCategoryBreakdown } from "@/lib/reviews/analytics";

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

const highlightColor = (rating: number | null) => {
  if (rating == null) return "text-white/60";
  if (rating >= 4.5) return "text-[var(--flex-primary)]";
  if (rating >= 4) return "text-[var(--flex-accent)]";
  if (rating >= 3) return "text-[var(--flex-warning)]";
  return "text-[var(--flex-danger)]";
};

const kpiValue = (value: number | null) =>
  value == null ? "–" : value.toFixed(1);

const truncate = (value: string, limit = 120) => {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trimEnd()}…`;
};

const ReviewsTable = ({
  reviews,
  onToggle,
  pendingMap,
}: {
  reviews: NormalizedReview[];
  onToggle: (reviewId: string, approved: boolean) => Promise<void>;
  pendingMap: Record<string, boolean>;
}) => {
  if (!reviews.length) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-white/5 px-8 py-12 text-center text-sm text-white/60">
        No reviews match the current filters. Try expanding the time window
        or adjusting the minimum rating.
      </div>
    );
  }

  return (
    <div className="subtle-scrollbar overflow-x-auto rounded-3xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-sm text-white/70">
        <thead className="bg-white/5 text-[0.65rem] uppercase tracking-[0.3em] text-white/35">
          <tr>
            <th scope="col" className="px-5 py-3 text-left font-medium">Property</th>
            <th scope="col" className="px-5 py-3 text-left font-medium">Rating</th>
            <th scope="col" className="px-5 py-3 text-left font-medium">Category</th>
            <th scope="col" className="px-5 py-3 text-left font-medium">Channel</th>
            <th scope="col" className="px-5 py-3 text-left font-medium">Date</th>
            <th scope="col" className="px-5 py-3 text-left font-medium text-center">Show</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-sm">
          {reviews.map((review) => {
            const significantCategory = [...review.categoryRatings]
              .filter((category) => category.normalizedRating != null)
              .sort(
                (a, b) =>
                  (b.normalizedRating ?? Number.NEGATIVE_INFINITY) -
                  (a.normalizedRating ?? Number.NEGATIVE_INFINITY),
              )[0];

            const isPending = Boolean(pendingMap[review.id]);

            return (
              <tr
                key={review.id}
                className="bg-transparent transition hover:bg-white/5"
              >
                <td className="max-w-[260px] px-5 py-4 align-top">
                  <div className="font-medium text-white">{review.listingName}</div>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">
                    {review.publicReview
                      ? `“${truncate(review.publicReview, 140)}”`
                      : "No public review provided."}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {review.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.26em] text-white/40"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-col gap-2">
                    <StarRating value={review.normalizedRating} size={16} showValue={false} />
                    <span className={`text-sm font-semibold tabular-nums ${highlightColor(review.normalizedRating)}`}>
                      {review.normalizedRating == null
                        ? "–"
                        : review.normalizedRating.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  {significantCategory ? (
                    <div>
                      <p className="font-medium text-white/80">{significantCategory.label}</p>
                      <p className="text-xs text-white/40">
                        {significantCategory.normalizedRating?.toFixed(1) ?? "–"} / 5
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/40">No category data</p>
                  )}
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex items-center gap-2 text-white/70">
                    <span className="size-2 rounded-full bg-[var(--flex-primary)]/70" />
                    <span className="text-sm">
                      {CHANNEL_LABELS[review.channel]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/30">
                    {review.type.replace(/-/g, " ")}
                  </p>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="text-sm text-white/80">{formatDate(review.submittedAt)}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {compactName(review.guestName)}
                  </p>
                </td>
                <td className="px-5 py-4 align-top">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.6rem] uppercase tracking-[0.3em] text-white/50 transition hover:border-white/25 hover:text-white">
                    <input
                      type="checkbox"
                      checked={review.isApproved}
                      disabled={isPending}
                      onChange={() => onToggle(review.id, !review.isApproved)}
                      className="size-4 accent-[var(--flex-primary)]"
                    />
                    {isPending ? "Saving" : review.isApproved ? "Listed" : "Hidden"}
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const ReviewsMobileList = ({
  reviews,
  onToggle,
  pendingMap,
}: {
  reviews: NormalizedReview[];
  onToggle: (reviewId: string, approved: boolean) => Promise<void>;
  pendingMap: Record<string, boolean>;
}) => {
  if (!reviews.length) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-white/5 px-8 py-12 text-center text-sm text-white/60 md:hidden">
        No reviews match the current filters. Try expanding the time window or adjusting
        the minimum rating.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:hidden">
      {reviews.map((review) => {
        const isPending = Boolean(pendingMap[review.id]);
        const topCategory = [...review.categoryRatings]
          .filter((category) => category.normalizedRating != null)
          .sort(
            (a, b) =>
              (b.normalizedRating ?? Number.NEGATIVE_INFINITY) -
              (a.normalizedRating ?? Number.NEGATIVE_INFINITY),
          )[0];

        return (
          <article
            key={review.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.9)]"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                  {CHANNEL_LABELS[review.channel]}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">{review.listingName}</h3>
              </div>
              <div className="text-right text-sm text-white/55">
                <p>{formatDate(review.submittedAt)}</p>
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                  {review.type.replace(/-/g, " ")}
                </p>
              </div>
            </header>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <StarRating value={review.normalizedRating} size={16} showValue={false} />
                <span className={`text-sm font-semibold ${highlightColor(review.normalizedRating)}`}>
                  {review.normalizedRating == null ? "–" : review.normalizedRating.toFixed(1)}
                </span>
              </div>
              <p className="leading-relaxed text-white/75">
                {review.publicReview
                  ? `“${truncate(review.publicReview, 160)}”`
                  : "No public review provided."}
              </p>
              {topCategory ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.26em] text-white/40">
                  {topCategory.label} · {topCategory.normalizedRating?.toFixed(1) ?? "–"} / 5
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {review.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-[0.26em] text-white/40"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <footer className="mt-4 flex flex-col gap-3">
              <div className="text-xs uppercase tracking-[0.26em] text-white/35">
                Guest · <span className="text-white/60">{compactName(review.guestName)}</span>
              </div>
              <button
                type="button"
                onClick={() => onToggle(review.id, !review.isApproved)}
                disabled={isPending}
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${
                  review.isApproved
                    ? "border-[var(--flex-primary)] bg-[var(--flex-primary-soft)] text-[var(--flex-primary)] hover:border-[var(--flex-primary-strong)] hover:text-[var(--flex-primary-strong)]"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white"
                } ${isPending ? "opacity-70" : ""}`}
              >
                {isPending ? "Saving…" : review.isApproved ? "Listed" : "Hidden"}
              </button>
            </footer>
          </article>
        );
      })}
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

const SearchInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <div className="relative w-full text-xs uppercase tracking-[0.18em] text-white/55 sm:w-auto lg:w-[260px]">
    <span className="sr-only">Search reviews</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-white/12 bg-white/10 px-4 py-3 pr-10 text-sm font-medium text-white/85 shadow-sm transition placeholder:text-white/30 focus:border-[var(--flex-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--flex-primary)]/40"
      type="search"
    />
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute inset-y-0 right-4 my-auto"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 3 3" />
    </svg>
  </div>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
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

  const filteredReviews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data.reviews;

    return data.reviews.filter((review) => {
      const haystack = [
        review.listingName,
        review.channel,
        review.publicReview ?? "",
        review.privateReview ?? "",
        review.guestName ?? "",
        review.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return query.split(/\s+/).every((term) => haystack.includes(term));
    });
  }, [data.reviews, searchQuery]);

  const categoryBreakdown = useMemo(
    () => computeCategoryBreakdown(filteredReviews),
    [filteredReviews],
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

  useEffect(() => {
    if (navOpen) {
      document.body.classList.add("overflow-hidden");
      return () => {
        document.body.classList.remove("overflow-hidden");
      };
    }
    document.body.classList.remove("overflow-hidden");
    return undefined;
  }, [navOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setNavOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!navOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navOpen]);

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
    <div className="flex min-h-screen bg-[var(--flex-bg)] text-[var(--flex-text)] lg:flex-row">
      <SidebarNavigation active="dashboard" isOpen={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <div className="flex min-h-screen flex-1 flex-col px-4 pb-10 pt-6 sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-8">
          <div className="flex items-center justify-between lg:hidden">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:text-white"
              aria-label="Open navigation menu"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
              Menu
            </button>
            <span className="text-sm uppercase tracking-[0.3em] text-white/40">
              Flex Living
            </span>
          </div>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <p className="hidden text-xs uppercase tracking-[0.3em] text-white/40 md:block">
                Flex Living
              </p>
              <h1 className="text-4xl font-semibold text-white md:text-5xl">Reviews</h1>
              <p className="max-w-2xl text-sm text-white/60">
                Monitor guest sentiment across every channel, respond with context, and
                spotlight the stories that matter most.
              </p>
            </div>
            <Link
              href="/properties/shoreditch-heights-a"
              className="inline-flex w-full items-center justify-center rounded-full border border-[var(--flex-primary)] bg-[var(--flex-primary-soft)] px-6 py-3 text-sm font-medium text-[var(--flex-primary)] transition hover:border-[var(--flex-primary-strong)] hover:bg-[var(--flex-primary-strong)]/20 md:w-auto"
            >
              View sample property page →
            </Link>
          </div>

          <section className="glass-panel p-5 sm:p-6 md:p-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search reviews or guests"
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
                setSearchQuery("");
                setRefreshNonce((count) => count + 1);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:border-white/20 hover:text-white/85 sm:w-auto"
            >
              Reset
            </button>
          </div>
        </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Avg rating"
              value={
                summary.averageRating == null ? "–" : formatDecimal(summary.averageRating)
              }
              helper="Weighted by channel mix in the selected filters."
              trend={
                summary.approvedReviews
                  ? `${Math.round((summary.approvedReviews / summary.totalReviews) * 100)}% approved`
                  : undefined
              }
            />
            <MetricCard
              label="Categories"
              value={formatInteger(categoryBreakdown.length)}
              helper="Guest touchpoints captured across reviews."
            />
            <MetricCard
              label="Reviews"
              value={formatInteger(summary.totalReviews)}
              helper="All feedback in the active time window."
              trend={
                summary.dateRange.from && summary.dateRange.to
                  ? `${formatDate(summary.dateRange.from)} → ${formatDate(summary.dateRange.to)}`
                  : undefined
              }
            />
          </section>

          <section className="flex flex-col gap-6">
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
              ) : (
                <>
                  <ReviewsMobileList
                    reviews={filteredReviews}
                    onToggle={handleToggleApproved}
                    pendingMap={pending}
                  />
                  <div className="hidden md:block">
                    <ReviewsTable
                      reviews={filteredReviews}
                      onToggle={handleToggleApproved}
                      pendingMap={pending}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
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
