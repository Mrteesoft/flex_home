interface StarRatingProps {
  value: number | null;
  outOf?: number;
  className?: string;
  showValue?: boolean;
  size?: number;
}

const STAR_PATH =
  "M12 2.25 14.78 8l6.22.9-4.5 4.38 1.06 6.2L12 16.99 6.44 19.5l1.06-6.2L3 8.9 9.22 8z";

export function StarRating({
  value,
  outOf = 5,
  className = "",
  showValue = true,
  size = 18,
}: StarRatingProps) {
  const normalized =
    value == null || outOf <= 0 ? null : Math.min(Math.max(value / outOf, 0), 1);
  const stars = Array.from({ length: 5 });

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {stars.map((_, index) => {
          const threshold = (index + 1) / stars.length;
          const fillPercentage =
            normalized == null
              ? 0
              : normalized >= threshold
                ? 1
                : Math.max(
                    Math.min((normalized - index / stars.length) * stars.length, 1),
                    0,
                  );

          return (
            <div
              key={index}
              className="relative"
              style={{ width: size, height: size }}
              aria-hidden
            >
              <svg
                viewBox="0 0 24 24"
                className="text-white/15"
                width={size}
                height={size}
              >
                <path d={STAR_PATH} fill="currentColor" />
              </svg>
              <svg
                viewBox="0 0 24 24"
                className="absolute inset-0 text-[var(--flex-primary)]"
                width={size}
                height={size}
                style={{
                  clipPath: `inset(0 ${100 - fillPercentage * 100}% 0 0)`,
                }}
              >
                <path d={STAR_PATH} fill="currentColor" />
              </svg>
            </div>
          );
        })}
      </div>
      {showValue ? (
        <span className="text-sm font-medium text-white/70 tabular-nums">
          {value == null ? "–" : value.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}
