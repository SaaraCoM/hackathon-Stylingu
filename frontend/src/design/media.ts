/** Only the existing private-photo route may supply a personal portrait. */
export function privatePhoto(path?: string, apiBase = ''): string | undefined {
 return path && /^\/api\/personal\/photos\/[a-f0-9]{64}$/.test(path) ? apiBase + path : undefined;
}
