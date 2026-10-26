const CODE_LENGTH = 6;

export function generateOtp() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}
