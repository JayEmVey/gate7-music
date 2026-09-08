import React from 'react';
import { COFFEE_PAIRINGS } from '../data';
import { Language } from '../types';
import { Track } from '../types';
import { SonicPairingG7Icon } from './SonicPairingG7Icon';
import { getCoffeePairing } from '../utils/pairing';
import { useModalBehavior } from './useModalBehavior';

interface PairingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGenre: (genre: string) => void;
  language: Language;
  currentTrack: Track;
}

export const PairingGuideModal: React.FC<PairingGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectGenre,
  language,
  currentTrack,
}) => {
  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const recommendedDrink = getCoffeePairing(
    currentTrack.audioFeatures,
    currentTrack.coffeePairing || 'Drip Drop Coffee',
    language,
    currentTrack.audioFeaturesSource,
  );
  const recommendedPairing = COFFEE_PAIRINGS.find((item) => item.drink === recommendedDrink);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] bg-[#18181C] border-4 border-[#FEBC11] shadow-brutal-xl p-4 sm:p-8 overflow-y-auto overflow-x-hidden text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pairing-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label={language === 'vi' ? 'Đóng cửa sổ hòa âm' : 'Close pairing window'}
          className="absolute top-5 right-5 z-20 w-8 h-8 bg-[#222018] hover:bg-[#FEBC11] hover:text-[#0D0D0E] border-2 border-[#FEBC11] flex items-center justify-center font-black text-sm transition-all cursor-pointer shadow-brutal"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6 border-b-2 border-[#2E2E38] pb-4">
          <div className="shrink-0 pt-1">
            <SonicPairingG7Icon size="lg" showRipples={true} showSteam={true} />
          </div>

          <div className="space-y-1.5 flex-1 pr-6">
            <div className="inline-flex items-center gap-2 bg-[#FEBC11] text-[#0D0D0E] text-[10px] font-black uppercase px-2 py-0.5 border border-black shadow-brutal">
              <i className="fa-solid fa-mug-hot"></i>
              {language === 'vi' ? 'TRIẾT LÝ HÒA ÂM & VỊ GIÁC' : 'COFFEE & SOUND FREQUENCIES'}
            </div>
            <div className="inline-flex items-center gap-2 mt-2 bg-[#202026] text-[#FEBC11] text-[10px] font-black uppercase px-2 py-0.5 border border-[#FEBC11] shadow-brutal">
              <i className="fa-solid fa-flask"></i>
              {language === 'vi' ? 'THỬ NGHIỆM' : 'TRIAL MODE'}
            </div>
            <h2 id="pairing-modal-title" className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              {language === 'vi' ? 'Hòa Âm Hương Vị Cà Phê Gate 7' : 'Gate 7 Sonic Flavor Pairings'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
              {language === 'vi'
                ? 'Tính năng này đang ở giai đoạn thử nghiệm, nhằm khám phá cách phối âm thanh với hương vị cà phê. Bạn có thể thử trải nghiệm và góp ý để chúng mình hoàn thiện dần.'
                : 'This feature is currently in a trial phase as we explore how sound and coffee flavor can work together. You can try it out and share feedback while we refine it.'}
            </p>
          </div>
        </div>

        <div className="mb-6 border-4 border-[#FEBC11] bg-[#24221A] px-4 py-4 shadow-brutal-gold">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#FEBC11]">
              {language === 'vi' ? 'Spotlight • Hòa âm phù hợp nhất' : 'Spotlight • Sonic pair best match'}
            </div>
            <span className="bg-[#FEBC11] px-2 py-0.5 text-[9px] font-black uppercase text-[#0D0D0E] border border-black">
              {language === 'vi' ? 'Đề xuất cho bạn' : 'Recommended for you'}
            </span>
          </div>
          <div className="mt-2 text-lg font-black uppercase text-white">{recommendedDrink}</div>
          <div className="mt-1 text-xs font-bold text-[#FEBC11]">
            {recommendedPairing?.bestGenre || (language === 'vi' ? 'Đang chờ dữ liệu âm thanh' : 'Waiting for audio data')}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-200">
            {recommendedPairing
              ? language === 'vi'
                ? `Vì ${currentTrack.title} có cấu hình âm thanh gần với nhóm ${recommendedPairing.bestGenre.toLowerCase()}. ${recommendedPairing.description}`
                : `${currentTrack.title} matches the ${recommendedPairing.bestGenre.toLowerCase()} profile. ${recommendedPairing.description}`
              : language === 'vi'
                ? 'Bài hát này chưa có đủ dữ liệu Audio Features để giải thích cặp hòa âm.'
                : 'This track does not have enough Audio Features data to explain a sonic pair yet.'}
          </p>
          {recommendedPairing && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {recommendedPairing.tags.map((tag) => (
                <span key={tag} className="bg-[#141416] px-1.5 py-1 text-[9px] font-bold text-gray-300 border border-[#3E3E4C]">
                  #{tag}
                </span>
              ))}
              <button
                type="button"
                onClick={() => {
                  onSelectGenre(recommendedPairing.bestGenre);
                  onClose();
                }}
                className="ml-auto px-2 py-1 text-[10px] font-black uppercase text-[#FEBC11] hover:bg-[#FEBC11] hover:text-[#0D0D0E] border border-[#FEBC11] transition-colors cursor-pointer"
              >
                {language === 'vi' ? 'Lọc nhạc tương tự →' : 'Filter similar songs →'}
              </button>
            </div>
          )}
        </div>

        {/* Pairing Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {COFFEE_PAIRINGS.map((item) => (
            <div
              key={item.drink}
              className={`p-4 border-2 shadow-brutal flex flex-col justify-between hover:border-[#FEBC11] transition-all group ${
                item.drink === recommendedDrink
                  ? 'bg-[#2A2618] border-[#FEBC11]'
                  : 'bg-[#1F1F24] border-[#2E2E38]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-white group-hover:text-[#FEBC11] transition-colors">
                    {item.drink}
                  </span>
                  <i className="fa-solid fa-fire-flame-curved text-[#FEBC11] text-xs"></i>
                </div>

                <div className="inline-block bg-[#141416] text-[#FEBC11] text-[11px] font-black px-2 py-0.5 border border-[#3E3E4C] mb-2">
                  {language === 'vi' ? 'Hợp nhất:' : 'Pairs with:'} {item.bestGenre}
                </div>

                <p className="text-xs text-gray-300 font-medium leading-relaxed mb-3">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#2A2A34] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <span key={t} className="text-[9px] bg-[#141416] text-gray-400 px-1.5 py-0.5 border border-[#2E2E38]">
                      #{t}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => {
                    onSelectGenre(item.bestGenre);
                    onClose();
                  }}
                  className="self-end sm:self-auto text-[10px] font-black uppercase text-[#FEBC11] hover:underline cursor-pointer"
                >
                  {language === 'vi' ? 'Lọc nhạc này →' : 'Filter this →'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-[#24221A] border-2 border-[#FEBC11] text-xs text-gray-200 shadow-brutal flex items-center gap-3">
          <i className="fa-solid fa-quote-left text-2xl text-[#FEBC11] shrink-0"></i>
          <p className="font-semibold italic">
            {language === 'vi'
              ? '“Uống cà phê ngon tại Gate 7 mà thiếu đi giai điệu đúng lúc cũng như nếm một shot espresso thiếu đi lớp crema bồng bềnh.”'
              : '“Enjoying specialty coffee without the right tune is like tasting an espresso shot without its velvety crema.”'}
          </p>
        </div>
      </div>
    </div>
  );
};
