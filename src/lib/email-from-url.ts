const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/**
 * Email campaigns pass the customer as `?email=`. `url` is accepted too in
 * case the merge tag was named that way.
 */
export function getEmailFromSearch(search = window.location.search): string {
  const params = new URLSearchParams(search);
  for (const key of ['email', 'em', 'e', 'url']) {
    const value = params.get(key)?.trim();
    if (value && isValidEmail(value)) return value;
  }
  return '';
}
