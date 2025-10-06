import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allProperties, getPropertyBySlug } from "@/data/properties";
import { formatDate } from "@/lib/format";
import {
  buildHostawayResponse,
  refreshApprovals,
} from "@/lib/reviews/normalize";
import type { NormalizedReview } from "@/lib/reviews/types";
import { StarRating } from "@/components/ui/star-rating";

interface PropertyPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return allProperties().map((property) => ({
    slug: property.slug,
  }));
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) {
    return {
      title: "Flex Living Property",
    };
  }

  return {
    title: `${property.name} — Flex Living`,
    description: property.headline,
  };
}

const reviewTone = (rating: number | null) => {
  if (rating == null) return "border-white/10 bg-white/5 text-white/70";
  if (rating >= 4.5) return "border-[var(--flex-primary)]/40 bg-[var(--flex-primary-soft)] text-[var(--flex-primary)]";
  if (rating >= 4) return "border-[var(--flex-accent)]/40 bg-[var(--flex-accent)]/20 text-[var(--flex-accent)]";
  if (rating >= 3.5) return "border-[var(--flex-warning)]/40 bg-[var(--flex-warning)]/15 text-[var(--flex-warning)]";
  return "border-[var(--flex-danger)]/40 bg-[var(--flex-danger)]/15 text-[var(--flex-danger)]";
};

const ReviewCard = ({ review }: { review: NormalizedReview }) => (
  <article className="rounded-3xl border border-white/8 bg-white/5 p-6 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-white/40">
          {formatDate(review.submittedAt)} • {review.channel.toUpperCase()}
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">
          {review.publicReview ? `"${review.publicReview}"` : "Guest feedback"}
        </h3>
      </div>
      <div className="flex items-center gap-3">
        <StarRating value={review.normalizedRating} />
        <span
          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${reviewTone(review.normalizedRating)}`}
        >
          {review.normalizedRating == null ? "Unrated" : `${review.normalizedRating.toFixed(1)} / 5`}
        </span>
      </div>
    </div>
    <div className="mt-4 space-y-4 text-white/70">
      {review.publicReview ? null : (
        <p className="text-sm">This review does not include a public comment.</p>
      )}
      {review.managerResponse ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
          <p className="uppercase tracking-[0.18em] text-xs text-white/40">
            Flex Living response
          </p>
          <p className="mt-2">{review.managerResponse}</p>
        </div>
      ) : null}
      {review.categoryRatings.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {review.categoryRatings.map((category) => (
            <div
              key={category.key}
              className="rounded-2xl border border-white/8 bg-white/5 p-3"
            >
              <div className="flex items-center justify-between text-sm text-white/65">
                <span>{category.label}</span>
                <span>
                  {category.normalizedRating == null
                    ? "–"
                    : `${category.normalizedRating.toFixed(1)} / 5`}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--flex-accent)]"
                  style={{
                    width: `${Math.min(
                      ((category.normalizedRating ?? 0) / 5) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
    <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-white/50">
      <span>Guest: {review.guestName ?? "Anonymous guest"}</span>
      <span>Source: {review.channel}</span>
    </footer>
  </article>
);

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) {
    return notFound();
  }

  refreshApprovals();
  const response = buildHostawayResponse(
    `http://localhost/api/reviews/hostaway?listingSlug=${property.slug}&approved=true&sort=date:desc`,
  );
  const summary = response.listings[0];
  const reviews = response.reviews;

  return (
    <div className="min-h-screen bg-transparent text-white">
      <header className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={property.heroImage}
            alt={property.name}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-[var(--flex-bg)]" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-[1180px] flex-col gap-10 px-6 py-20 md:px-12 lg:px-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                Flex Living Residence
              </p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
                {property.name}
              </h1>
              <p className="mt-3 text-lg text-white/70">{property.headline}</p>
            </div>
            <div className="flex flex-col items-start gap-4">
              <StarRating
                value={summary?.averageRating ?? null}
                className="scale-110"
              />
              <span className="text-sm uppercase tracking-[0.2em] text-white/50">
                {summary ? `${summary.totalReviews} approved reviews` : "No reviews yet"}
              </span>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-black/30 px-5 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                ← Back to dashboard
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Sleeps</p>
              <p className="mt-2 text-3xl font-semibold">{property.sleeps}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Bedrooms</p>
              <p className="mt-2 text-3xl font-semibold">{property.bedrooms}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Bathrooms</p>
              <p className="mt-2 text-3xl font-semibold">{property.bathrooms}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Size</p>
              <p className="mt-2 text-3xl font-semibold">
                {property.size} m²
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] space-y-16 px-6 py-16 md:px-12 lg:px-16">
        <section className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-2xl font-semibold text-white">About this stay</h2>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              {property.description}
            </p>
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Neighbourhood
              </p>
              <p className="mt-3 text-sm text-white/70">{property.neighbourhood}</p>
            </div>
          </div>
          <div className="grid gap-4">
            {property.gallery.map((image, index) => (
              <div key={image} className="relative h-44 overflow-hidden rounded-3xl border border-white/10">
                <Image
                  src={image}
                  alt={`${property.name} gallery ${index + 1}`}
                  fill
                  className="object-cover transition duration-700 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-white">Highlights</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {property.highlights.map((highlight) => (
              <div
                key={highlight}
                className="rounded-2xl border border-[var(--flex-primary)]/20 bg-[var(--flex-primary-soft)]/40 p-4 text-sm text-white/75"
              >
                {highlight}
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-white">Amenities</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {property.amenities.map((amenity) => (
              <div
                key={amenity}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70"
              >
                {amenity}
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Guest stories
              </p>
              <h2 className="text-2xl font-semibold text-white">
                Approved reviews for {property.name}
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
              {summary ? `${summary.approvedReviews} live on site` : "Awaiting first review"}
            </span>
          </div>
          <div className="mt-8 space-y-6">
            {reviews.length ? (
              reviews.map((review) => <ReviewCard key={review.id} review={review} />)
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-12 text-center text-sm text-white/60">
                Once reviews are approved in the manager dashboard they will appear
                here automatically.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
