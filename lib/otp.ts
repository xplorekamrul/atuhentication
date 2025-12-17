import bcrypt from "bcrypt";

export function generateOtp(len = 6) {
  let otp = "";
  for (let i = 0; i < len; i++) otp += Math.floor(Math.random() * 10);
  return otp;
}

export async function hashOtp(otp: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
}

export async function verifyOtp(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
