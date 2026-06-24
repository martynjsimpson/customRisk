import { Prisma } from "@prisma/client";

/**
 * Converts a Date to a YYYY-MM-DD string, or returns null if the date is null.
 */
export function toDateOnlyString(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/**
 * Converts a Prisma Decimal value to a JavaScript number.
 */
export function decimalToNumber(value: Prisma.Decimal.Value): number {
  return new Prisma.Decimal(value).toNumber();
}

/**
 * Converts a nullable Prisma Decimal value to a JavaScript number, or returns null.
 */
export function decimalOrNull(d: Prisma.Decimal | null): number | null {
  return d ? new Prisma.Decimal(d).toNumber() : null;
}
