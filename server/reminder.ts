import type { AdminOrder } from "../shared/store";
import { canClearUnpaidCheckout, formatRupees, renderReminder } from "../shared/reminder.ts";
import { config } from "./config";
import { sendEmail } from "./email";
import { badRequest, str } from "./http";

export interface ReminderTemplate {
  subject: string;
  body: string;
}

export interface ReminderResult {
  sent: number;
  failed: number;
  skipped: number;
}

export function readReminderTemplate(body: unknown): ReminderTemplate {
  const record = (body ?? {}) as Record<string, unknown>;
  return {
    subject: str(record.subject, "Subject", { max: 140 }),
    body: str(record.body, "Message", { max: 2000 }),
  };
}

export function readOrderIds(body: unknown): number[] {
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) throw badRequest("Choose at least one order.");
  const parsed = ids.map((id) => {
    const value = Number(id);
    if (!Number.isInteger(value) || value < 1) throw badRequest("Unknown order.");
    return value;
  });
  return [...new Set(parsed)];
}

/** Customer only. This is a nudge, not a new-order copy to the shop. */
export async function sendPaymentReminders(
  orders: AdminOrder[],
  template: ReminderTemplate,
  onSent?: (order: AdminOrder) => void,
): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, failed: 0, skipped: 0 };
  for (const order of orders) {
    if (!canClearUnpaidCheckout(order)) {
      result.skipped += 1;
      continue;
    }
    const fields = {
      name: order.customer.name,
      order: order.code,
      items: order.items.map((item) => `${item.name} × ${item.quantity}`).join("\n"),
      total: formatRupees(order.amount),
      shop: config.publicUrl,
    };
    const subject = renderReminder(template.subject, fields).replace(/\s+/g, " ").trim();
    const text = renderReminder(template.body, fields).trim();
    const sent = await sendEmail({ to: order.customer.email, subject, text });
    if (sent) {
      result.sent += 1;
      onSent?.(order);
    } else result.failed += 1;
  }
  return result;
}
