// Branding comes from build config so forks do not advertise the upstream site.
export const APP_NAME: string = import.meta.env.VITE_APP_NAME || 'Trousseau';

export function appUrl(): string {
  const configured = import.meta.env.VITE_APP_URL as string | undefined;
  if (configured) return configured;
  return `${location.host}${import.meta.env.BASE_URL}`.replace(/\/$/, '');
}
