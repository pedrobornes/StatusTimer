/**
 * Centralized HTTP client for the StatusTimer Spring Boot API.
 */

export const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

export interface ApiRequestOptions {
  revalidate?: number | false;
  cache?: RequestCache;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la búsqueda. Inténtalo de nuevo.",
): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "La búsqueda no está disponible. Reinicia el backend con la última versión del código.";
    }

    if (error.status >= 500) {
      return "El servidor no responde correctamente. Inténtalo de nuevo en unos segundos.";
    }

    return fallback;
  }

  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor. Comprueba que el backend esté en marcha.";
  }

  return fallback;
}

export async function fetchJson<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { revalidate = 60, cache } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache,
    next: cache ? undefined : { revalidate },
  });

  if (!response.ok) {
    throw new ApiError(
      `Request to ${path} failed with status ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export async function postJson<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { revalidate = 0, cache } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    cache,
    next: cache ? undefined : { revalidate },
  });

  if (!response.ok) {
    throw new ApiError(
      `Request to ${path} failed with status ${response.status}`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
