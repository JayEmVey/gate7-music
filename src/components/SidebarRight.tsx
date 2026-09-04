import React from 'react';
import { RequestTicket, Language } from '../types';

interface SidebarRightProps {
  requestQueue: RequestTicket[];
  onRequestClick: () => void;
  activeFilterTag: string | null;
  onToggleFilterTag: (tag: string) => void;
  onDNAFeatureClick: (featureTitle: string) => void;
  language: Language;
  theme?: 'dark' | 'light';
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  requestQueue,
  onRequestClick,
  activeFilterTag,
  onToggleFilterTag,
  onDNAFeatureClick,
  language,
  theme = 'dark',
}) => {
  const tags = ['#V-Indie', '#Lo-fi Chill', '#CoffeeJazz', '#Acoustic', '#DeepWork'];
  const isLight = theme === 'light';

  return (
    <div className="space-y-6">
      {/* Gate 7 Roastery DNA Card */}
      <section
        className={`p-6 relative overflow-hidden transition-colors duration-200 ${
          isLight
            ? 'bg-[#FEBC11] border-3 border-black shadow-[5px_5px_0px_#000000] text-black'
            : 'bg-[#1C1A14] border-4 border-[#FEBC11] shadow-brutal-gold text-white'
        }`}
      >
        <div className="space-y-3">
          <div
            className={`inline-block text-[11px] font-black uppercase px-2.5 py-1 border border-black ${
              isLight ? 'bg-black text-white' : 'bg-[#FEBC11] text-[#0D0D0E]'
            }`}
          >
            GATE 7 ROASTERY DNA
          </div>
          <h3
            className={`text-2xl font-black leading-tight uppercase ${
              isLight ? 'text-black' : 'text-white'
            }`}
          >
            {language === 'vi' ? 'Ngôi Nhà Thứ Hai, Nhạc Của Bạn' : 'Your Second Home, Your Sound'}
          </h3>
          <p
            className={`text-xs md:text-sm font-semibold leading-relaxed ${
              isLight ? 'text-black' : 'text-gray-300'
            }`}
          >
            {language === 'vi'
              ? 'Tại Gate 7, âm nhạc không đơn thuần là âm thanh nền—nó là linh hồn đánh thức vị giác cùng từng mẻ hạt cà phê mới rang. Tuyển chọn độc bản đồng hành với bạn qua mỗi khoảnh khắc trong ngày.'
              : 'At Gate 7, music is more than background sound—it is the soul that awakens your palate alongside freshly roasted beans. Curated to accompany your daily flow.'}
          </p>
        </div>

        {/* 4 Core Pillars */}
        <div className="grid grid-cols-1 gap-2.5 pt-5">
          <div
            onClick={() => onDNAFeatureClick('Chuyển Đổi Mượt Mà')}
            className={`p-3.5 border-2 border-black shadow-brutal transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-yellow-50'
                : 'bg-[#131316] border-[#2E2E38] hover:border-[#FEBC11]'
            }`}
          >
            <div
              className={`flex items-center gap-2 font-black text-xs uppercase mb-0.5 ${
                isLight ? 'text-black' : 'text-[#FEBC11]'
              }`}
            >
              <i className="fa-solid fa-arrows-spin text-sm"></i>
              <span>{language === 'vi' ? 'Chuyển Đổi Mượt Mà' : 'Seamless Transition'}</span>
            </div>
            <p className={`text-[11px] font-medium ${isLight ? 'text-gray-800' : 'text-gray-400'}`}>
              {language === 'vi'
                ? 'Chuyển danh sách phát trước 15 phút mỗi khung giờ để chuyển tiếp tự nhiên, không ngắt quãng.'
                : 'Playlists crossfade 15 minutes before time slots for smooth, uninterrupted transitions.'}
            </p>
          </div>

          <div
            onClick={() => onDNAFeatureClick('Cảm Giác Cộng Đồng')}
            className={`p-3.5 border-2 border-black shadow-brutal transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-blue-50'
                : 'bg-[#131316] border-[#2E2E38] hover:border-blue-400'
            }`}
          >
            <div
              className={`flex items-center gap-2 font-black text-xs uppercase mb-0.5 ${
                isLight ? 'text-blue-700' : 'text-blue-400'
              }`}
            >
              <i className="fa-solid fa-people-group text-sm"></i>
              <span>{language === 'vi' ? 'Cảm Giác Cộng Đồng' : 'Community Ambiance'}</span>
            </div>
            <p className={`text-[11px] font-medium ${isLight ? 'text-gray-800' : 'text-gray-400'}`}>
              {language === 'vi'
                ? 'Âm thanh cân chỉnh âm lượng chuẩn (70-75dB) để hỗ trợ trọn vẹn cuộc trò chuyện và kết nối.'
                : 'Acoustics precisely balanced at 70–75dB to foster meaningful conversation and connection.'}
            </p>
          </div>

          <div
            onClick={() => onDNAFeatureClick('Tuyển Chọn Chất Lượng')}
            className={`p-3.5 border-2 border-black shadow-brutal transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-emerald-50'
                : 'bg-[#131316] border-[#2E2E38] hover:border-[#1DB954]'
            }`}
          >
            <div
              className={`flex items-center gap-2 font-black text-xs uppercase mb-0.5 ${
                isLight ? 'text-[#15803D]' : 'text-[#1DB954]'
              }`}
            >
              <i className="fa-brands fa-spotify text-sm"></i>
              <span>{language === 'vi' ? 'Tuyển Chọn Chất Lượng' : 'Curated Selection'}</span>
            </div>
            <p className={`text-[11px] font-medium ${isLight ? 'text-gray-800' : 'text-gray-400'}`}>
              {language === 'vi'
                ? 'Cập nhật thường xuyên trực tiếp từ Spotify Barista Team & tuyển tập nghệ sĩ Việt.'
                : 'Continually refreshed by Spotify Barista Team & bespoke Vietnamese indie artists.'}
            </p>
          </div>

          <div
            onClick={() => onDNAFeatureClick('Nét Cá Nhân Độc Bản')}
            className={`p-3.5 border-2 border-black shadow-brutal transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-yellow-50'
                : 'bg-[#131316] border-[#2E2E38] hover:border-[#FEBC11]'
            }`}
          >
            <div
              className={`flex items-center gap-2 font-black text-xs uppercase mb-0.5 ${
                isLight ? 'text-black' : 'text-[#FEBC11]'
              }`}
            >
              <i className="fa-solid fa-sliders text-sm"></i>
              <span>{language === 'vi' ? 'Nét Cá Nhân Độc Bản' : 'Bespoke Identity'}</span>
            </div>
            <p className={`text-[11px] font-medium ${isLight ? 'text-gray-800' : 'text-gray-400'}`}>
              {language === 'vi'
                ? 'Trộn danh sách phát để tạo âm thanh Gate 7 mang đậm bản sắc riêng của bạn.'
                : 'Request tracks to co-create the distinctive soundstage of your Gate 7 session.'}
            </p>
          </div>
        </div>
      </section>

      {/* Community Live Request Tickets Queue */}
      <section
        className={`p-5 space-y-4 transition-colors duration-200 ${
          isLight
            ? 'bg-white border-3 border-black shadow-[5px_5px_0px_#000000]'
            : 'bg-[#18181C] border-3 border-[#2E2E38] shadow-brutal'
        }`}
      >
        <div className={`flex items-center justify-between border-b-2 pb-2 ${isLight ? 'border-black' : 'border-[#2E2E38]'}`}>
          <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}>
            <i className="fa-solid fa-ticket text-[#FEBC11]"></i>
            {language === 'vi' ? 'HÀNG ĐỢI YÊU CẦU TẠI QUÁN' : 'STORE REQUEST QUEUE'}
          </h4>
          <span className="text-[10px] bg-[#FEBC11] text-[#0D0D0E] font-black px-2 py-0.5 border border-black">
            {requestQueue.length} {language === 'vi' ? 'BÀI KẾ TIẾP' : 'UP NEXT'}
          </span>
        </div>

        {/* Tickets */}
        <div className="space-y-2.5 text-xs">
          {requestQueue.slice(0, 4).map((ticket, index) => (
            <div
              key={ticket.id}
              className={`p-3 border-2 border-black flex items-center justify-between shadow-brutal transition-all ${
                isLight
                  ? 'bg-white hover:bg-gray-50'
                  : 'bg-[#202026] border-[#33333E] hover:border-[#FEBC11]/70'
              }`}
            >
              <div className="min-w-0 pr-2">
                <p className={`font-black truncate ${isLight ? 'text-black' : 'text-white'}`}>{ticket.songTitle}</p>
                <p className={`text-[11px] font-medium truncate ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
                  {ticket.tableLocation}
                  {ticket.artist ? ` • ${ticket.artist}` : ''}
                </p>
              </div>
              {ticket.status === 'next' || index === 0 ? (
                <span className="text-[10px] font-black uppercase bg-[#FEBC11] text-[#0D0D0E] px-2 py-0.5 border border-black shrink-0 animate-pulse">
                  {language === 'vi' ? 'Kế tiếp' : 'Next'}
                </span>
              ) : (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 border border-black shrink-0 ${
                    isLight ? 'bg-white text-black' : 'bg-[#141416] text-gray-400 border-[#33333E]'
                  }`}
                >
                  #{ticket.queueNumber || index + 1}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Submit Request Button */}
        <button
          id="sidebar-request-btn"
          onClick={onRequestClick}
          className="w-full py-2.5 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] text-xs font-black uppercase tracking-wider border-2 border-black shadow-brutal hover:scale-[1.01] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <i className="fa-solid fa-plus text-[#0D0D0E]"></i>
          {language === 'vi' ? 'Gửi bài bạn muốn nghe ngay' : 'Request your song now'}
        </button>
      </section>

      {/* Gu Âm Nhạc & Tâm Trạng Tags */}
      <div
        className={`p-4 transition-colors duration-200 ${
          isLight
            ? 'bg-white border-3 border-black shadow-[5px_5px_0px_#000000]'
            : 'bg-[#18181C] border-3 border-[#2E2E38] shadow-brutal'
        }`}
      >
        <div className="flex items-center justify-between mb-2.5">
          <span className={`text-[10px] font-black uppercase tracking-wider block ${isLight ? 'text-black' : 'text-gray-400'}`}>
            {language === 'vi' ? 'GU ÂM NHẠC & TÂM TRẠNG TẠI QUÁN' : 'ROASTERY MUSIC MOOD TAGS'}
          </span>
          {activeFilterTag && (
            <button
              onClick={() => onToggleFilterTag(activeFilterTag)}
              className="text-[10px] text-blue-600 dark:text-[#FEBC11] hover:underline font-bold cursor-pointer"
            >
              {language === 'vi' ? 'Xóa lọc' : 'Clear'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-black">
          {tags.map((tag) => {
            const isSelected = activeFilterTag === tag;
            const isDeepWork = tag === '#DeepWork';

            if (isSelected) {
              return (
                <span
                  key={tag}
                  onClick={() => onToggleFilterTag(tag)}
                  className="px-2.5 py-1 bg-[#FEBC11] text-[#0D0D0E] border-2 border-black shadow-brutal cursor-pointer font-black ring-2 ring-black"
                >
                  {tag} ✓
                </span>
              );
            }

            if (isDeepWork) {
              return (
                <span
                  key={tag}
                  onClick={() => onToggleFilterTag(tag)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white border-2 border-black shadow-brutal cursor-pointer transition-all"
                >
                  {tag}
                </span>
              );
            }

            return (
              <span
                key={tag}
                onClick={() => onToggleFilterTag(tag)}
                className={`px-2.5 py-1 border-2 border-black shadow-brutal cursor-pointer transition-all ${
                  isLight
                    ? 'bg-white text-black hover:bg-[#FEBC11]'
                    : 'bg-[#202026] text-gray-200 border-[#33333E] hover:border-[#FEBC11] hover:text-[#FEBC11]'
                }`}
              >
                {tag}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

