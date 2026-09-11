import React, { useState } from 'react';
import { RequestTicket, Language, Theme } from '../types';
import { useModalBehavior } from './useModalBehavior';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitRequest: (ticket: Omit<RequestTicket, 'id' | 'requestedAt' | 'status'>) => void;
  language: Language;
  theme?: Theme;
}

export const RequestModal: React.FC<RequestModalProps> = ({
  isOpen,
  onClose,
  onSubmitRequest,
  language,
  theme = 'dark',
}) => {
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [tableLocation, setTableLocation] = useState('Bàn 07 • Tầng 1');
  const [drink, setDrink] = useState('Cà phê Muối');
  const [note, setNote] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const isLight = theme === 'light';

  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const quickPicks = [
    { title: 'Nàng Thơ', artist: 'Hoàng Dũng', genre: 'Acoustic' },
    { title: 'Chuyện Rằng', artist: 'Thịnh Suy', genre: 'Indie' },
    { title: 'Bước Qua Mùa Cô Đơn', artist: 'Vũ.', genre: 'V-Indie' },
    { title: 'Mơ', artist: 'Vũ Cát Tường', genre: 'Pop Ballad' },
    { title: 'Anh Đã Lạc Vào', artist: 'Green', genre: 'Lo-fi Chill' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim()) return;

    onSubmitRequest({
      songTitle: songTitle.trim(),
      artist: artist.trim() || 'Nghệ sĩ Indie',
      tableLocation: `${tableLocation} • ${drink}`,
      note: note.trim(),
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setSongTitle('');
      setArtist('');
      setNote('');
      onClose();
    }, 1200);
  };

  const handlePickQuick = (pick: { title: string; artist: string }) => {
    setSongTitle(pick.title);
    setArtist(pick.artist);
  };

  const fieldClass = isLight
    ? 'w-full bg-[#F9FAFB] border-2 border-gray-300 focus:border-[#FEBC11] text-xs font-bold text-black px-3 py-2.5 shadow-brutal outline-none'
    : 'w-full bg-[#1F1F24] border-2 border-[#2E2E38] focus:border-[#FEBC11] text-xs font-bold text-white px-3 py-2.5 shadow-brutal outline-none';

  const labelClass = `block text-xs font-black uppercase mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`relative w-full max-w-lg max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] border-4 border-[#FEBC11] shadow-brutal-xl p-4 sm:p-7 overflow-y-auto overflow-x-hidden ${
          isLight ? 'bg-white text-black' : 'bg-[#18181C] text-gray-100'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label={language === 'vi' ? 'Đóng cửa sổ yêu cầu bài hát' : 'Close song request window'}
          className={`absolute top-4 right-4 z-20 w-8 h-8 hover:bg-[#FEBC11] hover:text-[#0D0D0E] border-2 border-[#FEBC11] flex items-center justify-center font-black text-sm transition-all cursor-pointer shadow-brutal ${
            isLight ? 'bg-white text-black' : 'bg-[#222018]'
          }`}
        >
          ✕
        </button>

        {/* Header */}
        <div className={`space-y-1.5 mb-5 border-b-2 pb-4 ${isLight ? 'border-gray-200' : 'border-[#2E2E38]'}`}>
          <div className="inline-flex items-center gap-2 bg-[#FEBC11] text-[#0D0D0E] text-[10px] font-black uppercase px-2 py-0.5 border border-black shadow-brutal">
            <i className="fa-solid fa-hand-holding-heart"></i>
            {language === 'vi' ? 'TRẠM YÊU CẦU BÀI HÁT TẠI QUÁN' : 'STORE MUSIC REQUEST BOOTH'}
          </div>
          <div className={`inline-flex items-center gap-2 text-[#FEBC11] text-[10px] font-black uppercase px-2 py-0.5 border border-[#FEBC11] shadow-brutal ${
            isLight ? 'bg-gray-100' : 'bg-[#202026]'
          }`}>
            <i className="fa-solid fa-flask"></i>
            {language === 'vi' ? 'THỬ NGHIỆM' : 'TRIAL MODE'}
          </div>
          <h2 id="request-modal-title" className={`text-2xl font-black uppercase tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>
            {language === 'vi' ? 'Gửi Bài Bạn Muốn Nghe' : 'Request Your Song'}
          </h2>
          <p className={`text-xs font-medium ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
            {language === 'vi'
              ? 'Tính năng này đang ở giai đoạn thử nghiệm. Bài hát của bạn sẽ được gửi đến Barista DJ Booth để thử nghiệm hàng đợi phát sóng trực tiếp.'
              : 'This feature is currently in a trial phase. Your request will be sent to the Barista DJ Booth to test the live queue flow.'}
          </p>
        </div>

        {isSuccess ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-16 h-16 bg-[#FEBC11] text-[#0D0D0E] rounded-full border-3 border-black mx-auto flex items-center justify-center text-2xl font-black animate-bounce shadow-brutal-gold">
              ✓
            </div>
            <h3 className={`text-xl font-black uppercase ${isLight ? 'text-black' : 'text-white'}`}>
              {language === 'vi' ? 'Đã Nhận Yêu Cầu!' : 'Request Sent!'}
            </h3>
            <p className="text-xs text-[#FEBC11] font-bold">
              {language === 'vi' ? 'Bài hát đã được thêm vào hàng đợi trực tiếp tại Gate 7.' : 'Song added to live queue.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Picks */}
            <div>
              <label className={`block text-[11px] font-black uppercase tracking-wider mb-1.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                {language === 'vi' ? 'GỢI Ý NHANH TỪ GATE 7 SOUNDSTAGE:' : 'QUICK PICKS:'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickPicks.map((pick) => (
                  <button
                    key={pick.title}
                    type="button"
                    onClick={() => handlePickQuick(pick)}
                    className={`text-[11px] font-bold hover:bg-[#FEBC11] hover:text-[#0D0D0E] border px-2.5 py-1 transition-all shadow-brutal-hover ${
                      isLight
                        ? 'bg-gray-100 text-gray-700 border-gray-300'
                        : 'bg-[#202026] text-gray-300 border-[#363644]'
                    }`}
                  >
                    + {pick.title} ({pick.artist})
                  </button>
                ))}
              </div>
            </div>

            {/* Song Title & Artist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  {language === 'vi' ? 'Tên bài hát *' : 'Song Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'vi' ? 'Ví dụ: Nàng Thơ' : 'e.g. Autumn Leaves'}
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {language === 'vi' ? 'Nghệ sĩ biểu diễn' : 'Artist'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'vi' ? 'Ví dụ: Hoàng Dũng' : 'e.g. Quyếch'}
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            {/* Table Location & Drink Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  {language === 'vi' ? 'Vị trí của bạn trong quán' : 'Table / Location'}
                </label>
                <select
                  value={tableLocation}
                  onChange={(e) => setTableLocation(e.target.value)}
                  className={fieldClass}
                >
                  <option value="Bàn 01 • Tầng 1">Bàn 01 • Tầng 1 (Cửa sổ)</option>
                  <option value="Bàn 04 • Tầng 1">Bàn 04 • Tầng 1</option>
                  <option value="Bàn 07 • Tầng 1">Bàn 07 • Tầng 1</option>
                  <option value="Bàn 12 • Tầng 2">Bàn 12 • Không gian Tầng 2</option>
                  <option value="Bàn 16 • Tầng 2">Bàn 16 • Tầng 2 Ban Công</option>
                  <option value="Quầy Bar Roaster G7">Quầy Bar Roaster G7</option>
                  <option value="Khu Vườn Sân Sau">Khu Vườn Sân Sau</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  {language === 'vi' ? 'Thưởng thức cùng đồ uống' : 'Coffee Pairing'}
                </label>
                <select
                  value={drink}
                  onChange={(e) => setDrink(e.target.value)}
                  className={fieldClass}
                >
                  <option value="Cà phê Muối">Cà phê Muối Gate 7</option>
                  <option value="Pour-over Ethiopia">Pour-over V60 Ethiopia</option>
                  <option value="Cold Brew Cam Vàng">Cold Brew Cam Vàng</option>
                  <option value="Bạc Xỉu 3 Tầng">Bạc Xỉu 3 Tầng</option>
                  <option value="Latte Hạnh Nhân">Latte Hạnh Nhân</option>
                  <option value="Americano Đá">Americano Đá Đậm Vị</option>
                </select>
              </div>
            </div>

            {/* Note / Message */}
            <div>
              <label className={labelClass}>
                {language === 'vi' ? 'Lời nhắn cho Barista DJ hoặc bạn bè (tùy chọn)' : 'Message to Barista DJ (Optional)'}
              </label>
              <textarea
                rows={2}
                placeholder={language === 'vi' ? 'Ví dụ: Tặng bàn số 04 nhân một ngày mưa Hà Nội...' : 'e.g. Dedicated to table 4...'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`${fieldClass} font-medium resize-none`}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] font-black text-xs uppercase tracking-wider border-2 border-black shadow-brutal hover:scale-[1.01] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <i className="fa-solid fa-paper-plane text-[#0D0D0E]"></i>
              {language === 'vi' ? 'XÁC NHẬN GỬI VÀO HÀNG ĐỢI PHÁT SÓNG' : 'CONFIRM & QUEUE TRACK'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
