import { Language, TrackAudioFeatures } from '../types';

/**
 * Map a track's Spotify audio features to the most fitting Gate 7 menu drink.
 *
 * Rules are ordered from most-specific to most-general so that overlapping
 * feature profiles always resolve to one stable recommendation. The returned
 * string matches the `drink` field in COFFEE_PAIRINGS exactly so the modal
 * can highlight the recommended card.
 *
 * 10 sonic categories → 35 drinks total.
 */
export function getCoffeePairing(
  features: TrackAudioFeatures | undefined,
  fallback: string,
  language: Language,
  source?: 'worker' | 'estimated',
): string {
  if (!features) return language === 'vi' ? 'Chưa có dữ liệu âm thanh' : 'Audio features unavailable';

  const { energy, tempo, acousticness, instrumentalness, valence, danceability, liveness, loudness, mode } = features;

  // ─── Authoritative worker path (RapidAPI audio features) ─────────────────
  // Slightly tighter thresholds because worker data is more reliable.
  if (source === 'worker') {
    // High Energy / Fast Tempo
    if (energy >= 0.80 && tempo > 120) return 'Espresso (Hot/Iced)';
    if (valence > 0.70 && mode === 1 && tempo > 110) return 'Orange Espresso (Iced)';
    if (instrumentalness > 0.50 && energy >= 0.55 && energy <= 0.80) return 'Americano (Hot/Iced)';

    // Deep Chocolate Groove
    if (loudness > -5 && danceability > 0.60) return 'Oreo Ice Blended';
    if (energy >= 0.55 && loudness > -8 && valence < 0.65) return 'Mocha (Hot/Iced)';
    if (valence >= 0.45 && valence <= 0.70 && acousticness > 0.40 && energy < 0.60) return 'Chocolate (Hot/Iced)';

    // Instrumental / Zen Flow
    if (instrumentalness > 0.60 && energy < 0.50) return 'Matcha Latte';
    if (instrumentalness > 0.50 && energy >= 0.35 && energy <= 0.55) return 'Matcha Macchiato';
    if (valence > 0.60 && energy < 0.55 && acousticness > 0.40) return 'Matcha Coco (Hot/Iced)';
    if (acousticness > 0.65 && energy < 0.50 && tempo < 95) return 'Houjicha Latte';
    if (acousticness > 0.55 && mode === 0 && energy >= 0.35 && energy <= 0.60) return 'Houjicha Macchiato';

    // Floral / Delicate Acoustic
    if (energy < 0.40 && acousticness > 0.70) return 'Jasmine Olong Milk Tea';
    if (mode === 1 && liveness > 0.30) return 'Macchiato Jasmin Olong Tea';
    if (acousticness > 0.50 && valence > 0.60 && energy < 0.55) return 'Lychee Tea';

    // Cinematic Pop / Layered
    if (energy >= 0.55 && energy <= 0.75 && valence > 0.60) return 'Iced Salt Caramel Macchiato';
    if (energy >= 0.45 && energy <= 0.65 && instrumentalness > 0.30) return 'Salted Foam Macchiato';
    if (energy >= 0.45 && energy <= 0.65 && instrumentalness > 0.25) return 'Blueberry Ice Blended';

    // Bright / Tropical Groove
    if (valence > 0.75 && danceability > 0.70) return 'Mango Passion Fruit Smoothie';
    if (valence > 0.75 && energy > 0.65) return 'Orange Mango Peach Smoothie';
    if (energy >= 0.35 && energy <= 0.55 && valence > 0.60) return 'Orange Peach Cold Drip';
    if (valence > 0.70 && energy >= 0.55 && energy <= 0.75) return 'Mango Passion Fruit Juice';

    // Tropical / Vibrant Groove
    if (valence > 0.70 && danceability > 0.65) return 'Passion Fruit Tea';
    if (valence > 0.65 && mode === 1) return 'Peach Orange Tea';
    if (valence > 0.65 && danceability > 0.60) return 'Passion Fruit Juice';

    // Warm Soul / Mid Tempo
    if (energy >= 0.55 && energy <= 0.75 && tempo >= 90 && tempo <= 115) return 'Espresso with Milk (Hot/Iced)';
    if (valence >= 0.50 && valence <= 0.70 && acousticness >= 0.40 && acousticness <= 0.65) return 'Cappuccino (Hot/Iced)';
    if (energy >= 0.40 && energy <= 0.60 && danceability >= 0.50 && danceability <= 0.70) return 'Latte (Hot/Iced)';

    // Acoustic / Grounded Energy
    if (acousticness > 0.75 && tempo < 90) return 'Drip Drop Coffee (Hot/Iced)';
    if (acousticness > 0.60 && energy >= 0.50 && energy <= 0.75) return 'Drip Drop Milk Coffee (Hot/Iced)';
    if (acousticness > 0.65 && energy < 0.50) return 'Drip Drop Fresh Milk Coffee (Hot/Iced)';

    // Gentle Acoustic / Sweet Clarity
    if (acousticness > 0.60 && valence >= 0.30 && valence <= 0.55) return 'Salted Plum Tea';
    if (acousticness > 0.60 && valence > 0.60) return 'Honey Lemon Juice';

    // ── Catch-all (worker): always return a real COFFEE_PAIRINGS drink name ──
    if (energy >= 0.70) return 'Espresso (Hot/Iced)';
    if (energy >= 0.55) return 'Espresso with Milk (Hot/Iced)';
    if (acousticness >= 0.50) return 'Drip Drop Milk Coffee (Hot/Iced)';
    if (valence >= 0.60) return 'Latte (Hot/Iced)';
    if (instrumentalness >= 0.30) return 'Matcha Latte';
    return 'Cappuccino (Hot/Iced)';
  }

  // ─── Estimated / non-worker path ─────────────────────────────────────────
  // Slightly looser thresholds to handle Spotify feature variance.

  // High Energy / Fast Tempo
  if (energy > 0.80 && tempo > 120) return 'Espresso (Hot/Iced)';
  if (valence > 0.70 && mode === 1 && tempo > 110) return 'Orange Espresso (Iced)';
  if (instrumentalness > 0.50 && energy > 0.55) return 'Americano (Hot/Iced)';

  // Deep Chocolate Groove
  if (loudness > -5 && danceability > 0.60) return 'Oreo Ice Blended';
  if (energy > 0.55 && loudness > -8 && valence < 0.65) return 'Mocha (Hot/Iced)';
  if (valence > 0.45 && valence < 0.70 && acousticness > 0.40 && energy < 0.60) return 'Chocolate (Hot/Iced)';

  // Instrumental / Zen Flow
  if (instrumentalness > 0.60 && energy < 0.50) return 'Matcha Latte';
  if (instrumentalness > 0.50 && energy < 0.55) return 'Matcha Macchiato';
  if (valence > 0.60 && energy < 0.55 && acousticness > 0.40) return 'Matcha Coco (Hot/Iced)';
  if (acousticness > 0.65 && energy < 0.50 && tempo < 95) return 'Houjicha Latte';
  if (acousticness > 0.55 && mode === 0 && energy < 0.60) return 'Houjicha Macchiato';

  // Floral / Delicate Acoustic
  if (energy < 0.40 && acousticness > 0.70) return 'Jasmine Olong Milk Tea';
  if (mode === 1 && liveness > 0.30) return 'Macchiato Jasmin Olong Tea';
  if (acousticness > 0.50 && valence > 0.60 && energy < 0.55) return 'Lychee Tea';

  // Cinematic Pop / Layered
  if (energy > 0.55 && energy < 0.75 && valence > 0.60 && liveness < 0.20) return 'Iced Salt Caramel Macchiato';
  if (energy > 0.45 && energy < 0.65 && instrumentalness > 0.30) return 'Salted Foam Macchiato';
  if (energy > 0.45 && energy < 0.65 && instrumentalness > 0.25) return 'Blueberry Ice Blended';

  // Bright / Tropical Groove
  if (valence > 0.75 && danceability > 0.70) return 'Mango Passion Fruit Smoothie';
  if (valence > 0.75 && energy > 0.65) return 'Orange Mango Peach Smoothie';
  if (energy > 0.35 && energy < 0.55 && valence > 0.60) return 'Orange Peach Cold Drip';
  if (valence > 0.70 && energy > 0.55 && energy < 0.75) return 'Mango Passion Fruit Juice';

  // Tropical / Vibrant Groove
  if (valence > 0.70 && danceability > 0.65) return 'Passion Fruit Tea';
  if (valence > 0.65 && mode === 1) return 'Peach Orange Tea';
  if (valence > 0.65 && danceability > 0.60) return 'Passion Fruit Juice';

  // Warm Soul / Mid Tempo
  if (energy > 0.55 && energy < 0.75 && tempo > 90 && tempo < 115) return 'Espresso with Milk (Hot/Iced)';
  if (valence > 0.50 && valence < 0.70 && acousticness > 0.40 && acousticness < 0.65) return 'Cappuccino (Hot/Iced)';
  if (energy > 0.40 && energy < 0.60 && danceability > 0.50 && danceability < 0.70) return 'Latte (Hot/Iced)';

  // Acoustic / Grounded Energy
  if (acousticness > 0.75 && tempo < 90) return 'Drip Drop Coffee (Hot/Iced)';
  if (acousticness > 0.60 && energy > 0.50 && energy < 0.75) return 'Drip Drop Milk Coffee (Hot/Iced)';
  if (acousticness > 0.65 && energy < 0.50) return 'Drip Drop Fresh Milk Coffee (Hot/Iced)';

  // Gentle Acoustic / Sweet Clarity
  if (acousticness > 0.60 && valence > 0.30 && valence < 0.55) return 'Salted Plum Tea';
  if (acousticness > 0.60 && valence > 0.60) return 'Honey Lemon Juice';

  // ── Catch-all: every feature profile must resolve to a real drink name ──
  // These broad rules fire when no specific threshold above matched, ensuring
  // the returned string always matches a COFFEE_PAIRINGS `drink` field.
  if (energy >= 0.70) return 'Espresso (Hot/Iced)';
  if (energy >= 0.55) return 'Espresso with Milk (Hot/Iced)';
  if (acousticness >= 0.50) return 'Drip Drop Milk Coffee (Hot/Iced)';
  if (valence >= 0.60) return 'Latte (Hot/Iced)';
  if (instrumentalness >= 0.30) return 'Matcha Latte';
  return 'Cappuccino (Hot/Iced)';
}
