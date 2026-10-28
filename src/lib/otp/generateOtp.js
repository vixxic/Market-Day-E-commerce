import { randomInt } from "crypto";

const CODE_LENGTH = 6;

export function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(CODE_LENGTH, "0");
}
