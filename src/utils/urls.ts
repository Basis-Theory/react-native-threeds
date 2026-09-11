export const API_BASE_URL = 'https://api.basistheory.com';

/**
 * Regional API base URLs, selected with the `region` prop. Without a region the
 * compatibility host is used, so a region is always opt-in.
 */
export const REGIONAL_API_BASE_URLS: Record<string, string> = {
  eu: 'https://api.eu.basistheory.com',
  us: 'https://api.us.basistheory.com',
};

/**
 * Resolves the API base URL handed to the 3DS SDK inside the WebView. An
 * explicit `apiBaseUrl` always wins, then a named region, then the
 * compatibility host — so an unconfigured caller is never moved off
 * api.basistheory.com. Region names are matched case-insensitively: a caller
 * writing 'EU' means the EU region, and quietly serving them the compatibility
 * host is the mis-route a region exists to prevent.
 *
 * The resolved URL is passed through rather than the region itself, so this
 * does not depend on the web SDK version loaded in the WebView.
 */
export const resolveApiBaseUrl = (options?: {
  apiBaseUrl?: string;
  region?: string;
}): string => {
  if (options?.apiBaseUrl) {
    return options.apiBaseUrl;
  }

  const region = options?.region?.toLowerCase();

  return (region && REGIONAL_API_BASE_URLS[region]) || API_BASE_URL;
};
