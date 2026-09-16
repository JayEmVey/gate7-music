import { Language, TrackAudioFeatures } from '../types';
import { getMenuDrinkName } from '../menu';

const drink = (menuItemId: string) => getMenuDrinkName(menuItemId, 'en');

/**
 * Map a track's Spotify audio features to the most fitting Gate 7 menu drink.
 *
 * Rules are ordered from most-specific to most-general so that overlapping
 * feature profiles always resolve to one stable recommendation. The returned
 * string matches the `drink` field in COFFEE_PAIRINGS exactly so the modal
 * can highlight the recommended card.
 *
 * 10 sonic categories → 32 current menu drinks. Rules use stable menu item IDs;
 * customer-facing names are resolved from public/coffee/menu.json.
 */
export function getCoffeePairing(
  features: TrackAudioFeatures | undefined,
  fallback: string,
  language: Language,
  source?: 'worker' | 'estimated',
): string {
  if (!features) return language === 'vi' ? 'Chưa có dữ liệu âm thanh' : 'Audio features unavailable';

  const { energy, tempo, acousticness, instrumentalness, valence, danceability, liveness, loudness, mode } = features;

  // ANALYSIS_CACHE currently stores BPM, energy and musical key. Avoid treating
  // unavailable Spotify dimensions as real zeroes; pair from the cached signals.
  if (features.availableFeatures?.includes('energy') && features.availableFeatures.includes('tempo')) {
    if (energy >= 0.80) return drink(tempo >= 120 && mode === 1 ? 'orange-espresso' : 'espresso');
    if (energy >= 0.65) return drink(tempo >= 118 ? 'fresh-orange-juice' : 'americano');
    if (energy >= 0.50) return drink(tempo >= 105 ? 'milk-espresso' : 'mocha');
    if (energy >= 0.35) return drink(mode === 0 ? 'chocolate' : 'latte');
    if (energy >= 0.20) return drink(tempo < 88 ? 'vietnamese-black-coffee' : 'bac-xiu');
    return drink(tempo < 82 ? 'jasmine-oolong-milk-tea' : tempo < 105 ? 'houjicha-latte' : 'matcha-latte');
  }

  // ─── Authoritative worker path (RapidAPI audio features) ─────────────────
  // Slightly tighter thresholds because worker data is more reliable.
  if (source === 'worker') {
    // High Energy / Fast Tempo
    if (energy >= 0.80 && tempo > 120) return drink('espresso');
    if (valence > 0.70 && mode === 1 && tempo > 110) return drink('orange-espresso');
    if (instrumentalness > 0.50 && energy >= 0.55 && energy <= 0.80) return drink('americano');

    // Deep Chocolate Groove
    if (loudness > -5 && danceability > 0.60) return drink('oreo-ice-blended');
    if (energy >= 0.55 && loudness > -8 && valence < 0.65) return drink('mocha');
    if (valence >= 0.45 && valence <= 0.70 && acousticness > 0.40 && energy < 0.60) return drink('chocolate');

    // Instrumental / Zen Flow
    if (instrumentalness > 0.60 && energy < 0.50) return drink('matcha-latte');
    if (instrumentalness > 0.50 && energy >= 0.35 && energy <= 0.55) return drink('matcha-macchiato');
    if (valence > 0.60 && energy < 0.55 && acousticness > 0.40) return drink('coconut-matcha-latte');
    if (acousticness > 0.65 && energy < 0.50 && tempo < 95) return drink('houjicha-latte');
    if (acousticness > 0.55 && mode === 0 && energy >= 0.35 && energy <= 0.60) return drink('houjicha-macchiato');

    // Floral / Delicate Acoustic
    if (energy < 0.40 && acousticness > 0.70) return drink('jasmine-oolong-milk-tea');
    if (mode === 1 && liveness > 0.30) return drink('jasmine-oolong-macchiato');
    if (acousticness > 0.50 && valence > 0.60 && energy < 0.55) return drink('lychee-tea');

    // Cinematic Pop / Layered
    if (energy >= 0.55 && energy <= 0.75 && valence > 0.60) return drink('salted-caramel-macchiato');
    if (energy >= 0.45 && energy <= 0.65 && instrumentalness > 0.30) return drink('nau-macchiato');
    if (energy >= 0.45 && energy <= 0.65 && instrumentalness > 0.25) return drink('blueberry-ice-blended');

    // Bright / Tropical Groove
    if (valence > 0.75 && danceability > 0.70) return drink('mango-passion-fruit-smoothie');
    if (valence > 0.75 && energy > 0.65) return drink('orange-mango-peach-smoothie');
    if (energy >= 0.35 && energy <= 0.55 && valence > 0.60) return drink('orange-peach-cold-drip');
    if (valence > 0.70 && energy >= 0.55 && energy <= 0.75) return drink('fresh-orange-juice');

    // Tropical / Vibrant Groove
    if (valence > 0.70 && danceability > 0.65) return drink('passion-fruit-tea');
    if (valence > 0.65 && mode === 1) return drink('orange-peach-tea');
    if (valence > 0.65 && danceability > 0.60) return drink('passion-fruit');

    // Warm Soul / Mid Tempo
    if (energy >= 0.55 && energy <= 0.75 && tempo >= 90 && tempo <= 115) return drink('milk-espresso');
    if (valence >= 0.50 && valence <= 0.70 && acousticness >= 0.40 && acousticness <= 0.65) return drink('cappuccino');
    if (energy >= 0.40 && energy <= 0.60 && danceability >= 0.50 && danceability <= 0.70) return drink('latte');

    // Acoustic / Grounded Energy
    if (acousticness > 0.75 && tempo < 90) return drink('vietnamese-black-coffee');
    if (acousticness > 0.60 && energy >= 0.50 && energy <= 0.75) return drink('vietnamese-milk-coffee');
    if (acousticness > 0.65 && energy < 0.50) return drink('bac-xiu');

    // Gentle Acoustic / Sweet Clarity
    if (acousticness > 0.60 && valence >= 0.30 && valence <= 0.55) return drink('salted-plum-tea');
    if (acousticness > 0.60 && valence > 0.60) return drink('honey-lemon');

    // ── Catch-all (worker): always return a real COFFEE_PAIRINGS drink name ──
    if (energy >= 0.70) return drink('espresso');
    if (energy >= 0.55) return drink('milk-espresso');
    if (acousticness >= 0.50) return drink('vietnamese-milk-coffee');
    if (valence >= 0.60) return drink('latte');
    if (instrumentalness >= 0.30) return drink('matcha-latte');
    return drink('cappuccino');
  }

  // ─── Estimated / non-worker path ─────────────────────────────────────────
  // Slightly looser thresholds to handle Spotify feature variance.

  // High Energy / Fast Tempo
  if (energy > 0.80 && tempo > 120) return drink('espresso');
  if (valence > 0.70 && mode === 1 && tempo > 110) return drink('orange-espresso');
  if (instrumentalness > 0.50 && energy > 0.55) return drink('americano');

  // Deep Chocolate Groove
  if (loudness > -5 && danceability > 0.60) return drink('oreo-ice-blended');
  if (energy > 0.55 && loudness > -8 && valence < 0.65) return drink('mocha');
  if (valence > 0.45 && valence < 0.70 && acousticness > 0.40 && energy < 0.60) return drink('chocolate');

  // Instrumental / Zen Flow
  if (instrumentalness > 0.60 && energy < 0.50) return drink('matcha-latte');
  if (instrumentalness > 0.50 && energy < 0.55) return drink('matcha-macchiato');
  if (valence > 0.60 && energy < 0.55 && acousticness > 0.40) return drink('coconut-matcha-latte');
  if (acousticness > 0.65 && energy < 0.50 && tempo < 95) return drink('houjicha-latte');
  if (acousticness > 0.55 && mode === 0 && energy < 0.60) return drink('houjicha-macchiato');

  // Floral / Delicate Acoustic
  if (energy < 0.40 && acousticness > 0.70) return drink('jasmine-oolong-milk-tea');
  if (mode === 1 && liveness > 0.30) return drink('jasmine-oolong-macchiato');
  if (acousticness > 0.50 && valence > 0.60 && energy < 0.55) return drink('lychee-tea');

  // Cinematic Pop / Layered
  if (energy > 0.55 && energy < 0.75 && valence > 0.60 && liveness < 0.20) return drink('salted-caramel-macchiato');
  if (energy > 0.45 && energy < 0.65 && instrumentalness > 0.30) return drink('nau-macchiato');
  if (energy > 0.45 && energy < 0.65 && instrumentalness > 0.25) return drink('blueberry-ice-blended');

  // Bright / Tropical Groove
  if (valence > 0.75 && danceability > 0.70) return drink('mango-passion-fruit-smoothie');
  if (valence > 0.75 && energy > 0.65) return drink('orange-mango-peach-smoothie');
  if (energy > 0.35 && energy < 0.55 && valence > 0.60) return drink('orange-peach-cold-drip');
  if (valence > 0.70 && energy > 0.55 && energy < 0.75) return drink('fresh-orange-juice');

  // Tropical / Vibrant Groove
  if (valence > 0.70 && danceability > 0.65) return drink('passion-fruit-tea');
  if (valence > 0.65 && mode === 1) return drink('orange-peach-tea');
  if (valence > 0.65 && danceability > 0.60) return drink('passion-fruit');

  // Warm Soul / Mid Tempo
  if (energy > 0.55 && energy < 0.75 && tempo > 90 && tempo < 115) return drink('milk-espresso');
  if (valence > 0.50 && valence < 0.70 && acousticness > 0.40 && acousticness < 0.65) return drink('cappuccino');
  if (energy > 0.40 && energy < 0.60 && danceability > 0.50 && danceability < 0.70) return drink('latte');

  // Acoustic / Grounded Energy
  if (acousticness > 0.75 && tempo < 90) return drink('vietnamese-black-coffee');
  if (acousticness > 0.60 && energy > 0.50 && energy < 0.75) return drink('vietnamese-milk-coffee');
  if (acousticness > 0.65 && energy < 0.50) return drink('bac-xiu');

  // Gentle Acoustic / Sweet Clarity
  if (acousticness > 0.60 && valence > 0.30 && valence < 0.55) return drink('salted-plum-tea');
  if (acousticness > 0.60 && valence > 0.60) return drink('honey-lemon');

  // ── Catch-all: every feature profile must resolve to a real drink name ──
  // These broad rules fire when no specific threshold above matched, ensuring
  // the returned string always matches a COFFEE_PAIRINGS `drink` field.
  if (energy >= 0.70) return drink('espresso');
  if (energy >= 0.55) return drink('milk-espresso');
  if (acousticness >= 0.50) return drink('vietnamese-milk-coffee');
  if (valence >= 0.60) return drink('latte');
  if (instrumentalness >= 0.30) return drink('matcha-latte');
  return drink('cappuccino');
}
