import Link from "next/link";
import type { ListingReviewSummary } from "@/lib/reviews/types";
import { formatDate, formatDecimal, formatInteger } from "@/lib/format";
import { StarRating } from "../ui/star-rating";

const channelAccent: Record<string, string> = {
  airbnb: "bg-gradient-to-r from-[#FF385C]/70 to-[#FF385C]/40",
  booking: "bg-gradient-to-r from-[#003580]/70 to-[#0069ff]/40",
  google: "bg-gradient-to-r from-[#34A853]/70 to-[#B7F5CF]/40",
  expedia: "bg-gradient-to-r from-[#FEC84B]/80 to-[#F97316]/40",
  flex: "bg-gradient-to-r from-[var(--flex-primary)]/80 to-[var(--flex-primary)]/30",
  direct: "bg-gradient-to-r from-[#22d3ee]/70 to-[#818cf8]/40",
  vrbo: "bg-gradient-to-r from-[#2563EB]/70 to-[#38BDF8]/40",
  other: "bg-gradient-to-r from-white/30 to-white/10",
};

const sentimentBadge = (rating: number | null) => {
  if (rating == null) return "border-white/10 bg-white/5 text-white/70";
  if (rating >= 4.6) {
    return "border-[var(--flex-primary)]/40 bg-[var(--flex-primary-soft)] text-[var(--flex-primary)]";
  }
  if (rating >= 4.2) {
    return "border-[var(--flex-accent)]/45 bg-[var(--flex-accent)]/20 text-[var(--flex-accent)]";
  }
  if (rating >= 3.8) {
    return "border-[var(--flex-warning)]/40 bg-[var(--flex-warning)]/20 text-[var(--flex-warning)]";
  }
  return "border-[var(--flex-danger)]/40 bg-[var(--flex-danger)]/20 text-[var(--flex-danger)]";
};

const ratioWidth = (ratio: number) =>
  `${Math.min(Math.max(ratio * 100, ratio > 0 ? 6 : 0), 100)}%`;

const normaliseCategory = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (segment) => segment.toUpperCase());

export function PropertyInsights({
  listing,
}: {
  listing?: ListingReviewSummary;
}) {
  if (!listing) {
    return (
      <div className="glass-panel p-6 md:p-7">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">
          Property focus
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">
          Filter to a property to unlock deeper insights.
        </h3>
        <p className="mt-3 text-sm text-white/60">
          Choose a property from the filters above or tap a tile in the “Top
          properties” list to drill into sentiment, channels, and recurring
          themes.
        </p>
      </div>
    );
  }

  const weakestCategories = [...listing.categoryAverages]
    .filter((category) => category.normalizedAverage != null)
    .sort(
      (a, b) =>
        (a.normalizedAverage ?? Number.POSITIVE_INFINITY) -
        (b.normalizedAverage ?? Number.POSITIVE_INFINITY),
    )
    .slice(0, 2);

  const strongestCategories = [...listing.categoryAverages]
    .filter((category) => category.normalizedAverage != null)
    .sort(
      (a, b) =>
        (b.normalizedAverage ?? Number.NEGATIVE_INFINITY) -
        (a.normalizedAverage ?? Number.NEGATIVE_INFINITY),
    )
    .slice(0, 2);

  const callout =
    weakestCategories.length &&
    (weakestCategories[0]?.normalizedAverage ?? 5) < 4
      ? `Flag: ${normaliseCategory(weakestCategories[0]!.category)} trending at ${formatDecimal(
          weakestCategories[0]!.normalizedAverage,
        )}/5`
      : `Holding strong across ${formatInteger(listing.totalReviews)} reviews.`;

  return (
    <div className="glass-panel flex flex-col gap-6 p-6 md:p-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Property focus
          </p>
          <h2 className="text-2xl font-semibold text-white">
            {listing.listingName}
          </h2>
          <p className="mt-2 text-sm text-white/55">{callout}</p>
        </div>
        <Link
          href={`/properties/${listing.listingSlug}`}
          className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-center text-xs uppercase tracking-[0.18em] text-white/70 transition hover:border-white/35 hover:text-white sm:w-auto"
        >
          View property →
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Avg rating
          </p>
          <div className="mt-3 flex items-end gap-3">
            <StarRating value={listing.averageRating ?? null} showValue={false} />
            <span className="text-2xl font-semibold">
              {formatDecimal(listing.averageRating)}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Approved live
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {formatInteger(listing.approvedReviews)} /{" "}
            {formatInteger(listing.totalReviews)}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {listing.approvedReviews
              ? Math.round((listing.approvedReviews / listing.totalReviews) * 100)
              : 0}
            % of reviews showcased
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Last review
          </p>
          <p className="mt-3 text-lg font-medium text-white">
            {formatDate(listing.lastReviewDate)}
          </p>
          <p className="mt-1 text-xs text-white/50">Rolling 12-month trendline</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/40">
          Channel mix
        </p>
        <div className="mt-4 space-y-3">
          {listing.channels.length ? (
            listing.channels.map((channel) => (
              <div key={channel.channel} className="space-y-1">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span className="capitalize">{channel.label}</span>
                  <span className="text-white/50">
                    {formatInteger(channel.count)} (
                      {Math.round(channel.ratio * 100)}
                    %)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${channelAccent[channel.channel] ?? "bg-white/40"}`}
                    style={{ width: ratioWidth(channel.ratio) }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/55">
              No channel data within the selected filters.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/40">
          Category pulse
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {listing.categoryAverages.length ? (
            listing.categoryAverages.map((category) => (
              <div
                key={category.category}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>{normaliseCategory(category.category)}</span>
                  <span className="tabular-nums">
                    {formatDecimal(category.normalizedAverage)} / 5
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[var(--flex-accent)]"
                    style={{
                      width: `${Math.min(
                        ((category.normalizedAverage ?? 0) / 5) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/55">
              Category scores not available for the current selection.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {strongestCategories.map((category) => (
          <span
            key={`strong-${category.category}`}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${sentimentBadge(category.normalizedAverage ?? null)}`}
          >
            Standout: {normaliseCategory(category.category)}
          </span>
        ))}
        {weakestCategories.map((category) => (
          <span
            key={`weak-${category.category}`}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/65"
          >
            Watch: {normaliseCategory(category.category)}{" "}
            {formatDecimal(category.normalizedAverage)} / 5
          </span>
        ))}
      </div>
    </div>
  );
}
