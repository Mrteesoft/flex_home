const numberFormatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatDecimal = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return "–";
  return numberFormatter.format(value);
};

export const formatInteger = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return "0";
  return integerFormatter.format(value);
};

export const formatDate = (value: string | null | undefined) => {
  if (!value) return "–";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : dateFormatter.format(date);
};

export const compactName = (value: string | null | undefined) => {
  if (!value) return "Anonymous guest";
  return value.length > 36 ? `${value.slice(0, 33)}…` : value;
};
