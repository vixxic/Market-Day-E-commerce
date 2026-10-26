export function normalizeMsisdn(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("62")) return "62" + digits.slice(2);
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("6")) return "62" + digits.slice(1);
  return "62" + digits.replace(/^0/, "");
}
