import React from 'react';
import { COFFEE_PAIRINGS } from '../data';
import { Language } from '../types';
import { SonicPairingG7Icon } from './SonicPairingG7Icon';

interface PairingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGenre: (genre: string) => void;
  language: Language;
}

export const PairingGuideModal: React.FC<PairingGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectGenre,
  language,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl bg-[#18181C] border-4 border-[#FEBC11] shadow-brutal-xl p-6 sm:p-8 overflow-y-auto max-h-[90vh] text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 bg-[#222018] hover:bg-[#FEBC11] hover:text-[#0D0D0E] border-2 border-[#FEBC11] flex items-center justify-center font-black text-sm transition-all cursor-pointer shadow-brutal"
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
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              {language === 'vi' ? 'Hòa Âm Hương Vị Cà Phê Gate 7' : 'Gate 7 Sonic Flavor Pairings'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
              {language === 'vi'
                ? 'Tính năng này đang ở giai đoạn thử nghiệm, nhằm khám phá cách phối âm thanh với hương vị cà phê. Bạn có thể thử trải nghiệm và góp ý để chúng mình hoàn thiện dần.'
                : 'This feature is currently in a trial phase as we explore how sound and coffee flavor can work together. You can try it out and share feedback while we refine it.'}
            </p>
          </div>
        </div>

        {/* Pairing Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {COFFEE_PAIRINGS.map((item) => (
            <div
              key={item.drink}
              className="p-4 bg-[#1F1F24] border-2 border-[#2E2E38] shadow-brutal flex flex-col justify-between hover:border-[#FEBC11] transition-all group"
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

              <div className="pt-3 border-t border-[#2A2A34] flex items-center justify-between">
                <div className="flex gap-1.5">
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
                  className="text-[10px] font-black uppercase text-[#FEBC11] hover:underline cursor-pointer"
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
