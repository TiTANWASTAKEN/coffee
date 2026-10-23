import type { AddressInput, CustomerDetails } from "../shared/store";
import { isEmail } from "../shared/email.ts";
import { config } from "./config";
import { badRequest, str } from "./http";

const PHONE = /^\+?[0-9\s-]{10,15}$/;
const PIN = /^[1-9][0-9]{5}$/;

/**
 * PIN prefixes that can be booked. Kept off the public site — checkout only
 * hears about it when an address is refused.
 * Delhi, and the Haryana, Uttar Pradesh, and Rajasthan districts in the region.
 */
const DELIVERY_PIN_PREFIXES = new Set([
  "110",
  "121",
  "122",
  "123",
  "124",
  "126",
  "127",
  "131",
  "132",
  "201",
  "203",
  "245",
  "250",
  "251",
  "301",
  "321",
]);

function canDeliver(pin: string): boolean {
  if (DELIVERY_PIN_PREFIXES.has(pin.slice(0, 3))) return true;
  const code = Number(pin);
  return code >= 247772 && code <= 247778;
}

export function readEmail(value: unknown): string {
  const email = str(value, "Email", { max: 200 }).toLowerCase();
  if (!isEmail(email)) throw badRequest("Enter a valid email address.");
  return email;
}

export function readPhone(value: unknown, { optional = false } = {}): string {
  const phone = str(value, "Phone", { max: 20, optional });
  if (phone && !PHONE.test(phone)) throw badRequest("Enter a valid phone number.");
  return phone;
}

export function readPassword(value: unknown, field = "Password"): string {
  const password = typeof value === "string" ? value : "";
  if (password.length < 8) throw badRequest(`${field} must be at least 8 characters.`);
  if (password.length > 200) throw badRequest(`${field} is too long.`);
  return password;
}

export function readAddress(body: unknown): AddressInput {
  const a = (body ?? {}) as Record<string, unknown>;
  const address: AddressInput = {
    name: str(a.name, "Name", { max: 120 }),
    phone: readPhone(a.phone),
    line1: str(a.line1, "Address", { max: 200 }),
    line2: str(a.line2, "Address line 2", { max: 200, optional: true }),
    city: str(a.city, "City", { max: 100 }),
    state: str(a.state, "State", { max: 100 }),
    postalCode: str(a.postalCode, "PIN code", { max: 10 }),
    isDefault: a.isDefault === true,
  };
  if (!PIN.test(address.postalCode)) throw badRequest("Enter a valid 6-digit PIN code.");
  return address;
}

export function readCustomerDetails(body: unknown): CustomerDetails {
  const { isDefault: _ignored, ...address } = readAddress(body);
  if (config.ncrOnly && !canDeliver(address.postalCode)) throw badRequest("We can't deliver to this PIN code yet.");
  return { ...address, email: readEmail((body as Record<string, unknown> | undefined)?.email) };
}
