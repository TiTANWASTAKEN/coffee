import { Router } from "express";
import { HttpError } from "../http";
import { rateLimit } from "../rateLimit";
import { WaitlistStorageError } from "../supabaseWaitlist";
import { readEmail } from "../validate";
import { saveWaitlistEmail } from "../waitlistStore";

export const waitlistRouter = Router();

const joinLimit = rateLimit({ max: 8, windowMinutes: 15, message: "Too many attempts. Try again in a few minutes." });

waitlistRouter.post("/", joinLimit, async (req, res) => {
  const email = readEmail(req.body?.email);
  try {
    const status = await saveWaitlistEmail(email);
    res.status(status === "added" ? 201 : 200).json({ ok: true, already: status === "exists" });
  } catch (err) {
    if (err instanceof WaitlistStorageError) throw new HttpError(503, err.message);
    throw err;
  }
});
