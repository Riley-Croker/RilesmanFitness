// The app is served under rcroker.dev/workout, so every URL it produces must
// start with this prefix. next.config.ts reads it for Next's own basePath.
//
// Next adds the prefix automatically to <Link href>, redirect() and
// router.push(). It does NOT touch anything else: fetch() URLs and the
// redirect targets handed to NextAuth must be wrapped with withBasePath().
export const BASE_PATH = "/workout";

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
