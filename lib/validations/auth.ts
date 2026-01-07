import * as z from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  username: z.string().min(2, "Username required").max(50, "Max 50 chars").transform(u => u.trim()),
  email: z.string().email("Invalid email").transform((e) => e.toLowerCase().trim()),
  password: z.string().min(6, "At least 6 characters"),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().min(1, "Email or Username is required").transform((e) => e.trim()),
  password: z.string().min(1, "Password is required"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const forgotRequestSchema = z.object({
  email: z.string().email("Invalid email").transform((e) => e.toLowerCase().trim()),
});

export const forgotVerifySchema = z.object({
  email: z.string().email("Invalid email").transform((e) => e.toLowerCase().trim()),
  code: z.string().min(6, "Code must be 6 digits").max(6, "Code must be 6 digits"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "At least 6 characters"),
  confirm: z.string().min(6, "At least 6 characters"),
}).refine((d) => d.password === d.confirm, {
  path: ["confirm"],
  message: "Passwords do not match",
});