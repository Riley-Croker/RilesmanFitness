// NextAuth v5 configured for email/password (Credentials provider).
// Sessions are stateless JWTs signed with AUTH_SECRET — no session table
// needed. Passwords are verified against bcrypt hashes in common.users, the
// identity table shared by every app on rcroker.dev.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { withBasePath } from "@/lib/base-path";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  // NextAuth's own basePath stays at its default, "/api/auth": Next strips
  // /workout from the URL before the route handler sees it. Don't put a path
  // in AUTH_URL either - NextAuth would adopt it as this basePath and every
  // auth route would fail with UnknownAction.
  //
  // Redirect targets are different: NextAuth turns them into absolute URLs
  // from the origin alone, so they need the prefix written in.
  pages: { signIn: withBasePath("/login") },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const [rows] = await db.execute("SELECT * FROM common.users WHERE email = ?", [
          email.toLowerCase().trim(),
        ]);
        const user = (rows as UserRow[])[0];
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        // Someone who signed up through another rcroker.dev app has a
        // common.users row but no profile row here yet. Create it on first
        // login; IGNORE makes this a no-op for everyone who already has one.
        await db.execute("INSERT IGNORE INTO users (id) VALUES (?)", [user.id]);

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
