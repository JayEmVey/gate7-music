import { TimeSlot, Track, RequestTicket } from './types';
import bossaNovaCover from './assets/images/bossa_nova_cover_1788508105737.jpg';

export const DEFAULT_TRACK_COVER = bossaNovaCover;

export const getTrackCover = (track?: Track | null): string => {
  if (track?.coverUrl) return track.coverUrl;
  if (track?.cover) return track.cover;
  return bossaNovaCover;
};

export const BLOSSOM_TRACK: Track = {
  id: 't-blossom',
  spotifyId: '4Hv7TnBfBCzSCbqH0k4RhE',
  title: 'blossom',
  artist: 'ai sayuri',
  album: 'blossom • Late Night Beats',
  duration: '02:03',
  durationSec: 123,
  coffeePairing: 'Drip Drop Coffee',
  genre: 'Lofi Beats / Late Night Chill',
  coverUrl: 'https://i.scdn.co/image/ab67616d0000b27394ea3a7959758c1bf262e716',
};

export const INITIAL_TRACK: Track = {
  id: 't-bossa',
  spotifyId: '37i9dQZF1DWT2oR9BciC32',
  title: 'Chega de Saudade (Bossa Nova Cover)',
  artist: 'Mats & My',
  album: 'Mats & My Bossa Nova Covers',
  duration: '03:45',
  durationSec: 225,
  coffeePairing: 'Cold Brew Cam Vàng & V60 Pour-over',
  genre: 'Bossa Nova Acoustic',
  coverUrl: bossaNovaCover,
};

export const INITIAL_TIME_SLOTS: TimeSlot[] = [
  // Slot 2: 9 AM - 11 AM: Cộng Đồng Buổi Sáng (The Default Current Featured Slot in Image 1 & 2)
  {
    id: 'slot-afternoon',
    slotNumber: 'SLOT #2',
    name: 'CỘNG ĐỒNG BUỔI SÁNG',
    timeRange: '9 AM – 11 AM',
    description: 'Tinh tế và thư giãn. Tuyển chọn V-Indie & acoustic cho cuộc trò chuyện và kết nối năng lượng.',
    accentColor: '#FEBC11',
    badgeBg: '#FEBC11',
    badgeText: '#0D0D0E',
    playlists: [
      {
        id: 'bossa-nova-indie',
        spotifyId: '37i9dQZF1DWT2oR9BciC32',
        title: 'BOSSA NOVA & INDIE ACOUSTIC',
        slotId: 'slot-afternoon',
        slotName: '9 AM – 11 AM',
        description: 'Bossa Nova mộc mạc và Acoustic sâu lắng bên tách cà phê.',
        trackCount: 42,
        duration: '2H 45M',
        icon: 'fa-music',
        accentColor: '#FEBC11',
        isNowPlaying: true,
        tracks: [
          { id: 't-bossa', spotifyId: '37i9dQZF1DWT2oR9BciC32', title: 'Chega de Saudade (Bossa Nova Cover)', artist: 'Mats & My', duration: '03:45', durationSec: 225, coffeePairing: 'Cold Brew Cam Vàng & V60 Pour-over', coverUrl: bossaNovaCover },
          { id: 't-1', spotifyId: '37i9dQZF1DWT2oR9BciC32', title: 'Lời Nhắn', artist: 'Quyếch', duration: '03:45', durationSec: 225, coffeePairing: 'Cà phê Muối', coverUrl: bossaNovaCover },
          { id: 't-2', spotifyId: '37i9dQZF1DWT2oR9BciC32', title: 'Mùa Hè Của Em', artist: 'Vũ.', duration: '04:12', durationSec: 252, coffeePairing: 'Cold Brew Mơ Rừng' },
          { id: 't-3', spotifyId: '37i9dQZF1DWT2oR9BciC32', title: 'Chuyện Những Người Yêu Xa', artist: 'Vũ Cát Tường', duration: '03:58', durationSec: 238, coffeePairing: 'Latte Hạnh Nhân' },
          { id: 't-4', spotifyId: '37i9dQZF1DWT2oR9BciC32', title: 'Đi Về Phía Mưa', artist: 'Thái Đinh', duration: '04:20', durationSec: 260, coffeePairing: 'Pour-over Ethiopia' },
          { id: 't-5', spotifyId: '37i9dQZF1DWT2oR9BciC32', title: 'Có Những Ngày Ơi', artist: 'Trần Duy Đạt', duration: '03:32', durationSec: 212, coffeePairing: 'Cà phê Sữa Tươi' },
        ],
      },
      {
        id: 'soft-pop-hits',
        spotifyId: '37i9dQZF1DWTwnEm1IYyoj',
        title: 'SOFT POP HITS',
        slotId: 'slot-afternoon',
        slotName: '9 AM – 11 AM',
        description: 'Giai điệu bắt tai êm dịu, khởi đầu ngày mới đầy cảm hứng.',
        trackCount: 38,
        duration: '2H 10M',
        icon: 'fa-cloud-sun',
        accentColor: '#FEBC11',
        tracks: [
          { id: 't-6', title: 'Until I Found You', artist: 'Stephen Sanchez', duration: '02:58', durationSec: 178, coffeePairing: 'Cappuccino Kem Béo' },
          { id: 't-7', title: 'Golden Hour (Acoustic)', artist: 'JVKE', duration: '03:29', durationSec: 209, coffeePairing: 'Americano Đá' },
          { id: 't-8', title: 'Here With Me', artist: 'd4vd', duration: '04:02', durationSec: 242, coffeePairing: 'Flat White' },
          { id: 't-9', title: 'Double Take (Stripped)', artist: 'dhruv', duration: '02:51', durationSec: 171, coffeePairing: 'Mocha Nóng' },
        ],
      },
      {
        id: 'lofi-lau-fai',
        spotifyId: '37i9dQZF1DX5HzXEElAlcz',
        title: 'LOFI LÂU FAI',
        slotId: 'slot-afternoon',
        slotName: '9 AM – 11 AM',
        description: 'Nhịp không lời êm đềm, hợp với Pour-over V60 và khoảnh khắc lắng đọng.',
        trackCount: 55,
        duration: '3H 20M',
        icon: 'fa-headphones',
        accentColor: '#C084FC',
        tracks: [
          { id: 't-10', title: 'Roastery Morning Rain', artist: 'Gate 7 Sound Lab', duration: '03:15', durationSec: 195, coffeePairing: 'Pour-over V60 Kenya' },
          { id: 't-11', title: 'Coffee Beans & Tape Hiss', artist: 'Kavv', duration: '02:44', durationSec: 164, coffeePairing: 'Espresso Tonic' },
          { id: 't-12', title: 'Old Quarter Lo-fi', artist: 'Hanoi Tape', duration: '03:30', durationSec: 210, coffeePairing: 'Bạc Xỉu 3 Tầng' },
        ],
      },
      {
        id: 'indie-pop',
        spotifyId: '37i9dQZF1DXbO6rt3GhXDY',
        title: 'INDIE POP',
        slotId: 'slot-afternoon',
        slotName: '9 AM – 11 AM',
        description: 'Sáng tạo & năng lượng trẻ trung cho không gian năng động.',
        trackCount: 34,
        duration: '1H 55M',
        icon: 'fa-guitar',
        accentColor: '#F472B6',
        tracks: [
          { id: 't-13', title: 'Cà phê Một Mình', artist: 'Thịnh Suy', duration: '03:40', durationSec: 220, coffeePairing: 'Cà phê Phin Truyền Thống' },
          { id: 't-14', title: 'Say Goodbye', artist: 'Trang ft. Tiên Tiên', duration: '03:15', durationSec: 195, coffeePairing: 'Cold Brew Cam Vàng' },
          { id: 't-15', title: 'Dấu Mưa (Acoustic 2024)', artist: 'Trung Quân', duration: '04:05', durationSec: 245, coffeePairing: 'Matcha Espresso' },
        ],
      },
    ],
  },

  // Slot 1: 6 AM - 9 AM: Khách Buổi Sáng (Tỉnh Thức Sớm)
  {
    id: 'slot-morning',
    slotNumber: 'SLOT #1',
    name: 'KHÁCH BUỔI SÁNG (TỈNH THỨC SỚM)',
    timeRange: '6 AM – 9 AM',
    description: 'Thức dậy nhẹ nhàng. Nhạc jazz và acoustic tràn đầy sinh khí cho ngày mới.',
    accentColor: '#FEBC11',
    badgeBg: '#202026',
    badgeText: '#FEBC11',
    playlists: [
      {
        id: 'ca-phe-quan-quen',
        spotifyId: '37i9dQZF1DX1e2VSJFudND',
        title: 'CÀ PHÊ QUÁN QUEN',
        slotId: 'slot-morning',
        slotName: '6 AM – 9 AM',
        description: 'Acoustic sáng sớm mộc mạc.',
        trackCount: 32,
        duration: '2h 15m',
        icon: 'fa-mug-hot',
        accentColor: '#FEBC11',
        tracks: [
          { id: 't-16', title: 'Bình Minh Trên Phố', artist: 'Hanoi Acoustic Trio', duration: '03:22', durationSec: 202, coffeePairing: 'Phin Đen Nóng' },
          { id: 't-17', title: 'Tỉnh Thức Bên Tách Nâu', artist: 'Roastery Ensemble', duration: '04:10', durationSec: 250, coffeePairing: 'Nâu Lắc Bọt Sữa' },
          { id: 't-17b', title: 'Hương Cà Phê Mới', artist: 'Gate 7 Acoustic', duration: '03:45', durationSec: 225, coffeePairing: 'Americano Nóng' },
        ],
      },
      {
        id: 'coffeehouse-chill',
        spotifyId: '5TF1ki4BzMFfotw57juFTY',
        title: 'COFFEEHOUSE CHILL',
        slotId: 'slot-morning',
        slotName: '6 AM – 9 AM',
        description: 'Êm dịu & thư thái đón bình minh.',
        trackCount: 28,
        duration: '1h 48m',
        icon: 'fa-mug-saucer',
        accentColor: '#FEBC11',
        tracks: [
          { id: 't-18', title: 'Sunrise Over West Lake', artist: 'Acoustic Soul', duration: '03:45', durationSec: 225, coffeePairing: 'Americano Nóng' },
          { id: 't-19', title: 'Morning Dew Drops', artist: 'Sweet Acoustic', duration: '03:12', durationSec: 192, coffeePairing: 'Latte Mật Ong' },
        ],
      },
      {
        id: 'chillhop-morning-boost',
        spotifyId: '0UwwHD89mULI8HYYH2ejJN',
        title: 'CHILLHOP MORNING BOOST',
        slotId: 'slot-morning',
        slotName: '6 AM – 9 AM',
        description: 'Giai điệu tích cực tỉnh táo.',
        trackCount: 46,
        duration: '3h 05m',
        icon: 'fa-bolt',
        accentColor: '#FEBC11',
        tracks: [
          { id: 't-20', title: 'Espresso Machine Kick', artist: 'Beat Roaster', duration: '02:50', durationSec: 170, coffeePairing: 'Double Espresso' },
          { id: 't-21', title: 'Fresh Brew Energy', artist: 'Lofi Flow', duration: '03:05', durationSec: 185, coffeePairing: 'Cold Brew Đậm Vị' },
        ],
      },
      {
        id: 'bossa-nova-jazz-mix',
        spotifyId: '37i9dQZF1EIcyFDXQX9B1P',
        title: 'BOSSA NOVA JAZZ MIX',
        slotId: 'slot-morning',
        slotName: '6 AM – 9 AM',
        description: 'Ấm áp, acoustic êm dịu đón ngày mới.',
        trackCount: 36,
        duration: '2h 30m',
        icon: 'fa-martini-glass-citrus',
        accentColor: '#FEBC11',
        isHighlighted: true,
        tracks: [
          { id: 't-22', title: 'Girl from Ipanema (Acoustic)', artist: 'Astrud Trio', duration: '03:35', durationSec: 215, coffeePairing: 'Cappuccino Quế' },
          { id: 't-23', title: 'Desafinado Guitar Sessions', artist: 'Joao Roastery', duration: '04:15', durationSec: 255, coffeePairing: 'Cortado' },
        ],
      },
    ],
  },

  // Slot 3: 11 AM - 3 PM: Trưa & Chiều (Focus & Deep Work)
  {
    id: 'slot-lunch',
    slotNumber: 'SLOT #3',
    name: 'TRƯA & CHIỀU (FOCUS & DEEP WORK)',
    timeRange: '11 AM – 3 PM',
    description: 'Đa dạng và tập trung. Sự kết hợp lo-fi và ambient cho làm việc hiệu quả.',
    accentColor: '#3B82F6',
    badgeBg: '#202026',
    badgeText: '#60A5FA',
    playlists: [
      {
        id: 'lofi-deep-focus',
        spotifyId: '0EAo4yaK5HfxrsQXAqaOLz',
        title: 'LOFI DEEP FOCUS',
        slotId: 'slot-lunch',
        slotName: '11 AM – 3 PM',
        description: 'Làm việc không xao nhãng.',
        trackCount: 60,
        duration: '4h 12m',
        icon: 'fa-laptop-code',
        accentColor: '#3B82F6',
        tracks: [
          { id: 't-24', title: 'Code & Caffeine', artist: 'Dev Beats', duration: '03:10', durationSec: 190, coffeePairing: 'Cold Brew Trực Tiếp' },
          { id: 't-25', title: 'Deep Flow State', artist: 'Theta Wave', duration: '04:30', durationSec: 270, coffeePairing: 'Americano Không Đường' },
        ],
      },
      {
        id: 'acoustic-ambient',
        spotifyId: '37i9dQZF1DX4TnpT6vw5rE',
        title: 'ACOUSTIC AMBIENT',
        slotId: 'slot-lunch',
        slotName: '11 AM – 3 PM',
        description: 'Khoáng đạt rộng mở.',
        trackCount: 35,
        duration: '2h 40m',
        icon: 'fa-wind',
        accentColor: '#3B82F6',
        tracks: [
          { id: 't-26', title: 'Echoes of Timber', artist: 'Hollow Sound', duration: '03:55', durationSec: 235, coffeePairing: 'Pour-over Costa Rica' },
        ],
      },
      {
        id: 'brain-food',
        spotifyId: '37i9dQZF1DWXLeA8Omikj7',
        title: 'BRAIN FOOD',
        slotId: 'slot-lunch',
        slotName: '11 AM – 3 PM',
        description: 'Nuôi dưỡng ý tưởng.',
        trackCount: 48,
        duration: '3h 15m',
        icon: 'fa-brain',
        accentColor: '#3B82F6',
        tracks: [
          { id: 't-27', title: 'Synapses Sparking', artist: 'Neural Cafe', duration: '03:18', durationSec: 198, coffeePairing: 'Flat White Yến Mạch' },
        ],
      },
      {
        id: 'nhac-khong-loi-bat-hu',
        spotifyId: '4ix9zZP0j6aBefvZb8ectV',
        title: 'KHÔNG LỜI BẤT HỦ',
        slotId: 'slot-lunch',
        slotName: '11 AM – 3 PM',
        description: 'Cảm xúc lắng đọng.',
        trackCount: 40,
        duration: '2h 50m',
        icon: 'fa-record-vinyl',
        accentColor: '#3B82F6',
        tracks: [
          { id: 't-28', title: 'Nắng Thủy Tinh (Guitar Solo)', artist: 'Trịnh Chill', duration: '04:22', durationSec: 262, coffeePairing: 'Cà phê Trứng Hà Nội' },
        ],
      },
    ],
  },

  // Slot 4: 3 PM - 10 PM: Không Khí Buổi Tối & Chill Sau Giờ Làm
  {
    id: 'slot-evening',
    slotNumber: 'SLOT #4',
    name: 'KHÔNG KHÍ BUỔI TỐI & CHILL SAU GIỜ LÀM',
    timeRange: '3 PM – 10 PM',
    description: 'Hiện đại và ấm áp. Những ca khúc thịnh hành cho buổi tối gắn kết.',
    accentColor: '#A855F7',
    badgeBg: '#202026',
    badgeText: '#C084FC',
    playlists: [
      {
        id: 'v-pop-ngay-hom-qua',
        spotifyId: '37i9dQZF1DX0Bm9rVRYPcY',
        title: 'V-POP NGÀY HÔM QUA',
        slotId: 'slot-evening',
        slotName: '3 PM – 10 PM',
        description: 'Hoài niệm thanh xuân với những bản hit V-Pop chọn lọc.',
        trackCount: 38,
        duration: '2h 45m',
        icon: 'fa-heart',
        accentColor: '#A855F7',
        tracks: [
          { id: 't-29', title: 'Cơn Mưa Ngang Qua (Unplugged)', artist: 'M-TP Acoustic', duration: '03:40', durationSec: 220, coffeePairing: 'Cà phê Cốt Dừa' },
          { id: 't-30', title: 'Nơi Này Có Anh (Jazz Version)', artist: 'Gate 7 Live Band', duration: '04:15', durationSec: 255, coffeePairing: 'Irish Coffee' },
        ],
      },
      {
        id: 'late-night-beats',
        spotifyId: '37i9dQZF1DXdipfKDeMPTE',
        title: 'LATE NIGHT BEATS',
        slotId: 'slot-evening',
        slotName: '3 PM – 10 PM',
        description: 'Thị thành lung linh ánh đèn đêm, nhịp beat êm dịu.',
        trackCount: 44,
        duration: '3h 10m',
        icon: 'fa-moon',
        accentColor: '#A855F7',
        tracks: [
          BLOSSOM_TRACK,
          { id: 't-kerosene', spotifyId: '2b0CjM0gN5tK1R3lQ7y9w', title: 'Kerosene', artist: 'Thélian', album: 'Kerosene', duration: '01:42', durationSec: 102, coffeePairing: 'Cold Brew Cam', coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80' },
          { id: 't-nightwalk', spotifyId: '1oX9rM4sV6tK1R3lQ7y9w', title: 'night walk', artist: 'sad notes', album: 'night walk', duration: '02:33', durationSec: 153, coffeePairing: 'Nâu Đá Đậm Vị', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80' },
          { id: 't-daffodil', spotifyId: '5mX9rM4sV6tK1R3lQ7y9w', title: 'Daffodil', artist: 'nate2timez', album: 'Daffodil', duration: '02:18', durationSec: 138, coffeePairing: 'Latte Nóng', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80' },
          { id: 't-passenger', spotifyId: '7pX9rM4sV6tK1R3lQ7y9w', title: 'Passenger of the Evening', artist: 'Rumi', album: 'Passenger of the Evening', duration: '02:24', durationSec: 144, coffeePairing: 'Cold Brew Tonic', coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80' },
        ],
      },
      {
        id: 'night-pop',
        spotifyId: '37i9dQZF1DXbcP8BbYEQaO',
        title: 'NIGHT POP',
        slotId: 'slot-evening',
        slotName: '3 PM – 10 PM',
        description: 'Thịnh hành quốc tế, giai điệu cuốn hút cho buổi tối.',
        trackCount: 30,
        duration: '2h 20m',
        icon: 'fa-star',
        accentColor: '#A855F7',
        tracks: [
          { id: 't-32', title: 'Midnight City (Slowed Chill)', artist: 'Retro Soundstage', duration: '04:02', durationSec: 242, coffeePairing: 'Espresso Martini Mocktail' },
        ],
      },
      {
        id: 'evening-jazz',
        spotifyId: '37i9dQZF1DWXSyfX6gqDNp',
        title: 'EVENING JAZZ',
        slotId: 'slot-evening',
        slotName: '3 PM – 10 PM',
        description: 'Jazz êm dịu, không gian trầm ấm sau ngày dài.',
        trackCount: 42,
        duration: '2h 35m',
        icon: 'fa-wine-glass',
        accentColor: '#A855F7',
        tracks: [
          { id: 't-33', title: 'Autumn Leaves Over Saigon', artist: 'Hanoi Jazz Quartet', duration: '04:50', durationSec: 290, coffeePairing: 'Cà phê Kem Khói' },
        ],
      },
    ],
  },
];

export const INITIAL_REQUESTS: RequestTicket[] = [
  {
    id: 'req-1',
    songTitle: 'Có Những Ngày Ơi',
    artist: 'Trần Duy Đạt',
    tableLocation: 'Bàn 04 • V-Indie Acoustic',
    status: 'next',
    requestedAt: '11:15',
    queueNumber: 1,
  },
  {
    id: 'req-2',
    songTitle: 'Autumn in Hanoi (Acoustic)',
    artist: 'Quán Nhạc G7',
    tableLocation: 'Quầy Bar Roaster G7',
    status: 'queued',
    requestedAt: '11:18',
    queueNumber: 2,
  },
  {
    id: 'req-3',
    songTitle: 'Tách Cà Phê Số 7',
    artist: 'Hà Anh Tuấn Cover',
    tableLocation: 'Bàn 12 • Không gian Tầng 2',
    status: 'queued',
    requestedAt: '11:22',
    queueNumber: 3,
  },
];

// ─── Sonic Pairing Categories ────────────────────────────────────────────────
// Each drink is assigned to one of 10 sonic categories. Drinks that share the
// same `bestGenre` string are rendered together in the PairingGuideModal.

export const COFFEE_PAIRINGS = [
  // ── Category 1: High Energy / Fast Tempo ──────────────────────────────────
  {
    drink: 'Espresso (Hot/Iced)',
    bestGenre: 'High Energy / Fast Tempo',
    description: 'Intense, sharp, and purely focused. High-energy tracks with a fast beat match the kick of 100% Vietnamese Arabica.',
    tags: ['Energy > 0.80', 'Tempo > 120', 'Focused'],
  },
  {
    drink: 'Orange Espresso (Iced)',
    bestGenre: 'High Energy / Fast Tempo',
    description: 'Bold espresso meets fresh orange — bright, punchy, and alive. Uplifting major-key tracks with fast tempo mirror the citrus kick.',
    tags: ['Valence > 0.70', 'Mode = Major', 'Tempo > 110'],
  },
  {
    drink: 'Americano (Hot/Iced)',
    bestGenre: 'High Energy / Fast Tempo',
    description: 'Clean, direct, no fuss. Post-rock or driving instrumental tracks match the clarity and focused energy of a straight Americano.',
    tags: ['Instrumentalness > 0.50', 'Energy 0.55–0.80', 'Clean'],
  },

  // ── Category 2: Acoustic / Grounded Energy ────────────────────────────────
  {
    drink: 'Drip Drop Coffee (Hot/Iced)',
    bestGenre: 'Acoustic / Grounded Energy',
    description: 'Pure, unfussy, just coffee. Raw fingerpicked acoustic or slow folk — nothing layered, nothing rushed.',
    tags: ['Acousticness > 0.75', 'Tempo < 90', 'Raw'],
  },
  {
    drink: 'Drip Drop Milk Coffee (Hot/Iced)',
    bestGenre: 'Acoustic / Grounded Energy',
    description: 'Traditional, strong but comforting. Organic instruments and a steady energy echo the slow-drip phin and sweet condensed milk.',
    tags: ['Acousticness > 0.60', 'Energy 0.50–0.75', 'Comforting'],
  },
  {
    drink: 'Drip Drop Fresh Milk Coffee (Hot/Iced)',
    bestGenre: 'Acoustic / Grounded Energy',
    description: 'Light, creamy Bạc Xỉu. Breezy acoustic tracks with gentle energy mirror the freshness of milk over slow-drip Robusta.',
    tags: ['Acousticness > 0.65', 'Energy < 0.50', 'Breezy'],
  },

  // ── Category 3: Warm Soul / Mid Tempo ─────────────────────────────────────
  {
    drink: 'Espresso with Milk (Hot/Iced)',
    bestGenre: 'Warm Soul / Mid Tempo',
    description: 'Espresso softened by milk — intensity mellowed into smoothness. Warm jazz or mid-tempo R&B fits perfectly.',
    tags: ['Energy 0.55–0.75', 'Tempo 90–115', 'Smooth'],
  },
  {
    drink: 'Cappuccino (Hot/Iced)',
    bestGenre: 'Warm Soul / Mid Tempo',
    description: 'Balanced foam and espresso — classic coffeehouse warmth. Soul or classic acoustic with a steady, welcoming tempo.',
    tags: ['Valence 0.50–0.70', 'Acousticness 0.40–0.65', 'Classic'],
  },
  {
    drink: 'Latte (Hot/Iced)',
    bestGenre: 'Warm Soul / Mid Tempo',
    description: 'Softened, milky, unhurried. Neo-soul or smooth R&B with gentle groove keep the latte energy exactly right.',
    tags: ['Energy 0.40–0.60', 'Danceability 0.50–0.70', 'Velvety'],
  },

  // ── Category 4: Deep Chocolate Groove ────────────────────────────────────
  {
    drink: 'Mocha (Hot/Iced)',
    bestGenre: 'Deep Chocolate Groove',
    description: 'Espresso and chocolate — rich, dark, soulful. Deep groove tracks with a heavy low end bring out every layer of mocha.',
    tags: ['Energy 0.55–0.75', 'Loudness > -8 dB', 'Soulful'],
  },
  {
    drink: 'Chocolate (Hot/Iced)',
    bestGenre: 'Deep Chocolate Groove',
    description: 'Pure comfort in a cup. Warm piano ballads or orchestral pop wrap around the comforting depth of pure chocolate.',
    tags: ['Valence 0.45–0.70', 'Acousticness > 0.40', 'Comforting'],
  },
  {
    drink: 'Oreo Ice Blended',
    bestGenre: 'Deep Chocolate Groove',
    description: 'Indulgent, rich, and fun. Punchy, highly produced tracks suit the chocolatey, cookie-filled treat-yourself mood.',
    tags: ['Loudness > -5 dB', 'Danceability > 0.60', 'Indulgent'],
  },

  // ── Category 5: Bright / Tropical Groove ──────────────────────────────────
  {
    drink: 'Mango Passion Fruit Smoothie',
    bestGenre: 'Bright / Tropical Groove',
    description: 'Bright, tropical, tangy, and refreshing. Euphoric, cheerful tracks with an irresistible groove mirror ripe mango and zesty passion fruit.',
    tags: ['Valence > 0.75', 'Danceability > 0.70', 'Refreshing'],
  },
  {
    drink: 'Orange Mango Peach Smoothie',
    bestGenre: 'Bright / Tropical Groove',
    description: 'Triple-fruit explosion of sweetness and zest. Afrobeats or high-energy sunny groove match this vibrant blend perfectly.',
    tags: ['Valence > 0.75', 'Energy > 0.65', 'Sunny'],
  },
  {
    drink: 'Orange Peach Cold Drip',
    bestGenre: 'Bright / Tropical Groove',
    description: 'Cold drip smoothness layered with fruit brightness. Chill melodic tracks with a refreshing lift echo the sweet-citrus finish.',
    tags: ['Energy 0.35–0.55', 'Valence > 0.60', 'Chill Melodic'],
  },
  {
    drink: 'Mango Passion Fruit Juice',
    bestGenre: 'Bright / Tropical Groove',
    description: 'Pure fruit, nothing added. Clean fresh pop with genuine uplift — no overdone production, just natural brightness.',
    tags: ['Valence > 0.70', 'Energy 0.55–0.75', 'Pure'],
  },

  // ── Category 6: Instrumental / Zen Flow ───────────────────────────────────
  {
    drink: 'Matcha Latte',
    bestGenre: 'Instrumental / Zen Flow',
    description: 'Earthy, pure, zen, and balanced. Instrumental low-energy tracks create the grounded flow state of a smooth matcha latte.',
    tags: ['Instrumentalness > 0.60', 'Energy < 0.50', 'Zen'],
  },
  {
    drink: 'Matcha Coco (Hot/Iced)',
    bestGenre: 'Instrumental / Zen Flow',
    description: 'Matcha meets coconut water — tropical and light. Ambient grooves with gentle texture suit this breezy tropical zen.',
    tags: ['Energy < 0.55', 'Valence > 0.60', 'Tropical Zen'],
  },
  {
    drink: 'Matcha Macchiato',
    bestGenre: 'Instrumental / Zen Flow',
    description: 'Bold matcha with milk contrast — zen but present. Focused instrumental tracks in a minor key hold the right tension.',
    tags: ['Instrumentalness > 0.50', 'Energy 0.35–0.55', 'Focused Zen'],
  },
  {
    drink: 'Houjicha Latte',
    bestGenre: 'Instrumental / Zen Flow',
    description: 'Roasted, nutty, deeply grounded. Earthy acoustic folk with warm mid frequencies brings out the toasted depth of houjicha.',
    tags: ['Acousticness > 0.65', 'Energy < 0.50', 'Earthy'],
  },
  {
    drink: 'Houjicha Macchiato',
    bestGenre: 'Instrumental / Zen Flow',
    description: 'Bold nutty houjicha with a creamy contrast layer. Indie folk in a minor key captures this warm, layered complexity.',
    tags: ['Acousticness > 0.55', 'Mode = Minor', 'Warm'],
  },

  // ── Category 7: Cinematic Pop / Layered ───────────────────────────────────
  {
    drink: 'Iced Salt Caramel Macchiato',
    bestGenre: 'Cinematic Pop / Layered',
    description: 'Sweet and salty in beautiful contrast — elegantly layered. Cinematic pop with multi-layered production mirrors every sip.',
    tags: ['Energy 0.55–0.75', 'Valence > 0.60', 'Cinematic'],
  },
  {
    drink: 'Salted Foam Macchiato',
    bestGenre: 'Cinematic Pop / Layered',
    description: 'Silky salted foam over bold phin — minimal yet memorable. Atmospheric indie with dynamic tension between light and dark.',
    tags: ['Energy 0.45–0.65', 'Instrumentalness > 0.30', 'Atmospheric'],
  },
  {
    drink: 'Blueberry Ice Blended',
    bestGenre: 'Cinematic Pop / Layered',
    description: 'Cool, smooth, fruity, and mysterious. Chill electronic with a subtle night vibe suits the deep purple, icy smoothness.',
    tags: ['Energy 0.45–0.65', 'Instrumentalness > 0.25', 'Night Vibe'],
  },

  // ── Category 8: Floral / Delicate Acoustic ────────────────────────────────
  {
    drink: 'Jasmine Olong Milk Tea',
    bestGenre: 'Floral / Delicate Acoustic',
    description: 'Velvety, delicate, and simple. Soft acoustic tracks keep the energy gentle around smooth milk and floral jasmine notes.',
    tags: ['Energy < 0.40', 'Acousticness > 0.70', 'Delicate'],
  },
  {
    drink: 'Macchiato Jasmin Olong Tea',
    bestGenre: 'Floral / Delicate Acoustic',
    description: 'Graceful and layered — creamy foam atop fragrant jasmine oolong. Major-key tracks with live room texture feel just right.',
    tags: ['Mode = Major', 'Liveness > 0.30', 'Graceful'],
  },
  {
    drink: 'Lychee Tea',
    bestGenre: 'Floral / Delicate Acoustic',
    description: 'Exotic, floral, lightly sweet lychee. Dream pop or ethereal indie with soft acoustic textures matches this fragrant brew.',
    tags: ['Acousticness > 0.50', 'Valence > 0.60', 'Ethereal'],
  },

  // ── Category 9: Tropical / Vibrant Groove ────────────────────────────────
  {
    drink: 'Passion Fruit Tea',
    bestGenre: 'Tropical / Vibrant Groove',
    description: 'Vibrant, lively, and citrusy. World music or tropical upbeat tracks with danceable energy match the bold passion fruit punch.',
    tags: ['Valence > 0.70', 'Danceability > 0.65', 'Vibrant'],
  },
  {
    drink: 'Peach Orange Tea',
    bestGenre: 'Tropical / Vibrant Groove',
    description: 'Sweet peach meets zesty orange — bright and optimistic. Indie pop in a major key with uplifting energy fits this sunny blend.',
    tags: ['Valence > 0.65', 'Mode = Major', 'Sunny Indie'],
  },
  {
    drink: 'Passion Fruit Juice',
    bestGenre: 'Tropical / Vibrant Groove',
    description: 'Pure passion fruit punch — unfiltered tropical energy. Danceable groove tracks with high energy match the bold, tangy burst.',
    tags: ['Valence > 0.65', 'Danceability > 0.60', 'Energetic'],
  },

  // ── Category 10: Gentle Acoustic / Sweet Clarity ─────────────────────────
  {
    drink: 'Salted Plum Tea',
    bestGenre: 'Gentle Acoustic / Sweet Clarity',
    description: 'Crisp tea with gentle tartness — introspective and calming. Wabi-sabi acoustic with thoughtful, understated arrangements.',
    tags: ['Acousticness > 0.60', 'Valence 0.30–0.55', 'Introspective'],
  },
  {
    drink: 'Honey Lemon Juice',
    bestGenre: 'Gentle Acoustic / Sweet Clarity',
    description: 'Sweet lemon balanced by warm honey — clear and honest. Gentle acoustic tracks with warm tones and simple clarity.',
    tags: ['Acousticness > 0.60', 'Valence > 0.60', 'Warm Clarity'],
  },
];
