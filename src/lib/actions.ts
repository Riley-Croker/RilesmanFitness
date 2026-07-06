"use server";

// Server actions for auth: login, register, logout.
// These run on the server, so bcrypt hashing and SQL stay off the client.

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";

// Next signals a successful redirect by throwing an error whose digest
// starts with NEXT_REDIRECT — that must be rethrown, not swallowed.
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    // signIn redirects on success by throwing — let that through.
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) return "Invalid email or password.";
    throw error;
  }
}

export async function registerAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) return "All fields are required.";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Please enter a valid email address.";
  if (password.length < 8) return "Password must be at least 8 characters.";

  const [existing] = await db.execute("SELECT id FROM users WHERE email = ?", [email]);
  if ((existing as unknown[]).length > 0) return "An account with that email already exists.";

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  await db.execute(
    "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
    [id, name, email, passwordHash]
  );

  // Log the new user straight in.
  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) return "Account created — please log in.";
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
