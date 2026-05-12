import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const isPublicPath =
    req.nextUrl.pathname === "/login" ||
    req.nextUrl.pathname.startsWith("/accept-invite") ||
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname.startsWith("/api/public/widgets/") ||
    req.nextUrl.pathname.startsWith("/embed/") ||
    req.nextUrl.pathname.startsWith("/f/") ||
    req.nextUrl.pathname.startsWith("/r/") ||
    req.nextUrl.pathname.startsWith("/b/");

  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(loginUrl);
  }

  if (isLoggedIn && req.nextUrl.pathname === "/login") {
    return Response.redirect(new URL("/", req.nextUrl.origin));
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
