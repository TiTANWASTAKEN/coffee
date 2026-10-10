import { Router, type Response } from "express";
import type { OrderSummary } from "../../shared/store";
import { config } from "../config";
import {
  consumeResetToken,
  createAddress,
  createCustomer,
  createResetToken,
  deleteAddress,
  getCustomerByEmail,
  getCustomerById,
  hashPassword,
  listAddresses,
  setDefaultAddress,
  setPassword,
  toAccount,
  updateAddress,
  updateCustomer,
  verifyPassword,
  type CustomerRow,
} from "../customers";
import { currentCustomer, endCustomerSession, requireCustomer, startCustomerSession } from "../customerSession";
import { listOrders, toOrderSummary } from "../db";
import { sendEmail } from "../email";
import { badRequest, HttpError, idParam, notFound, str } from "../http";
import { rateLimit } from "../rateLimit";
import { readAddress, readEmail, readPassword, readPhone } from "../validate";

export const accountRouter = Router();

const signInLimit = rateLimit({ max: 10, windowMinutes: 15, message: "Too many attempts. Try again in 15 minutes." });
const signUpLimit = rateLimit({ max: 5, windowMinutes: 60, message: "Too many sign-ups from this network. Try again later." });
const resetLimit = rateLimit({ max: 5, windowMinutes: 60, message: "Too many reset requests. Try again later." });

// A real hash, so a login for an unknown email takes as long as a wrong password.
const dummyHash = hashPassword("not-a-real-password");

const me = (res: Response) => res.locals.customer as CustomerRow;

// ---------- Session ----------

accountRouter.get("/me", (req, res) => {
  const customer = currentCustomer(req);
  res.json({ customer: customer ? toAccount(customer) : null });
});

accountRouter.post("/register", signUpLimit, async (req, res) => {
  const name = str(req.body?.name, "Name", { max: 120 });
  const email = readEmail(req.body?.email);
  const phone = readPhone(req.body?.phone, { optional: true });
  const password = readPassword(req.body?.password);
  if (getCustomerByEmail(email)) throw new HttpError(409, "An account with this email already exists. Try signing in.");

  const customer = createCustomer({ email, name, phone, passwordHash: await hashPassword(password) });
  startCustomerSession(req, res, customer);
  res.status(201).json(toAccount(customer));
});

accountRouter.post("/login", signInLimit, async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const customer = email ? getCustomerByEmail(email) : undefined;
  const ok = await verifyPassword(password, customer?.password_hash ?? (await dummyHash));
  if (!customer || !ok) throw new HttpError(401, "Incorrect email or password.");

  signInLimit.reset(req);
  startCustomerSession(req, res, customer);
  res.json(toAccount(customer));
});

accountRouter.post("/logout", (req, res) => {
  endCustomerSession(req, res);
  res.json({ ok: true });
});

// ---------- Password reset ----------

accountRouter.post("/forgot", resetLimit, (req, res) => {
  const email = readEmail(req.body?.email);
  const customer = getCustomerByEmail(email);
  if (customer) {
    const link = `${config.publicUrl}/account/reset?token=${createResetToken(customer.id)}`;
    // Not awaited: the response looks the same whether or not the account exists.
    void sendEmail({
      to: customer.email,
      subject: `Reset your ${config.storeName} password`,
      text: `Hi ${customer.name},\n\nUse this link to choose a new password. It expires in 1 hour and can be used once:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.\n\n— ${config.storeName}`,
    });
  }
  res.json({ ok: true });
});

accountRouter.post("/reset", resetLimit, async (req, res) => {
  const token = str(req.body?.token, "Reset link", { max: 200 });
  const password = readPassword(req.body?.password);
  const customerId = consumeResetToken(token);
  const customer = customerId && getCustomerById(customerId);
  if (!customer) throw badRequest("This reset link is invalid or has expired. Request a new one.");

  const updated = setPassword(customer.id, await hashPassword(password));
  startCustomerSession(req, res, updated);
  res.json(toAccount(updated));
});

// ---------- Signed-in only ----------

accountRouter.use(requireCustomer);

accountRouter.patch("/me", (req, res) => {
  const updated = updateCustomer(me(res).id, {
    name: str(req.body?.name, "Name", { max: 120 }),
    phone: readPhone(req.body?.phone, { optional: true }),
  });
  res.json(toAccount(updated));
});

accountRouter.post("/password", async (req, res) => {
  const current = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const next = readPassword(req.body?.newPassword, "New password");
  if (!(await verifyPassword(current, me(res).password_hash))) throw badRequest("Your current password is incorrect.");

  const updated = setPassword(me(res).id, await hashPassword(next));
  startCustomerSession(req, res, updated);
  res.json({ ok: true });
});

accountRouter.get("/orders", (_req, res) => {
  // Abandoned checkouts and failed payments aren't useful in an order history.
  const orders: OrderSummary[] = listOrders({ customerId: me(res).id, status: "paid" }).map(toOrderSummary);
  res.json(orders);
});

accountRouter.get("/addresses", (_req, res) => {
  res.json(listAddresses(me(res).id));
});

accountRouter.post("/addresses", (req, res) => {
  const address = createAddress(me(res).id, readAddress(req.body));
  if (!address) throw badRequest("You can save up to 20 addresses. Delete one first.");
  res.status(201).json(address);
});

accountRouter.patch("/addresses/:id", (req, res) => {
  const address = updateAddress(me(res).id, idParam(req.params.id), readAddress(req.body));
  if (!address) throw notFound("Address not found.");
  res.json(address);
});

accountRouter.post("/addresses/:id/default", (req, res) => {
  if (!setDefaultAddress(me(res).id, idParam(req.params.id))) throw notFound("Address not found.");
  res.json(listAddresses(me(res).id));
});

accountRouter.delete("/addresses/:id", (req, res) => {
  if (!deleteAddress(me(res).id, idParam(req.params.id))) throw notFound("Address not found.");
  res.json(listAddresses(me(res).id));
});
