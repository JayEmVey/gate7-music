export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: string;
  durationSec: number;
  coffeePairing?: string;
  cover?: string;
  coverUrl?: string;
  genre?: string;
}

export interface Playlist {
  id: string;
  title: string;
  slotId: string;
  slotName: string;
  description: string;
  trackCount: number;
  duration: string;
  icon: string;
  accentColor: string;
  isNowPlaying?: boolean;
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
