import React from 'react';
import { SpeakerZone, Language } from '../types';

interface SpotifySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  speakerZone: SpeakerZone;
  onSelectSpeakerZone: (zone: SpeakerZone) => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  language: Language;
}

export const SpotifySyncModal: React.FC<SpotifySyncModalProps> = ({
  isOpen,
  onClose,
  speakerZone,
  onSelectSpeakerZone,
  volume,
  onChangeVolume,
  language,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div
        className="relative w-full max-w-xl bg-[#18181C] border-4 border-[#1DB954] shadow-brutal-xl p-6 sm:p-7 overflow-y-auto max-h-[90vh] text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-[#222018] hover:bg-[#1DB954] hover:text-[#0D0D0E] border-2 border-[#1DB954] flex items-center justify-center font-black text-sm transition-all cursor-pointer shadow-brutal"
        >
          ✕
        </button>

        {/* Header */}
        <div className="space-y-1.5 mb-6 border-b-2 border-[#2E2E38] pb-4">
          <div className="inline-flex items-center gap-2 bg-[#1DB954] text-[#0D0D0E] text-[10px] font-black uppercase px-2 py-0.5 border border-black shadow-brutal">
            <i className="fa-brands fa-spotify"></i>
            {language === 'vi' ? 'SPOTIFY SOUNDSTAGE INTEGRATION' : 'SPOTIFY SOUNDSTAGE INTEGRATION'}
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <span>{language === 'vi' ? 'Đồng Bộ Âm Thanh Quán' : 'Roastery Soundstage Sync'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#1ed760] animate-ping"></span>
          </h2>
          <p className="text-xs text-gray-300 font-medium">
            {language === 'vi'
              ? 'Hệ thống âm thanh Gate 7 được đồng bộ hoá trực tiếp với tài khoản Spotify Barista Master Session.'
              : 'Gate 7 sound system is live-synced with Spotify Barista Master Session.'}
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="p-4 bg-[#141416] border-2 border-[#2E2E38] shadow-brutal space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1DB954]/20 border border-[#1DB954] text-[#1ed760] flex items-center justify-center text-xl shadow-brutal">
                <i className="fa-brands fa-spotify animate-pulse"></i>
              </div>
              <div>
                <div className="text-xs font-black text-white">GATE 7 ROASTERY SOUNDSTAGE #1</div>
                <div className="text-[11px] font-medium text-[#1ed760] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1ed760] inline-block"></span>
                  {language === 'vi' ? 'Đang phát sóng trực tiếp (Lossless 320kbps)' : 'Live broadcasting (Lossless 320kbps)'}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#FEBC11] text-[#0D0D0E] px-2 py-0.5 border border-black">
              72dB STD
            </span>
          </div>

          <div className="pt-2 border-t border-[#262630] flex items-center justify-between text-xs font-bold text-gray-400">
            <span>{language === 'vi' ? 'Độ trễ truyền âm:' : 'Audio latency:'} &lt; 15ms</span>
            <span className="text-[#FEBC11]">100% Hi-Fi Stereo</span>
          </div>
        </div>

        {/* 72dB Standard Calibration */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-gray-300">
              {language === 'vi' ? 'CHUẨN ÂM HỌC QUÁN (70 - 75dB)' : 'ROASTERY ACOUSTIC STANDARD (70 - 75dB)'}
            </span>
            <span className="text-xs font-mono font-black text-[#FEBC11]">72.4 dB OPTIMAL</span>
          </div>
          <div className="w-full bg-[#202026] border-2 border-[#33333E] h-4 p-0.5 shadow-brutal overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 via-[#FEBC11] to-amber-500 h-full w-[72%]"></div>
          </div>
          <p className="text-[11px] text-gray-400">
            {language === 'vi'
              ? 'Âm lượng tại Gate 7 luôn được Barista đo đạc và giữ ở mức 70-75dB, đủ để kích thích sự tập trung và trò chuyện mà không gây mỏi tai.'
              : 'Volume is calibrated to 70–75dB, ideal for creative work and conversation without acoustic fatigue.'}
          </p>
        </div>

        {/* Speaker Zone Routing */}
        <div className="space-y-3 mb-6">
          <label className="block text-xs font-black uppercase text-gray-300">
            {language === 'vi' ? 'ĐIỀU HƯỚNG LOA THEO KHU VỰC' : 'SPEAKER ZONE ROUTING'}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'main', label: 'Gate 7 Main Loa', note: 'Tầng 1 & Tầng 2' },
              { id: 'floor2', label: 'Loa Không Gian Tầng 2', note: 'Khu vực Focus' },
              { id: 'bar', label: 'Quầy Bar Roastery', note: 'Khu vực Pour-over' },
              { id: 'garden', label: 'Loa Ngoài Sân Vườn', note: 'Không gian mở thoáng' },
            ].map((zone) => (
              <button
                key={zone.id}
                onClick={() => onSelectSpeakerZone(zone.id as SpeakerZone)}
                className={`p-3 border-2 text-left shadow-brutal transition-all cursor-pointer ${
                  speakerZone === zone.id
                    ? 'bg-[#24221A] border-[#FEBC11] text-white'
                    : 'bg-[#1E1E24] border-[#2E2E38] text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">{zone.label}</span>
                  {speakerZone === zone.id && <span className="text-[#FEBC11]">●</span>}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{zone.note}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Master Volume Slider */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs font-black uppercase text-gray-300">
            <span>{language === 'vi' ? 'Âm lượng Master' : 'Master Volume'}</span>
            <span className="font-mono text-[#FEBC11]">{volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onChangeVolume(Number(e.target.value))}
            className="w-full accent-[#FEBC11] bg-[#282830] h-2 rounded cursor-pointer"
          />
        </div>

        {/* Action Link */}
        <div className="pt-4 border-t-2 border-[#2E2E38] flex items-center justify-between gap-3">
          <a
            href="https://open.spotify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-brutal flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <i className="fa-brands fa-spotify text-base"></i>
            {language === 'vi' ? 'MỞ TRANG SPOTIFY GATE 7 ROASTERY' : 'OPEN GATE 7 ON SPOTIFY'}
          </a>
        </div>
      </div>
    </div>
  );
};
