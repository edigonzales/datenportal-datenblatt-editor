function normalizePublicBasePath(value?: string): string {
  const trimmed = value?.trim() ?? "";

  // A relative Vite base is useful while building the image, but the
  // browser needs a concrete path for router and application URLs.
  if (!trimmed || trimmed === "." || trimmed === "./" || trimmed === "/") {
    return "/";
  }

  // The NGINX configuration applies the same restriction. Keep this helper
  // defensive as it is also used in development and tests.
  if (
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    /^[a-z][a-z\d+.-]*:/i.test(trimmed)
  ) {
    return "/";
  }

  const path = trimmed.split(/[?#]/, 1)[0];
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  const normalizedPath = withLeadingSlash.replace(/\/{2,}/g, "/");

  if (!/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/?$/.test(normalizedPath)) {
    return "/";
  }

  return normalizedPath.replace(/\/+$/, "") + "/";
}

export function getPublicBasePath(): string {
  const injectedBase =
    typeof document !== "undefined"
      ? document.querySelector<HTMLBaseElement>("base")?.getAttribute("href")
      : undefined;

  return normalizePublicBasePath(injectedBase || import.meta.env.BASE_URL || "/");
}
