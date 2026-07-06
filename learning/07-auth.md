# Module 7 — Authentication

**Goal:** understand the full login story: password hashing, JWT session
cookies, and how pages/APIs check "who is this?".

Mental model for .NET folks: this is **ASP.NET Core cookie authentication
with a custom password store**, except the cookie contains a signed JWT
instead of an encrypted auth ticket, and "Identity" is replaced by a much
smaller library: **NextAuth (Auth.js) v5**.

## The pieces

```
Register form ──► registerAction ──► bcrypt.hash ──► INSERT users
Login form ─────► loginAction ─────► NextAuth signIn("credentials")
                                          │
                                          ▼
                              authorize() in src/lib/auth.ts
                              SELECT user by email
                              bcrypt.compare(password, hash)
                                          │ success
                                          ▼
                              JWT created, signed with AUTH_SECRET,
                              set as an HttpOnly cookie
                                          │
Every later request ──► auth() ──► verify cookie signature ──► session.user.id
```

## The config — [src/lib/auth.ts](../src/lib/auth.ts)

```ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      async authorize(credentials) {
        // look up user, bcrypt.compare, return user object or null
      },
    }),
  ],
  callbacks: {
    jwt({ token, user })      { if (user) token.id = user.id; return token; },
    session({ session, token }) { session.user.id = token.id; return session; },
  },
});
```

Things to understand:

- **`authorize` is your `SignInManager.CheckPasswordSignInAsync`.** Return
  a user → success; return `null` → NextAuth reports invalid credentials.
- **`strategy: "jwt"` means no session table.** The cookie *is* the
  session — a signed (not encrypted) token holding the user id. Signature
  = `AUTH_SECRET` in [.env](../.env). Server restarts don't log anyone
  out, and there's nothing to clean up in the DB. Trade-off: you can't
  revoke a single session server-side without extra machinery.
- The two callbacks smuggle `user.id` into the token and back out into
  `session.user.id` — that id is what every SQL query filters by.
- [src/types/next-auth.d.ts](../src/types/next-auth.d.ts) teaches
  TypeScript that `session.user.id` exists — a *module augmentation*,
  similar in spirit to extending a partial class.

## Password storage — [src/lib/actions.ts](../src/lib/actions.ts)

```ts
const passwordHash = await bcrypt.hash(password, 12);
```

bcrypt with cost 12, same algorithm family ASP.NET Identity uses
(Identity defaults to PBKDF2; bcrypt is an equally standard choice).
Plaintext never touches the DB. Verification is
`bcrypt.compare(password, user.password_hash)` — constant-time, salt
embedded in the hash. There is nothing exotic here, which is the point:
**you should be able to read your own auth code.**

## Checking auth — the two call sites

**Pages** (server components):

```tsx
const session = await auth();
if (!session?.user?.id) redirect("/login");
```

**API routes:**

```ts
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

`auth()` reads and verifies the cookie — it's `HttpContext.User` plus
`[Authorize]` rolled into one explicit call. Search the project for
`await auth()` and you'll find every protected surface. (Count them.
Notice which pages *don't* check — the landing page, login, register, and
the exercise browser are deliberately public.)

## The cookie itself

**Try it:** log in, open browser DevTools → Application → Cookies →
localhost:3000. Find `authjs.session-token`. Properties worth noting:

- **HttpOnly** — JavaScript can't read it; XSS can't steal it.
- It's a JWS (signed JWT). Paste it into jwt.io: the *payload* is
  readable (JWTs are encoded, not encrypted!) but the signature can't be
  forged without `AUTH_SECRET`. Never put secrets in a JWT payload.

## Sign out

The nav's Sign out button submits a form to `logoutAction`, which calls
NextAuth's `signOut` — it clears the cookie and redirects. No server state
to destroy (JWT strategy), so "log out" literally means "delete the
cookie".

## What's deliberately missing (good extension exercises)

- Password change / reset (no email infrastructure)
- Account lockout after failed attempts
- Email verification
- OAuth providers — the original skeleton had Google/GitHub; the git
  history of WorkoutApp shows how an adapter-based setup looked

## Try it

1. **Watch a hash get born.** `SELECT email, password_hash FROM users;` —
   note the `$2b$12$...` prefix: algorithm + cost + salt + hash in one
   string.
2. **Tamper with the cookie.** In DevTools, edit one character of the
   session token, then refresh. You're logged out — signature check
   failed. (Log back in: `testpass123`.)
3. **Trace a login end-to-end with breakpoints of `console.log`:** add
   `console.log("authorize hit", email)` inside `authorize`, log in, and
   watch the dev-server terminal. Server-side logs appear in the
   terminal, not the browser console — an important debugging habit.

**Next:** [Module 8 — Client interactivity →](08-client-interactivity.md)
