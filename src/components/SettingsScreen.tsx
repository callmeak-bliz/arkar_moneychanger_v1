/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  Check, 
  Trash2, 
  QrCode, 
  Image as ImageIcon 
} from 'lucide-react';
import { AppSettings } from '../types';
import { exportBackup, formatCurrentTime } from '../utils/storage';
import { compressImageToSquare } from '../utils/canvasExport';

interface SettingsScreenProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onSave,
  onBack,
}) => {
  // Display name
  const [displayName, setDisplayName] = useState<string>(settings.displayName || 'Money Changer');

  // Rates
  const [thbToMmk, setThbToMmk] = useState<string>(settings.thbToMmkRate.toString());
  const [mmkToThb, setMmkToThb] = useState<string>(settings.mmkToThbRate.toString());

  // Rounding options
  const [bahtDecimals, setBahtDecimals] = useState<0 | 1 | 2>(settings.bahtDecimals);
  const [roundKyatToHundred, setRoundKyatToHundred] = useState<boolean>(settings.roundKyatToHundred);

  // Thai account
  const [thaiType, setThaiType] = useState<string>(settings.thaiAccount.type);
  const [thaiName, setThaiName] = useState<string>(settings.thaiAccount.name);
  const [thaiNumber, setThaiNumber] = useState<string>(settings.thaiAccount.number);
  const [promptPayId, setPromptPayId] = useState<string>(
    settings.thaiAccount.promptPayId || settings.thaiAccount.number
  );

  // Myanmar account
  const [mmkType, setMmkType] = useState<string>(settings.myanmarAccount.type);
  const [mmkName, setMmkName] = useState<string>(settings.myanmarAccount.name);
  const [mmkNumber, setMmkNumber] = useState<string>(settings.myanmarAccount.number);
  const [myanmarQrDataUrl, setMyanmarQrDataUrl] = useState<string | null>(
    settings.myanmarAccount.qrImageDataUrl || null
  );

  // Message footer
  const [footer, setFooter] = useState<string>(settings.footerMessage);

  // Quick Chips
  const [kyatChipsStr, setKyatChipsStr] = useState<string>(
    settings.kyatChips.map((v) => v / 100000).join(', ')
  );
  const [bahtChipsStr, setBahtChipsStr] = useState<string>(
    settings.bahtChips.join(', ')
  );

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isProcessingQr, setIsProcessingQr] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrImageInputRef = useRef<HTMLInputElement>(null);

  // Handle Myanmar QR Image Upload
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingQr(true);
    try {
      // Compress and crop to square (500x500 JPEG)
      const compressedDataUrl = await compressImageToSquare(file, 500, 0.82);
      setMyanmarQrDataUrl(compressedDataUrl);
    } catch (err) {
      console.error('Failed to compress QR image', err);
      alert('QR ပုံတင်ရာတွင် အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့ပါသည်။ ကျေးဇူးပြု၍ ပြန်လည်စမ်းသပ်ပါ။');
    } finally {
      setIsProcessingQr(false);
      e.target.value = '';
    }
  };

  const handleDeleteMyanmarQr = () => {
    setMyanmarQrDataUrl(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const rate1 = parseFloat(thbToMmk);
    const rate2 = parseFloat(mmkToThb);

    if (isNaN(rate1) || rate1 <= 0 || isNaN(rate2) || rate2 <= 0) {
      alert('ကျေးဇူးပြု၍ မှန်ကန်သော ပေါက်ဈေးဂဏန်းများကို ရိုက်ထည့်ပါ');
      return;
    }

    const parsedKyatChips = kyatChipsStr
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0)
      .map((lakhs) => Math.round(lakhs * 100000));

    const parsedBahtChips = bahtChipsStr
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0)
      .map((n) => Math.round(n));

    const timeNow = formatCurrentTime();

    const updated: AppSettings = {
      displayName: displayName.trim() || 'Money Changer',
      thbToMmkRate: rate1,
      thbToMmkUpdatedAt: rate1 !== settings.thbToMmkRate ? timeNow : settings.thbToMmkUpdatedAt,
      mmkToThbRate: rate2,
      mmkToThbUpdatedAt: rate2 !== settings.mmkToThbRate ? timeNow : settings.mmkToThbUpdatedAt,
      bahtDecimals,
      roundKyatToHundred,
      thaiAccount: {
        type: thaiType.trim() || 'PromptPay',
        name: thaiName.trim(),
        number: thaiNumber.trim(),
        promptPayId: promptPayId.trim() || thaiNumber.trim(),
      },
      myanmarAccount: {
        type: mmkType.trim() || 'KBZPay',
        name: mmkName.trim(),
        number: mmkNumber.trim(),
        qrImageDataUrl: myanmarQrDataUrl,
      },
      footerMessage: footer.trim() || 'လွှဲပြီးပါက Slip လေး ပို့ပေးပါခင်ဗျာ။',
      kyatChips: parsedKyatChips.length >= 2 ? parsedKyatChips : settings.kyatChips,
      bahtChips: parsedBahtChips.length >= 2 ? parsedBahtChips : settings.bahtChips,
    };

    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onBack();
    }, 400);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const updated: AppSettings = {
          displayName: parsed.displayName || settings.displayName || 'Money Changer',
          thbToMmkRate: Number(parsed.thbToMmkRate) || settings.thbToMmkRate,
          thbToMmkUpdatedAt: parsed.thbToMmkUpdatedAt || '1:40 PM',
          mmkToThbRate: Number(parsed.mmkToThbRate) || settings.mmkToThbRate,
          mmkToThbUpdatedAt: parsed.mmkToThbUpdatedAt || '1:40 PM',
          bahtDecimals: [0, 1, 2].includes(parsed.bahtDecimals) ? parsed.bahtDecimals : settings.bahtDecimals,
          roundKyatToHundred: Boolean(parsed.roundKyatToHundred),
          thaiAccount: {
            type: parsed.thaiAccount?.type || settings.thaiAccount.type,
            name: parsed.thaiAccount?.name || settings.thaiAccount.name,
            number: parsed.thaiAccount?.number || settings.thaiAccount.number,
            promptPayId: parsed.thaiAccount?.promptPayId || parsed.thaiAccount?.number || settings.thaiAccount.promptPayId,
          },
          myanmarAccount: {
            type: parsed.myanmarAccount?.type || settings.myanmarAccount.type,
            name: parsed.myanmarAccount?.name || settings.myanmarAccount.name,
            number: parsed.myanmarAccount?.number || settings.myanmarAccount.number,
            qrImageDataUrl: parsed.myanmarAccount?.qrImageDataUrl || null,
          },
          footerMessage: parsed.footerMessage || settings.footerMessage,
          kyatChips: Array.isArray(parsed.kyatChips) ? parsed.kyatChips : settings.kyatChips,
          bahtChips: Array.isArray(parsed.bahtChips) ? parsed.bahtChips : settings.bahtChips,
        };

        setDisplayName(updated.displayName);
        setThbToMmk(updated.thbToMmkRate.toString());
        setMmkToThb(updated.mmkToThbRate.toString());
        setBahtDecimals(updated.bahtDecimals);
        setRoundKyatToHundred(updated.roundKyatToHundred);
        setThaiType(updated.thaiAccount.type);
        setThaiName(updated.thaiAccount.name);
        setThaiNumber(updated.thaiAccount.number);
        setPromptPayId(updated.thaiAccount.promptPayId || updated.thaiAccount.number);
        setMmkType(updated.myanmarAccount.type);
        setMmkName(updated.myanmarAccount.name);
        setMmkNumber(updated.myanmarAccount.number);
        setMyanmarQrDataUrl(updated.myanmarAccount.qrImageDataUrl || null);
        setFooter(updated.footerMessage);
        setKyatChipsStr(updated.kyatChips.map((v) => v / 100000).join(', '));
        setBahtChipsStr(updated.bahtChips.join(', '));

        onSave(updated);
        alert('Backup အချက်အလက်များ အောင်မြင်စွာ ပြန်တင်ပြီးပါပြီ');
      } catch {
        alert('ဖိုင်ဖတ်ရာတွင် မှားယွင်းမှုရှိနေပါသည်။ မှန်ကန်သော JSON ဖိုင် ဖြစ်ပါစေ။');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#FBF7FF] text-[#2E1A47] pb-32 max-w-md mx-auto px-4 pt-4">
      {/* Top Bar */}
      <header className="flex items-center gap-3 pb-4 border-b border-purple-100">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[#2E1A47] hover:bg-[#F3E8FF] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>
        <h1 className="text-base font-bold text-[#2E1A47]">
          ဆက်တင်များ (Settings)
        </h1>
      </header>

      <form onSubmit={handleFormSubmit} className="mt-5 space-y-5">
        {/* 1. "ပြမယ့်နာမည်" (display name) */}
        <section className="bg-white rounded-[20px] p-4.5 border border-purple-100 shadow-[0_2px_12px_rgba(46,26,71,0.04)] space-y-2">
          <label className="block text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
            ပြမယ့်နာမည် (Display Name)
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="ဥပမာ - Money Changer / ရွှေမြန်မာ ငွေလဲ"
            className="w-full h-12 px-4 text-sm font-bold text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
          />
          <span className="text-[11px] text-[#6B5B7B] block">
            ထုတ်ယူမည့် ပုံ (Image Card) ၏ ထိပ်ဆုံးတွင် ပြသပါမည်
          </span>
        </section>

        {/* 2. Rates Section */}
        <section className="bg-white rounded-[20px] p-4.5 border border-purple-100 shadow-[0_2px_12px_rgba(46,26,71,0.04)] space-y-3.5">
          <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
            ပေါက်ဈေး သတ်မှတ်ချက်များ (၁ သိန်း = ___ ဘတ်)
          </h2>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-1">
              ဘတ်ပေးကျပ်ယူ ပေါက်ဈေး (၁ သိန်း လျှင် ဘတ်)
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                required
                value={thbToMmk}
                onChange={(e) => setThbToMmk(e.target.value)}
                placeholder="715"
                className="w-full h-12 px-4 pr-14 text-base font-bold tabular-nums text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
              />
              <span className="absolute right-4 top-3 text-xs font-medium text-[#6B5B7B]">
                ဘတ်
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-1">
              ကျပ်ပေးဘတ်ယူ ပေါက်ဈေး (၁ သိန်း လျှင် ဘတ်)
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                required
                value={mmkToThb}
                onChange={(e) => setMmkToThb(e.target.value)}
                placeholder="730"
                className="w-full h-12 px-4 pr-14 text-base font-bold tabular-nums text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
              />
              <span className="absolute right-4 top-3 text-xs font-medium text-[#6B5B7B]">
                ဘတ်
              </span>
            </div>
          </div>
        </section>

        {/* 3. Rounding & Decimals Section */}
        <section className="bg-white rounded-[20px] p-4.5 border border-purple-100 shadow-[0_2px_12px_rgba(46,26,71,0.04)] space-y-4">
          <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
            ကိန်းဂဏန်းနှင့် ဒသမ ဖြတ်တောက်မှု
          </h2>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-2">
              ဘတ်ငွေ ဒသမ နေရာ (Baht decimal places)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([0, 1, 2] as const).map((dec) => (
                <button
                  key={dec}
                  type="button"
                  onClick={() => setBahtDecimals(dec)}
                  className={`h-10 rounded-[12px] text-xs font-bold font-mono transition-all ${
                    bahtDecimals === dec
                      ? 'bg-[#7C3AED] text-white shadow-xs'
                      : 'bg-[#F3E8FF] text-[#2E1A47] hover:bg-purple-200/60'
                  }`}
                >
                  {dec} နေရာ
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-purple-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#2E1A47] block">
                ရာပြည့်လုပ်မယ် (Kyat nearest 100)
              </span>
              <span className="text-[11px] text-[#6B5B7B]">
                ကျပ်ငွေ ရလဒ်ကို အနီးစပ်ဆုံး ရာဂဏန်း အပြည့် ဖြတ်မည်
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={roundKyatToHundred}
                onChange={(e) => setRoundKyatToHundred(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-purple-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-purple-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C3AED]"></div>
            </label>
          </div>
        </section>

        {/* 4. Thai Account & PromptPay ID */}
        <section className="bg-white rounded-[20px] p-4.5 border border-purple-100 shadow-[0_2px_12px_rgba(46,26,71,0.04)] space-y-3">
          <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
            ကျွန်ုပ်၏ ထိုင်းအကောင့် (PromptPay QR ထုတ်ရန်)
          </h2>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-1">
              PromptPay ID (၁၀-လုံး ဖုန်းနံပါတ် သို့မဟုတ် ၁၃-လုံး မှတ်ပုံတင်) *
            </label>
            <input
              type="text"
              required
              value={promptPayId}
              onChange={(e) => setPromptPayId(e.target.value)}
              placeholder="ဥပမာ - 0812345678"
              className="w-full h-11 px-3 text-xs font-mono font-bold text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
            />
            <span className="text-[10px] text-[#6B5B7B] mt-0.5 block">
              ငွေပမာဏ တိုက်ရိုက်ပါဝင်သော PromptPay QR ထုတ်ပေးရန် သုံးပါသည်
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-1">
              အမျိုးအစား (PromptPay / ဘဏ်အမည်)
            </label>
            <input
              type="text"
              required
              value={thaiType}
              onChange={(e) => setThaiType(e.target.value)}
              placeholder="ဥပမာ - PromptPay / Kasikorn Bank"
              className="w-full h-11 px-3 text-xs font-semibold text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-1">
              အကောင့်ပိုင်ရှင် အမည်
            </label>
            <input
              type="text"
              required
              value={thaiName}
              onChange={(e) => setThaiName(e.target.value)}
              placeholder="ဥပမာ - U Kyaw Thu"
              className="w-full h-11 px-3 text-xs font-semibold text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-1">
              အကောင့်နံပါတ် (စာတိုထဲ ဖော်ပြရန်)
            </label>
            <input
              type="text"
              required
              value={thaiNumber}
              onChange={(e) => setThaiNumber(e.target.value)}
              placeholder="ဥပမာ - 0812345678"
              className="w-full h-11 px-3 text-xs font-mono font-semibold text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
            />
          </div>
        </section>

        {/* 5. Myanmar Account & QR Image Upload */}
        <section className="bg-white rounded-[20px] p-4.5 border border-purple-100 shadow-[0_2px_12px_rgba(46,26,71,0.04)] space-y-3.5">
          <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
            ကျွန်ုပ်၏ မြန်မာအကောင့်နှင့် QR ပုံ
          </h2>

          {/* QR Image Upload & Preview */}
          <div className="p-3 bg-[#FBF7FF] rounded-[16px] border border-purple-100 space-y-2">
            <label className="block text-xs font-bold text-[#2E1A47]">
              QR ပုံတင်မယ် (KBZPay / WavePay / AYA Pay စကရင်ရှော့)
            </label>

            {myanmarQrDataUrl ? (
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={myanmarQrDataUrl}
                  alt="Myanmar QR Preview"
                  className="w-20 h-20 object-cover rounded-xl border border-purple-200 shadow-2xs"
                />
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-[#6B5B7B] block">
                    QR ပုံ ထည့်သွင်းပြီးပါပြီ
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteMyanmarQr}
                    className="py-1 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ဖျက်မယ်</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={qrImageInputRef}
                  onChange={handleQrUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isProcessingQr}
                  onClick={() => qrImageInputRef.current?.click()}
                  className="w-full py-3 px-4 border-2 border-dashed border-[#7C3AED]/40 hover:border-[#7C3AED] rounded-xl text-xs font-bold text-[#7C3AED] bg-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{isProcessingQr ? 'ပုံချုံ့နေပါသည်...' : 'QR ပုံတင်မယ် (Upload)'}</span>
                </button>
                <span className="text-[10px] text-[#6B5B7B] mt-1 block">
                  စတုရန်းပုံစံ အလိုအလျောက် ချိန်ညှိပြီး သိမ်းဆည်းပေးပါမည်
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-1">
              အမျိုးအစား (KBZPay / WavePay / AYA Pay / ဘဏ်)
            </label>
            <input
              type="text"
              required
              value={mmkType}
              onChange={(e) => setMmkType(e.target.value)}
              placeholder="ဥပမာ - KBZPay / WavePay"
              className="w-full h-11 px-3 text-xs font-semibold text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-1">
              အကောင့်ပိုင်ရှင် အမည်
            </label>
            <input
              type="text"
              required
              value={mmkName}
              onChange={(e) => setMmkName(e.target.value)}
              placeholder="ဥပမာ - ဒေါ်လှလှဝင်း"
              className="w-full h-11 px-3 text-xs font-semibold text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-1">
              အကောင့် / ဖုန်းနံပါတ်
            </label>
            <input
              type="text"
              required
              value={mmkNumber}
              onChange={(e) => setMmkNumber(e.target.value)}
              placeholder="ဥပမာ - 09450012345"
              className="w-full h-11 px-3 text-xs font-mono font-semibold text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
            />
          </div>
        </section>

        {/* 6. Message Footer Line */}
        <section className="bg-white rounded-[20px] p-4.5 border border-purple-100 shadow-[0_2px_12px_rgba(46,26,71,0.04)] space-y-2">
          <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
            မက်ဆေ့ခ်ျ အောက်ခြေစာကြောင်း
          </h2>
          <input
            type="text"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            placeholder="လွှဲပြီးပါက Slip လေး ပို့ပေးပါခင်ဗျာ။"
            className="w-full h-11 px-3 text-xs font-medium text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
          />
        </section>

        {/* 7. Edit Quick-Amount Chips */}
        <section className="bg-white rounded-[20px] p-4.5 border border-purple-100 shadow-[0_2px_12px_rgba(46,26,71,0.04)] space-y-3">
          <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
            အမြန်ရွေးခလုတ်များ ပြင်ဆင်ရန် (Quick Chips)
          </h2>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-1">
              ကျပ်ငွေ ခလုတ်များ (သိန်းအရေအတွက် ဖြင့် ကော်မာခံရေးပါ)
            </label>
            <input
              type="text"
              value={kyatChipsStr}
              onChange={(e) => setKyatChipsStr(e.target.value)}
              placeholder="1, 5, 10, 50"
              className="w-full h-11 px-3 text-xs font-mono font-semibold text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
            />
            <span className="text-[10px] text-[#6B5B7B] mt-1 block">
              ဥပမာ: 1, 5, 10, 50 ဆိုပါက ၁ သိန်း၊ ၅ သိန်း၊ ၁၀ သိန်း၊ ၅၀ သိန်း ဖြစ်လာပါမည်
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B5B7B] mb-1">
              ဘတ်ငွေ ခလုတ်များ (ဘတ်ပမာဏ ဖြင့် ကော်မာခံရေးပါ)
            </label>
            <input
              type="text"
              value={bahtChipsStr}
              onChange={(e) => setBahtChipsStr(e.target.value)}
              placeholder="1000, 5000, 10000, 20000"
              className="w-full h-11 px-3 text-xs font-mono font-semibold text-[#2E1A47] bg-[#FBF7FF] border border-purple-100 rounded-[14px] focus:outline-hidden focus:border-[#7C3AED]"
            />
          </div>
        </section>

        {/* 8. Backup Export & Import */}
        <section className="bg-white rounded-[20px] p-4.5 border border-purple-100 shadow-[0_2px_12px_rgba(46,26,71,0.04)] space-y-3">
          <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
            အရန်သိမ်းဆည်းခြင်း (Backup & Restore)
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => exportBackup(settings)}
              className="h-12 px-3 border border-purple-200 hover:bg-[#F3E8FF] rounded-[14px] text-xs font-bold text-[#7C3AED] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Backup ထုတ်မည်</span>
            </button>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12 px-3 border border-purple-200 hover:bg-[#F3E8FF] rounded-[14px] text-xs font-bold text-[#7C3AED] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Backup ပြန်တင်မည်</span>
              </button>
            </div>
          </div>
        </section>

        {/* Save CTA */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full h-14 bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-[0.98] text-white text-base font-bold rounded-[18px] flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-900/10"
          >
            {savedSuccess ? (
              <>
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>သိမ်းဆည်းပြီးပါပြီ</span>
              </>
            ) : (
              <span>သိမ်းဆည်းမည်</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
