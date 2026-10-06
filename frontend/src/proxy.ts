import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  if (
    PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )
  ) {
    return true;
  }
  // /invite paths are accessible publicly (invite link verification)
  if (pathname.startsWith("/invite")) {
    return true;
  }
  return false;
}

function getSafeCallbackUrl(urlParam: string | null): string | null {
  if (!urlParam) return null;
  // Ensure it's a relative path starting with a single '/'
  if (urlParam.startsWith("/") && !urlParam.startsWith("//")) {
    return urlParam;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const cookieStore = request.cookies;
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  const apiUrl =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000/api";

  const isPublic = isPublicPath(pathname);

  // Helper to refresh token
  const tryRefreshToken = async () => {
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${apiUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `refresh_token=${refreshToken}`,
        },
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        const newAccessToken = json?.data?.accessToken || json?.accessToken;

        let newRefreshToken = refreshToken;
        const setCookieHeaders = res.headers.getSetCookie
          ? res.headers.getSetCookie()
          : [res.headers.get("set-cookie") || ""];

        for (const header of setCookieHeaders) {
          const match = header.match(/refresh_token=([^;]+)/);
          if (match) {
            newRefreshToken = match[1];
          }
        }

        if (newAccessToken) {
          return {
            accessToken: newAccessToken as string,
            refreshToken: newRefreshToken as string,
          };
        }
      }
    } catch {
      // Backend unreachable or network error
    }
    return null;
  };

  // 1. PUBLIC AUTH PAGES (/login, /register)
  if (PUBLIC_PATHS.includes(pathname)) {
    let hasValidSession = Boolean(accessToken);

    if (!hasValidSession && refreshToken) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        hasValidSession = true;
        const callbackParam = getSafeCallbackUrl(
          request.nextUrl.searchParams.get("callbackUrl")
        );
        const destination = callbackParam || "/";
        const response = NextResponse.redirect(
          new URL(destination, request.url)
        );

        response.cookies.set("access_token", refreshed.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 15 * 60,
          path: "/",
        });

        response.cookies.set("refresh_token", refreshed.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
        });

        return response;
      }
    }

    if (hasValidSession) {
      const callbackParam = getSafeCallbackUrl(
        request.nextUrl.searchParams.get("callbackUrl")
      );
      const destination = callbackParam || "/";
      return NextResponse.redirect(new URL(destination, request.url));
    }

    return NextResponse.next();
  }

  // 2. OTHER PUBLIC PATHS (e.g. /invite)
  if (isPublic) {
    return NextResponse.next();
  }

  // 3. PROTECTED ROUTES (Dashboard, /projects, /tasks, /sprints, etc.)
  if (accessToken) {
    return NextResponse.next();
  }

  // If no accessToken but refreshToken exists, attempt silent refresh
  if (refreshToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Forward new tokens to downstream Server Components
      request.cookies.set("access_token", refreshed.accessToken);
      request.cookies.set("refresh_token", refreshed.refreshToken);

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("cookie", request.cookies.toString());

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // Persist refreshed cookies in the client browser
      response.cookies.set("access_token", refreshed.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60,
        path: "/",
      });

      response.cookies.set("refresh_token", refreshed.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    }
  }

  // Not authenticated: redirect immediately to /login with callbackUrl
  const loginUrl = new URL("/login", request.url);
  const fullPath = pathname + search;
  if (
    pathname !== "/" &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/register")
  ) {
    loginUrl.searchParams.set("callbackUrl", fullPath);
  }

  const response = NextResponse.redirect(loginUrl);
  // Clear any invalid/expired tokens
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");

  return response;
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static public media files (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
