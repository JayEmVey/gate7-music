export const DEVICE_SUFFIX_STORAGE_KEY = 'gate7_device_suffix';
export const DEVICE_SUFFIX_MAX_LENGTH = 40;

export function getDefaultDeviceSuffix(
  device: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = navigator,
): string {
  const { userAgent, platform, maxTouchPoints } = device;
  // iPadOS can present itself as a Mac when requesting desktop sites.
  if (/iPad/i.test(userAgent) || (/Mac/i.test(platform) && maxTouchPoints > 1)) return 'iPad';
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/iPod/i.test(userAgent)) return 'iPod';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/Mac/i.test(userAgent)) return 'Mac';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/CrOS/i.test(userAgent)) return 'Chromebook';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Browser';
}

export function normalizeDeviceSuffix(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, DEVICE_SUFFIX_MAX_LENGTH).trim();
}

export function getStoredDeviceSuffix(): string {
  try {
    const saved = normalizeDeviceSuffix(localStorage.getItem(DEVICE_SUFFIX_STORAGE_KEY) || '');
    if (saved) return saved;
  } catch {
    // Playback still works when browser storage is unavailable.
  }
  return getDefaultDeviceSuffix();
}

export function getSpotifyDeviceName(suffix: string): string {
  return `Gate 7 Soundstage - ${normalizeDeviceSuffix(suffix) || 'Browser'}`;
}
