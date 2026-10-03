import { cookies } from "next/headers";

export interface ServerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface ServerSession {
  user: ServerUser;
  token: string;
}

export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const apiUrl =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000/api";

  if (token) {
    try {
      const res = await fetch(`${apiUrl}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        const user = json?.data || json;
        return { user, token };
      }
    } catch {
      // Fall through to refresh token attempt
    }
  }

  // Attempt refresh if refresh_token cookie is present
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (refreshToken) {
    try {
      const refreshRes = await fetch(`${apiUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `refresh_token=${refreshToken}`,
        },
        cache: "no-store",
      });

      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        const newToken =
          refreshJson?.data?.accessToken || refreshJson?.accessToken;

        if (newToken) {
          const profileRes = await fetch(`${apiUrl}/auth/profile`, {
            headers: {
              Authorization: `Bearer ${newToken}`,
            },
            cache: "no-store",
          });

          if (profileRes.ok) {
            const profileJson = await profileRes.json();
            const user = profileJson?.data || profileJson;
            return { user, token: newToken };
          }
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}
