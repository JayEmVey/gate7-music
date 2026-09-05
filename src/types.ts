export interface TrackAudioFeatures {
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  key: number;
  liveness: number;
  loudness: number;
  mode: number;
  tempo: number;
  valence: number;
}

export interface Track {
  id: string;
  spotifyId?: string;
  title: string;
  artist: string;
  album?: string;
  duration: string;
  durationSec: number;
  coffeePairing?: string;
  cover?: string;
  coverUrl?: string;
  genre?: string;
  audioFeatures?: TrackAudioFeatures;
  audioFeaturesSource?: 'rapidapi' | 'estimated';
}

export interface Playlist {
  id: string;
  spotifyId?: string;
  title: string;
  slotId: string;
  slotName: string;
  description: string;
  trackCount: number;
  duration: string;
  icon: string;
  accentColor: string;
  coverUrl?: string;
  isNowPlaying?: boolean;
  isHighlighted?: boolean;
  loadError?: string;
  tracks: Track[];
}

export interface TimeSlot {
  id: string;
  slotNumber: string;
  name: string;
  timeRange: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  isCurrentSlot?: boolean;
  playlists: Playlist[];
}

export interface RequestTicket {
  id: string;
  songTitle: string;
  artist: string;
  tableLocation: string;
  note?: string;
  requestedAt: string;
  status: 'next' | 'queued' | 'played';
  queueNumber?: number;
}

export type SpeakerZone = 'main' | 'floor2' | 'bar' | 'garden';

export type Language = 'vi' | 'en';

export type Theme = 'dark' | 'light';

export interface SpotifyWebPlaybackPlayer {
  addListener: (event: string, callback: (data: any) => void) => boolean;
  removeListener: (event: string, callback?: (data: any) => void) => boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  activateElement: () => Promise<void>;
  togglePlay: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  getCurrentState: () => Promise<any | null>;
}

declare global {
  interface Window {
    Spotify?: { Player: new (options: { name: string; getOAuthToken: (callback: (token: string) => void) => void; volume: number }) => SpotifyWebPlaybackPlayer };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}
