/** Every bag is 250g. The first kg is the configured rate. Each kg after that adds this much. */
export const BAG_GRAMS = 250;
export const SHIPPING_STEP_PAISE = 4000;

/**
 * Up to 1kg costs `firstKgPaise`. 1.5kg and 2kg are the next slab.
 * A part kilogram counts as a whole kilogram. A zero first rate stays zero.
 */
export function shippingForQuantity(quantity: number, firstKgPaise: number, stepPaise = SHIPPING_STEP_PAISE, bagGrams = BAG_GRAMS): number {
  if (!Number.isInteger(firstKgPaise) || firstKgPaise < 0) throw new Error("Shipping charge is not configured as a whole number of paise.");
  if (firstKgPaise === 0 || quantity === 0) return 0;
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Invalid quantity.");
  if (!Number.isInteger(stepPaise) || stepPaise < 0) throw new Error("Invalid shipping step.");
  if (!Number.isInteger(bagGrams) || bagGrams < 1) throw new Error("Invalid bag weight.");
  const kilograms = Math.ceil((quantity * bagGrams) / 1000);
  return firstKgPaise + Math.max(0, kilograms - 1) * stepPaise;
}
