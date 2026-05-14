// Tiny formatters shared across admin pages.

export function formatPrice(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `${n.toLocaleString("en-US")} ر.س`;
}

export function formatRating(rating: number | string | null | undefined): string {
  const n = Number(rating ?? 0);
  return n.toFixed(1);
}

export function vehicleLabel(id: string): string {
  switch (id) {
    case "sedan":
      return "سيدان";
    case "suv":
      return "SUV";
    case "luxury":
      return "فاخرة";
    default:
      return id;
  }
}
