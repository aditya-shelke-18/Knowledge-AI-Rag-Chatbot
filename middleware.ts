export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/((?!login|api/auth|api/register|_next|favicon.ico).*)"],
};
