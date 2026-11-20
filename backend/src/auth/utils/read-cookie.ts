export function readCookie(
  header: string | string[] | undefined,
  name: string,
) {
  const raw = Array.isArray(header) ? header.join('; ') : header;
  if (!raw) return undefined;
  for (const pair of raw.split(';')) {
    const index = pair.indexOf('=');
    if (index > 0 && pair.slice(0, index).trim() === name) {
      return decodeURIComponent(pair.slice(index + 1).trim());
    }
  }
  return undefined;
}
