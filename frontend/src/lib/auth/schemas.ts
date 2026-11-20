import { z } from "zod";

// Reglas de los formularios de acceso. Se usan en el navegador (React Hook Form)
// y se vuelven a validar en el servidor (Server Actions).

const email = z
  .string()
  .trim()
  .min(1, { error: "Ingresá tu email" })
  .pipe(z.email({ error: "Ingresá un email válido" }))
  .transform((v) => v.toLowerCase());

const newPassword = z
  .string()
  .min(8, { error: "Usá al menos 8 caracteres" })
  .max(72, { error: "Máximo 72 caracteres" });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Ingresá tu contraseña" }),
});

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { error: "Ingresá tu nombre" })
      .max(80, { error: "Máximo 80 caracteres" }),
    phone: z
      .string()
      .trim()
      .max(30, { error: "Máximo 30 caracteres" })
      .regex(/^[0-9+\s()-]*$/, { error: "Solo números, espacios y + ( ) -" }),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type LoginInput = z.input<typeof loginSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type UpdatePasswordInput = z.input<typeof updatePasswordSchema>;
