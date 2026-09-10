import React, { useState, useMemo } from 'react';
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

// Icon and accent color per sonic category
const CATEGORY_META: Record<string, { icon: string; accent: string; labelVi: string }> = {
  'High Energy / Fast Tempo':       { icon: 'fa-bolt',              accent: '#EF4444', labelVi: 'Năng lượng cao / Nhịp nhanh' },
  'Acoustic / Grounded Energy':     { icon: 'fa-guitar',            accent: '#FEBC11', labelVi: 'Acoustic / Năng lượng mộc mạc' },
  'Warm Soul / Mid Tempo':          { icon: 'fa-heart',             accent: '#F97316', labelVi: 'Soul ấm áp / Nhịp trung' },
  'Deep Chocolate Groove':          { icon: 'fa-record-vinyl',      accent: '#8B5CF6', labelVi: 'Groove chocolate trầm sâu' },
  'Bright / Tropical Groove':       { icon: 'fa-sun',               accent: '#22C55E', labelVi: 'Groove nhiệt đới / Tươi sáng' },
  'Instrumental / Zen Flow':        { icon: 'fa-leaf',              accent: '#10B981', labelVi: 'Không lời / Zen Flow' },
  'Cinematic Pop / Layered':        { icon: 'fa-film',              accent: '#6366F1', labelVi: 'Pop điện ảnh / Nhiều tầng lớp' },
  'Floral / Delicate Acoustic':     { icon: 'fa-spa',               accent: '#EC4899', labelVi: 'Acoustic hoa nhẹ / Tinh tế' },
  'Tropical / Vibrant Groove':      { icon: 'fa-mango',             accent: '#F59E0B', labelVi: 'Groove nhiệt đới / Sôi động' },
  'Gentle Acoustic / Sweet Clarity':{ icon: 'fa-droplet',           accent: '#67E8F9', labelVi: 'Acoustic nhẹ / Trong sáng' },
};

// Stable category order
const CATEGORY_ORDER = [
  'High Energy / Fast Tempo',
  'Warm Soul / Mid Tempo',
  'Deep Chocolate Groove',
  'Bright / Tropical Groove',
  'Tropical / Vibrant Groove',
  'Instrumental / Zen Flow',
  'Floral / Delicate Acoustic',
  'Cinematic Pop / Layered',
  'Acoustic / Grounded Energy',
  'Gentle Acoustic / Sweet Clarity',
];

export const PairingGuideModal: React.FC<PairingGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectGenre,
  language,
  currentTrack,
}) => {
  useModalBehavior(isOpen, onClose);

  // Which categories are expanded (all open by default)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(CATEGORY_ORDER),
  );

  // Group pairings by bestGenre, preserving CATEGORY_ORDER
  // Must be before the early return to satisfy Rules of Hooks
  const grouped = useMemo(() => {
    const map = new Map<string, typeof COFFEE_PAIRINGS>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const item of COFFEE_PAIRINGS) {
      const bucket = map.get(item.bestGenre);
      if (bucket) bucket.push(item);
    }
    return map;
  }, []);

  const recommendedDrink = getCoffeePairing(
    currentTrack.audioFeatures,
    currentTrack.coffeePairing || 'Drip Drop Coffee',
    language,
    currentTrack.audioFeaturesSource,
  );
  const recommendedPairing = COFFEE_PAIRINGS.find((item) => item.drink === recommendedDrink);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] bg-[#18181C] border-4 border-[#FEBC11] shadow-brutal-xl p-4 sm:p-8 overflow-y-auto overflow-x-hidden text-gray-100"
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

        {/* ── Modal Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4 mb-6 border-b-2 border-[#2E2E38] pb-4">
          <div className="shrink-0 pt-1">
            <SonicPairingG7Icon size="lg" showRipples={true} showSteam={true} />
          </div>

          <div className="space-y-1.5 flex-1 pr-6">
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 bg-[#FEBC11] text-[#0D0D0E] text-[10px] font-black uppercase px-2 py-0.5 border border-black shadow-brutal">
                <i className="fa-solid fa-mug-hot"></i>
                {language === 'vi' ? 'TRIẾT LÝ HÒA ÂM & VỊ GIÁC' : 'COFFEE & SOUND FREQUENCIES'}
              </div>
              <div className="inline-flex items-center gap-2 bg-[#202026] text-[#FEBC11] text-[10px] font-black uppercase px-2 py-0.5 border border-[#FEBC11] shadow-brutal">
                <i className="fa-solid fa-flask"></i>
                {language === 'vi' ? 'THỬ NGHIỆM' : 'TRIAL MODE'}
              </div>
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

        {/* ── Spotlight: Recommended for current track ──────────────────────── */}
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

        {/* ── Category count badge ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] font-black uppercase tracking-wider text-gray-400">
            {language === 'vi'
              ? `${CATEGORY_ORDER.length} nhóm hòa âm • ${COFFEE_PAIRINGS.length} thức uống`
              : `${CATEGORY_ORDER.length} sonic categories • ${COFFEE_PAIRINGS.length} menu drinks`}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setExpandedCategories(new Set(CATEGORY_ORDER))}
              className="text-[10px] font-black text-[#FEBC11] hover:underline cursor-pointer"
            >
              {language === 'vi' ? 'Mở tất cả' : 'Expand all'}
            </button>
            <span className="text-gray-600">•</span>
            <button
              type="button"
              onClick={() => setExpandedCategories(new Set())}
              className="text-[10px] font-black text-gray-400 hover:text-[#FEBC11] cursor-pointer"
            >
              {language === 'vi' ? 'Thu gọn' : 'Collapse all'}
            </button>
          </div>
        </div>

        {/* ── Grouped Pairing Cards ─────────────────────────────────────────── */}
        <div className="space-y-3 mb-6">
          {CATEGORY_ORDER.map((category) => {
            const drinks = grouped.get(category) ?? [];
            if (drinks.length === 0) return null;
            const meta = CATEGORY_META[category];
            const isExpanded = expandedCategories.has(category);
            const hasRecommended = drinks.some((d) => d.drink === recommendedDrink);

            return (
              <div
                key={category}
                className={`border-2 overflow-hidden transition-colors ${
                  hasRecommended ? 'border-[#FEBC11]' : 'border-[#2E2E38]'
                }`}
              >
                {/* Category Header — click to toggle */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer transition-colors group ${
                    hasRecommended
                      ? 'bg-[#24221A] hover:bg-[#2E2A18]'
                      : 'bg-[#1C1C22] hover:bg-[#222228]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-7 h-7 rounded-none border-2 border-black flex items-center justify-center text-xs shrink-0"
                      style={{ backgroundColor: meta?.accent ?? '#FEBC11', color: '#0D0D0E' }}
                    >
                      <i className={`fa-solid ${meta?.icon ?? 'fa-music'}`}></i>
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase tracking-wider text-white group-hover:text-[#FEBC11] transition-colors leading-tight truncate">
                        {category}
                      </div>
                      {language === 'vi' && meta?.labelVi && (
                        <div className="text-[10px] font-medium text-gray-400 leading-tight truncate">
                          {meta.labelVi}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {hasRecommended && (
                      <span className="bg-[#FEBC11] text-[#0D0D0E] text-[9px] font-black px-1.5 py-0.5 border border-black">
                        ★ {language === 'vi' ? 'ĐỀ XUẤT' : 'MATCH'}
                      </span>
                    )}
                    <span className="text-[10px] font-black text-gray-500 border border-[#2E2E38] px-1.5 py-0.5 bg-[#141416]">
                      {drinks.length}
                    </span>
                    <i
                      className={`fa-solid fa-chevron-down text-gray-400 text-xs transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    ></i>
                  </div>
                </button>

                {/* Drink cards inside the category */}
                {isExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#18181C]">
                    {drinks.map((item) => {
                      const isRecommended = item.drink === recommendedDrink;
                      return (
                        <div
                          key={item.drink}
                          className={`p-4 border-2 shadow-brutal flex flex-col justify-between hover:border-[#FEBC11] transition-all group ${
                            isRecommended
                              ? 'bg-[#2A2618] border-[#FEBC11]'
                              : 'bg-[#1F1F24] border-[#2E2E38]'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <span className="text-xs font-black text-white group-hover:text-[#FEBC11] transition-colors leading-tight">
                                {item.drink}
                              </span>
                              <i
                                className="fa-solid fa-fire-flame-curved text-xs shrink-0 mt-0.5"
                                style={{ color: meta?.accent ?? '#FEBC11' }}
                              ></i>
                            </div>

                            <p className="text-xs text-gray-300 font-medium leading-relaxed mb-3">
                              {item.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-[#2A2A34] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex flex-wrap gap-1">
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
                              className="self-end sm:self-auto text-[10px] font-black uppercase text-[#FEBC11] hover:underline cursor-pointer whitespace-nowrap"
                            >
                              {language === 'vi' ? 'Lọc nhạc này →' : 'Filter this →'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer quote ──────────────────────────────────────────────────── */}
        <div className="p-4 bg-[#24221A] border-2 border-[#FEBC11] text-xs text-gray-200 shadow-brutal flex items-center gap-3">
          <i className="fa-solid fa-quote-left text-2xl text-[#FEBC11] shrink-0"></i>
          <p className="font-semibold italic">
            {language === 'vi'
              ? '"Uống cà phê ngon tại Gate 7 mà thiếu đi giai điệu đúng lúc cũng như nếm một shot espresso thiếu đi lớp crema bồng bềnh."'
              : '"Enjoying specialty coffee without the right tune is like tasting an espresso shot without its velvety crema."'}
          </p>
        </div>
      </div>
    </div>
  );
};
