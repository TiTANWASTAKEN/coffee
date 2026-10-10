import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { AddressInput, CustomerAccount, CustomerDetails, SavedAddress } from "../shared/store";
import { db, transaction } from "./db";

// ---------- Passwords ----------

function scryptKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptKey(password, salt);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const key = await scryptKey(password, Buffer.from(salt, "base64"));
  const expected = Buffer.from(hash, "base64");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// ---------- Customers ----------

export interface CustomerRow {
  id: number;
  email: string;
  name: string;
  phone: string;
  password_hash: string;
  session_version: number;
  created_at: string;
}

export function toAccount(row: CustomerRow): CustomerAccount {
  return { id: row.id, email: row.email, name: row.name, phone: row.phone, createdAt: row.created_at };
}

export function getCustomerById(id: number): CustomerRow | undefined {
  return db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as unknown as CustomerRow | undefined;
}

export function getCustomerByEmail(email: string): CustomerRow | undefined {
  return db.prepare("SELECT * FROM customers WHERE email = ?").get(email.toLowerCase()) as unknown as CustomerRow | undefined;
}

export function createCustomer(input: { email: string; name: string; phone: string; passwordHash: string }): CustomerRow {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO customers (email, name, phone, password_hash) VALUES (?, ?, ?, ?)")
    .run(input.email.toLowerCase(), input.name, input.phone, input.passwordHash);
  return getCustomerById(Number(lastInsertRowid))!;
}

export function updateCustomer(id: number, input: { name: string; phone: string }): CustomerRow {
  db.prepare("UPDATE customers SET name = ?, phone = ? WHERE id = ?").run(input.name, input.phone, id);
  return getCustomerById(id)!;
}

/** Changing the password signs out every other session (their tokens carry the old version). */
export function setPassword(id: number, passwordHash: string): CustomerRow {
  db.prepare("UPDATE customers SET password_hash = ?, session_version = session_version + 1 WHERE id = ?").run(passwordHash, id);
  return getCustomerById(id)!;
}

// ---------- Password reset tokens ----------

const RESET_TTL_MS = 60 * 60 * 1000;
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Returns the raw token for the email link; only its hash is stored. */
export function createResetToken(customerId: number): string {
  const token = randomBytes(32).toString("base64url");
  db.prepare("DELETE FROM password_resets WHERE customer_id = ? OR expires_at < ?").run(customerId, Date.now());
  db.prepare("INSERT INTO password_resets (token_hash, customer_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), customerId, Date.now() + RESET_TTL_MS);
  return token;
}

/** Marks the token used and returns its customer, or null if invalid / expired / already used. */
export function consumeResetToken(token: string): number | null {
  return transaction(() => {
    const row = db.prepare("SELECT customer_id, expires_at, used FROM password_resets WHERE token_hash = ?").get(sha256(token)) as
      | { customer_id: number; expires_at: number; used: number }
      | undefined;
    if (!row || row.used || row.expires_at < Date.now()) return null;
    db.prepare("UPDATE password_resets SET used = 1 WHERE token_hash = ?").run(sha256(token));
    return row.customer_id;
  });
}

// ---------- Addresses ----------

const MAX_ADDRESSES = 20;

interface AddressRow {
  id: number;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: number;
}

function toAddress(row: AddressRow): SavedAddress {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    isDefault: row.is_default === 1,
  };
}

export function listAddresses(customerId: number): SavedAddress[] {
  const rows = db.prepare("SELECT * FROM addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC").all(customerId) as unknown as AddressRow[];
  return rows.map(toAddress);
}

function ownedAddress(customerId: number, id: number): AddressRow | undefined {
  return db.prepare("SELECT * FROM addresses WHERE id = ? AND customer_id = ?").get(id, customerId) as unknown as AddressRow | undefined;
}

function makeDefault(customerId: number, id: number): void {
  db.prepare("UPDATE addresses SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE customer_id = ?").run(id, customerId);
}

/** The first address a customer saves becomes their default. */
export function createAddress(customerId: number, input: AddressInput): SavedAddress | null {
  return transaction(() => {
    const count = (db.prepare("SELECT COUNT(*) AS n FROM addresses WHERE customer_id = ?").get(customerId) as { n: number }).n;
    if (count >= MAX_ADDRESSES) return null;
    const { lastInsertRowid } = db
      .prepare("INSERT INTO addresses (customer_id, name, phone, line1, line2, city, state, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(customerId, input.name, input.phone, input.line1, input.line2, input.city, input.state, input.postalCode);
    const id = Number(lastInsertRowid);
    if (count === 0 || input.isDefault) makeDefault(customerId, id);
    return toAddress(ownedAddress(customerId, id)!);
  });
}

export function updateAddress(customerId: number, id: number, input: AddressInput): SavedAddress | null {
  return transaction(() => {
    if (!ownedAddress(customerId, id)) return null;
    db.prepare("UPDATE addresses SET name = ?, phone = ?, line1 = ?, line2 = ?, city = ?, state = ?, postal_code = ? WHERE id = ?").run(
      input.name,
      input.phone,
      input.line1,
      input.line2,
      input.city,
      input.state,
      input.postalCode,
      id,
    );
    if (input.isDefault) makeDefault(customerId, id);
    return toAddress(ownedAddress(customerId, id)!);
  });
}

export function setDefaultAddress(customerId: number, id: number): boolean {
  if (!ownedAddress(customerId, id)) return false;
  makeDefault(customerId, id);
  return true;
}

/** Deleting the default promotes the most recently added remaining address. */
export function deleteAddress(customerId: number, id: number): boolean {
  return transaction(() => {
    const row = ownedAddress(customerId, id);
    if (!row) return false;
    db.prepare("DELETE FROM addresses WHERE id = ?").run(id);
    if (row.is_default) {
      const next = db.prepare("SELECT id FROM addresses WHERE customer_id = ? ORDER BY id DESC LIMIT 1").get(customerId) as { id: number } | undefined;
      if (next) makeDefault(customerId, next.id);
    }
    return true;
  });
}

/** Saves the shipping address from checkout unless the customer already has it. */
export function rememberAddress(customerId: number, details: CustomerDetails): void {
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const exists = listAddresses(customerId).some(
    (a) => same(a.line1, details.line1) && same(a.line2, details.line2) && same(a.city, details.city) && a.postalCode === details.postalCode && same(a.name, details.name),
  );
  if (!exists) createAddress(customerId, details);
}
