import { Language, TrackAudioFeatures } from '../types';

export function getCoffeePairing(features: TrackAudioFeatures | undefined, fallback: string, language: Language): string {
  if (!features) return language === 'vi' ? 'Chưa có dữ liệu âm thanh' : 'Audio features unavailable';

  // Rules are ordered by the menu's strongest defining signal so overlapping
  // Spotify feature profiles still produce one stable recommendation.
  if (features.energy > 0.8 && features.tempo > 120) {
    return 'Espresso (Hot/Iced)';
  }
  if (features.valence > 0.75 && features.danceability > 0.7) {
    return 'Mango Passion Fruit Smoothie';
  }
  if (features.instrumentalness > 0.6 && features.energy < 0.5) {
    return 'Matcha Latte';
  }
  if (features.loudness > -5 && features.danceability > 0.6) {
    return 'Oreo Ice Blended';
  }
  if (features.mode === 1 && features.liveness > 0.3) {
    return 'Macchiato Jasmin Olong Tea';
  }
  if (features.energy < 0.4 && features.acousticness > 0.7) {
    return 'Jasmine Olong Milk Tea';
  }
  if (features.acousticness > 0.6 && features.energy >= 0.5 && features.energy <= 0.75) {
    return 'Drip Drop Milk Coffee (Hot/Iced)';
  }
  return fallback;
}