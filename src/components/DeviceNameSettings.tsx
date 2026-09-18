import React, { useState } from 'react';
import { Language, Theme } from '../types';
import { DEVICE_SUFFIX_MAX_LENGTH, getSpotifyDeviceName, normalizeDeviceSuffix } from '../utils/deviceName';

export function DeviceNameSettings({ suffix, onSave, language, theme }: {
  suffix: string;
  onSave: (suffix: string) => Promise<void>;
  language: Language;
  theme: Theme;
}) {
  const [draft, setDraft] = useState(suffix);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'saved' | 'error' | null>(null);
  const isVi = language === 'vi';
  const normalized = normalizeDeviceSuffix(draft);

  return (
    <details className={`my-4 border-2 p-3 text-xs ${theme === 'light' ? 'border-black bg-white text-black' : 'border-[#2A2A34] bg-[#17171A] text-gray-300'}`}>
      <summary className="cursor-pointer font-bold break-words">
        {isVi ? 'Tên thiết bị Spotify' : 'Spotify device name'}: {getSpotifyDeviceName(suffix)}
      </summary>
      <form className="mt-3 space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        if (!normalized || saving) return;
        setSaving(true);
        setStatus(null);
        try {
          await onSave(normalized);
          setDraft(normalized);
          setStatus('saved');
        } catch {
          setStatus('error');
        } finally {
          setSaving(false);
        }
      }}>
        <p id="device-name-help">
          {isVi
            ? 'Đặt tên để dễ nhận ra thiết bị trong Spotify Connect. Tên được lưu riêng trong trình duyệt này.'
            : 'Choose a name to recognize this device in Spotify Connect. Saved only in this browser.'}
        </p>
        <label className="block font-bold" htmlFor="device-name-suffix">
          {isVi ? 'Tên thiết bị của bạn' : 'Your device label'}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="device-name-suffix"
            aria-describedby="device-name-help device-name-preview"
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setStatus(null); }}
            placeholder="Macmini, iPhone16e…"
            maxLength={DEVICE_SUFFIX_MAX_LENGTH}
            required
            disabled={saving}
            className="min-w-0 flex-1 border-2 border-current bg-transparent px-3 py-2 focus:outline-[#FEBC11]"
          />
          <button type="submit" disabled={!normalized || saving} className="border-2 border-black bg-[#FEBC11] px-4 py-2 font-bold text-black disabled:opacity-50">
            {saving ? (isVi ? 'Đang lưu…' : 'Saving…') : (isVi ? 'Lưu' : 'Save')}
          </button>
        </div>
        <p id="device-name-preview" className="break-words">{getSpotifyDeviceName(normalized)}</p>
        <p role="status" aria-live="polite">
          {status === 'saved' && (isVi ? 'Đã lưu tên thiết bị.' : 'Device name saved.')}
          {status === 'error' && (isVi ? 'Không thể lưu tên thiết bị. Vui lòng thử lại.' : 'Could not save the device name. Please try again.')}
        </p>
      </form>
    </details>
  );
}
