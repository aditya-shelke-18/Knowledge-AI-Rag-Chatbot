import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Redirect / to /dashboard
    if (req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/((?!login|api/auth|api/register|api/widget|preview|chatbot-widget.js|_next|favicon.ico).*)",
  ],
};
