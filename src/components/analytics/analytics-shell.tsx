"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReviewChannel, ReviewsResponse } from "@/lib/reviews/types";
import { formatDecimal, formatInteger } from "@/lib/format";
import {
  computeCategoryBreakdown,
  computeChannelDistribution,
  computeGlobalTrend,
  computeRecurringIssues,
  formatIssueLabel,
} from "@/lib/reviews/analytics";
import { SidebarNavigation } from "@/components/dashboard/sidebar-navigation";

interface AnalyticsShellProps {
  initialData: ReviewsResponse;
}

type TimeRange = "30d" | "90d" | "6m" | "12m" | "all";

const TIME_RANGE_DAYS: Record<TimeRange, number | null> = {
  "30d": 30,
  "90d": 90,
  "6m": 182,
  "12m": 365,
  all: null,
};

const TIME_RANGE_LABEL: Record<TimeRange, string> = {
  "30d": "30 days",
  "90d": "90 days",
  "6m": "6 months",
  "12m": "12 months",
  all: "All time",
};

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

const channelPalette: Record<ReviewChannel, string> = {
  airbnb: "#FF385C",
  booking: "#003580",
  google: "#34A853",
  expedia: "#F97316",
  vrbo: "#2563EB",
  flex: "#63FFBA",
  direct: "#22d3ee",
  other: "#94a3b8",
};

const TrendChart = ({ data }: { data: { period: string; average: number | null }[] }) => {
  if (!data.length) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-white/50 sm:h-60">
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
    <div className="h-60 w-full sm:h-64">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/0 p-5 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.9)]"
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
          opacity="0.45"
        />
        <polyline
          fill="none"
          stroke="rgba(99,255,186,1)"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyline}
        />
      </svg>
      <div className="mt-3 flex justify-between text-xs uppercase tracking-[0.18em] text-white/45">
        {points.map((point) => (
          <span key={point.period}>{point.period}</span>
        ))}
      </div>
    </div>
  );
};

const CategoryBarChart = ({
  categories,
}: {
  categories: { key: string; label: string; average: number | null; count: number }[];
}) => {
  if (!categories.length) {
    return <p className="text-sm text-white/55">No category data available for this selection.</p>;
  }

  const topCategories = categories.slice(0, 6);

  return (
    <div className="space-y-5">
      {topCategories.map((category) => (
        <div key={category.key} className="space-y-2">
          <div className="flex items-center justify-between text-sm font-semibold text-white/80">
            <span className="uppercase tracking-[0.18em] text-white/50">{category.label}</span>
            <span className="tabular-nums text-white/60">
              {category.average == null ? "–" : category.average.toFixed(1)} / 5
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--flex-primary)] to-[var(--flex-accent)]"
              style={{ width: `${Math.min(((category.average ?? 0) / 5) * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const IssueCloud = ({ issues }: { issues: { tag: string; count: number }[] }) => {
  if (!issues.length) {
    return <p className="text-sm text-white/55">No recurring guest themes detected yet.</p>;
  }

  const topIssues = issues.slice(0, 12);
  const maxCount = Math.max(...topIssues.map((issue) => issue.count));

  return (
    <div className="flex flex-wrap gap-3">
      {topIssues.map((issue) => {
        const weight = maxCount ? issue.count / maxCount : 0;
        const fontSize = 0.95 + weight * 0.65;
        const opacity = 0.6 + weight * 0.35;
        return (
          <span
            key={issue.tag}
            className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white transition hover:border-[var(--flex-primary)]/40 hover:bg-[var(--flex-primary)]/15"
            style={{
              fontSize: `${fontSize}rem`,
              opacity,
            }}
          >
            {formatIssueLabel(issue.tag)}
          </span>
        );
      })}
    </div>
  );
};

const ChannelPieChart = ({
  distribution,
}: {
  distribution: { channel: ReviewChannel; count: number; ratio: number }[];
}) => {
  if (!distribution.length) {
    return <p className="text-sm text-white/55">No channel mix to visualise.</p>;
  }

  const slices = distribution.map((entry) => ({
    ...entry,
    color: channelPalette[entry.channel] ?? "#94a3b8",
  }));

  const gradient = slices
    .map((slice, index) => {
      const startRatio = slices.slice(0, index).reduce((acc, current) => acc + current.ratio, 0);
      const endRatio = startRatio + slice.ratio;
      return `${slice.color} ${Math.round(startRatio * 100)}% ${Math.round(endRatio * 100)}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
      <div className="mx-auto flex w-full max-w-xs flex-col items-center md:mx-0">
        <div
          className="relative aspect-square w-full rounded-full border border-white/15 bg-white/10 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.8)]"
          style={{
            backgroundImage: `conic-gradient(${gradient})`,
          }}
        >
          <div className="absolute inset-[18%] rounded-full bg-[#0b1221]" />
          <div className="absolute inset-[37%] flex items-center justify-center rounded-full bg-transparent text-sm font-semibold uppercase tracking-[0.22em] text-white">
            Mix
          </div>
        </div>
      </div>
      <ul className="flex-1 space-y-3 text-sm text-white/75 w-full">
        {slices.map((slice) => (
          <li
            key={slice.channel}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span className="flex items-center gap-3 text-base font-semibold">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {CHANNEL_LABELS[slice.channel]}
            </span>
            <span className="tabular-nums text-white/60">
              {formatInteger(slice.count)} · {Math.round(slice.ratio * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) => (
  <div className="metric-card relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-[var(--flex-primary)]/18 via-transparent to-transparent" />
    <div className="relative">
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</p>
      <h3 className="mt-2 text-4xl font-semibold text-white sm:text-5xl">{value}</h3>
      {helper ? <p className="mt-4 text-sm text-white/65 sm:text-base">{helper}</p> : null}
    </div>
  </div>
);

export function AnalyticsShell({ initialData }: AnalyticsShellProps) {
  const [property, setProperty] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [navOpen, setNavOpen] = useState(false);

  const datasetBounds = useMemo(
    () => ({
      min: initialData.metrics.overall.dateRange.from,
      max: initialData.metrics.overall.dateRange.to,
    }),
    [initialData.metrics.overall.dateRange.from, initialData.metrics.overall.dateRange.to],
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
      ...initialData.meta.filters.channels.map((option) => ({
        value: option,
        label: CHANNEL_LABELS[option],
      })),
    ],
    [initialData.meta.filters.channels],
  );

  const filteredReviews = useMemo(() => {
    const reviews = initialData.reviews.filter((review) => {
      if (property !== "all" && review.listingSlug !== property) return false;
      if (channel !== "all" && review.channel !== channel) return false;

      const range = TIME_RANGE_DAYS[timeRange];
      if (range != null && datasetBounds.max) {
        const reference = new Date(datasetBounds.max);
        const start = new Date(reference);
        start.setDate(start.getDate() - range);
        const submitted = new Date(review.submittedAt);
        if (Number.isNaN(submitted.getTime()) || submitted < start || submitted > reference) {
          return false;
        }
      }

      return true;
    });

    return reviews;
  }, [initialData.reviews, property, channel, timeRange, datasetBounds.max]);

  const trend = useMemo(
    () => computeGlobalTrend(filteredReviews),
    [filteredReviews],
  );

  const categoryBreakdown = useMemo(
    () => computeCategoryBreakdown(filteredReviews),
    [filteredReviews],
  );

  const recurringIssues = useMemo(
    () => computeRecurringIssues(filteredReviews),
    [filteredReviews],
  );

  const channelDistribution = useMemo(
    () => computeChannelDistribution(filteredReviews),
    [filteredReviews],
  );

  const averageRating = useMemo(() => {
    const ratings = filteredReviews
      .map((review) => review.normalizedRating)
      .filter((rating): rating is number => rating != null);
    if (!ratings.length) return null;
    const total = ratings.reduce((sum, rating) => sum + rating, 0);
    return total / ratings.length;
  }, [filteredReviews]);

  const activeProperties = useMemo(() => {
    const unique = new Set(filteredReviews.map((review) => review.listingSlug));
    return unique.size;
  }, [filteredReviews]);

  const activeChannels = useMemo(() => {
    const unique = new Set(filteredReviews.map((review) => review.channel));
    return unique.size;
  }, [filteredReviews]);

  useEffect(() => {
    if (!navOpen) {
      document.body.classList.remove("overflow-hidden");
      return;
    }
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [navOpen]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
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

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[var(--flex-bg)] text-[var(--flex-text)] lg:flex-row">
      <SidebarNavigation active="analytics" isOpen={navOpen} onClose={() => setNavOpen(false)} />
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
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Flex Living
              </p>
              <h1 className="mt-2 text-4xl font-semibold text-white md:text-5xl">
                Analytics
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/60">
                Deep dive into sentiment trends, channel performance, and hotspots that need
                attention across the Flex Living portfolio.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white md:w-auto"
            >
              Back to reviews →
            </Link>
          </header>

          <section className="glass-panel p-5 sm:p-6 md:p-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect
                label="Property"
                value={property}
                onChange={setProperty}
                options={propertyOptions}
              />
              <FilterSelect
                label="Channel"
                value={channel}
                onChange={setChannel}
                options={channelOptions}
              />
              <FilterSelect
                label="Time window"
                value={timeRange}
                onChange={(value) => setTimeRange(value as TimeRange)}
                options={Object.entries(TIME_RANGE_LABEL).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setProperty("all");
                    setChannel("all");
                    setTimeRange("all");
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:border-white/20 hover:text-white/85 sm:w-auto"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Avg rating"
              value={averageRating == null ? "–" : formatDecimal(averageRating)}
              helper="Across the filtered review set."
            />
            <MetricCard
              label="Reviews"
              value={formatInteger(filteredReviews.length)}
              helper="Total feedback points analysed."
            />
            <MetricCard
              label="Active properties"
              value={formatInteger(activeProperties)}
              helper="Listings contributing to this data."
            />
            <MetricCard
              label="Active channels"
              value={formatInteger(activeChannels)}
              helper="Booking sources represented."
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-1 xl:grid-cols-[1.6fr_1fr]">
            <div className="glass-panel min-w-0 p-5 sm:p-6 md:p-8">
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
                    Peak in view:{" "}
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
            <div className="glass-panel min-w-0 p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Channel mix
              </p>
              <h3 className="mt-1 text-xl font-semibold text-white">
                Bookings by source
              </h3>
              <div className="mt-4">
                <ChannelPieChart distribution={channelDistribution} />
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-1 xl:grid-cols-[1.4fr_1fr]">
            <div className="glass-panel min-w-0 p-5 sm:p-6 md:p-8">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Category performance
                  </p>
                  <h2 className="text-2xl font-semibold text-white">
                    Quality touchpoints
                  </h2>
                </div>
                <p className="max-w-sm text-sm text-white/55">
                  Average category ratings across the filtered reviews. Prioritise the rows at the
                  bottom if ratings slip below 4.0.
                </p>
              </header>
              <div className="mt-6">
                <CategoryBarChart categories={categoryBreakdown} />
              </div>
            </div>
            <div className="glass-panel min-w-0 p-5 sm:p-6 md:p-8">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Recurring issues
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    What guests mention most
                  </h2>
                </div>
              </header>
              <div className="mt-5">
                <IssueCloud issues={recurringIssues} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const FilterSelect = ({
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
  <label className="flex min-w-0 flex-col gap-2 text-xs uppercase tracking-[0.18em] text-white/55 w-full">
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
