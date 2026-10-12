/** Prefix an internal path with the configured base (works on sub-path hosting such as GitHub Pages). */
export function url(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

/** Strip the base from a pathname so active-state checks work under a sub-path. */
export function stripBase(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
}

export const themeColor: Record<string, string> = {
  'two-photon': 'var(--green)',
  immunohistochemistry: 'var(--blue)',
  electrophysiology: 'var(--red)',
  glymphatic: 'var(--magenta)',
};

export const themeLabel: Record<string, string> = {
  'two-photon': 'Two-photon CA1',
  glymphatic: 'Glymphatic system',
  immunohistochemistry: 'Immunohistochemistry',
  electrophysiology: 'Electrophysiology',
};
