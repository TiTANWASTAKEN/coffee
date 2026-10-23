/** One or more dots, so .com, .in, and .co.in all pass. */
export const EMAIL_PATTERN = "[^\\s@]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+";

const EMAIL = new RegExp(`^${EMAIL_PATTERN}$`);

export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}
