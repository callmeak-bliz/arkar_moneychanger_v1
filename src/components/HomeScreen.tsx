/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Copy, 
  Share2, 
  Download, 
  Check, 
  Edit3, 
  MessageSquare,
  QrCode,
  Image as ImageIcon
} from 'lucide-react';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';
import { AppSettings, ExchangeMode } from '../types';
import { 
  formatNumber, 
  formatKyatInLakhs, 
  formatHeaderDate, 
  formatCurrentTime,
  buildMessageText 
} from '../utils/storage';
import { 
  generateExchangeCanvas, 
  getExchangeImageFilename, 
  downloadImageBlob 
} from '../utils/canvasExport';

interface HomeScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  settings,
  onUpdateSettings,
  onOpenSettings,
}) => {
  const [mode, setMode] = useState<ExchangeMode>('THB_TO_MMK');
  const [lastFocused, setLastFocused] = useState<'kyat' | 'baht'>('kyat');
  
  // Amounts
  const [kyatValue, setKyatValue] = useState<number>(500000);
  const [bahtValue, setBahtValue] = useState<number>(3575);

  // String display for inputs
  const [kyatInputStr, setKyatInputStr] = useState<string>('500,000');
  const [bahtInputStr, setBahtInputStr] = useState<string>('3,575');

  // Inline rate editing state
  const [isEditingRate, setIsEditingRate] = useState<boolean>(false);
  const [inlineRateInput, setInlineRateInput] = useState<string>('');
  const rateInputRef = useRef<HTMLInputElement>(null);

  // Live header date & time string
  const [headerDateStr, setHeaderDateStr] = useState<string>(() => formatHeaderDate());

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // PromptPay QR generated data URL
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

  // Update header time every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setHeaderDateStr(formatHeaderDate());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const currentRate = mode === 'THB_TO_MMK' ? settings.thbToMmkRate : settings.mmkToThbRate;
  const currentUpdatedAt = mode === 'THB_TO_MMK' ? settings.thbToMmkUpdatedAt : settings.mmkToThbUpdatedAt;

  // Generate PromptPay QR whenever bahtValue or promptPayId changes
  useEffect(() => {
    let isCancelled = false;
    const targetId = (settings.thaiAccount.promptPayId || settings.thaiAccount.number || '').replace(/[^0-9]/g, '');

    if (mode === 'THB_TO_MMK' && targetId.length >= 10 && bahtValue > 0) {
      try {
        const payload = generatePayload(targetId, {
          amount: Number(bahtValue.toFixed(2)),
        });
        QRCode.toDataURL(payload, {
          width: 520,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        }).then((dataUrl) => {
          if (!isCancelled) {
            setPromptPayQrUrl(dataUrl);
          }
        }).catch((err) => {
          console.error('QRCode error', err);
        });
      } catch (err) {
        console.error('PromptPay payload error', err);
      }
    } else {
      setPromptPayQrUrl(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [mode, bahtValue, settings.thaiAccount.promptPayId, settings.thaiAccount.number]);

  // Active QR image to show:
  const activeQrDataUrl = mode === 'THB_TO_MMK' ? promptPayQrUrl : settings.myanmarAccount.qrImageDataUrl;
  const hasValidQr = Boolean(activeQrDataUrl);

  // Recalculate when mode or rate changes
  useEffect(() => {
    if (lastFocused === 'kyat') {
      const b = (kyatValue / 100000) * currentRate;
      const roundedB = Number(b.toFixed(settings.bahtDecimals));
      setBahtValue(roundedB);
      setBahtInputStr(formatNumber(roundedB, settings.bahtDecimals));
    } else {
      let k = (bahtValue / currentRate) * 100000;
      if (settings.roundKyatToHundred) {
        k = Math.round(k / 100) * 100;
      } else {
        k = Math.round(k);
      }
      setKyatValue(k);
      setKyatInputStr(formatNumber(k, 0));
    }
  }, [mode, currentRate, settings.bahtDecimals, settings.roundKyatToHundred]);

  // Recalculate from Kyat
  const handleKyatChange = (rawStr: string) => {
    const cleanDigits = rawStr.replace(/[^0-9]/g, '');
    const num = cleanDigits ? parseInt(cleanDigits, 10) : 0;
    setKyatValue(num);
    setKyatInputStr(cleanDigits ? formatNumber(num) : '');
    setLastFocused('kyat');

    if (currentRate > 0) {
      const b = (num / 100000) * currentRate;
      const roundedB = Number(b.toFixed(settings.bahtDecimals));
      setBahtValue(roundedB);
      setBahtInputStr(formatNumber(roundedB, settings.bahtDecimals));
    }
  };

  // Recalculate from Baht
  const handleBahtChange = (rawStr: string) => {
    let clean = rawStr.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }

    const num = clean ? parseFloat(clean) : 0;
    setBahtValue(num);
    setBahtInputStr(clean);
    setLastFocused('baht');

    if (currentRate > 0) {
      let k = (num / currentRate) * 100000;
      if (settings.roundKyatToHundred) {
        k = Math.round(k / 100) * 100;
      } else {
        k = Math.round(k);
      }
      setKyatValue(k);
      setKyatInputStr(formatNumber(k, 0));
    }
  };

  // Quick Chips
  const handleKyatChipClick = (amount: number) => {
    setLastFocused('kyat');
    setKyatValue(amount);
    setKyatInputStr(formatNumber(amount));
    if (currentRate > 0) {
      const b = (amount / 100000) * currentRate;
      const roundedB = Number(b.toFixed(settings.bahtDecimals));
      setBahtValue(roundedB);
      setBahtInputStr(formatNumber(roundedB, settings.bahtDecimals));
    }
  };

  const handleBahtChipClick = (amount: number) => {
    setLastFocused('baht');
    setBahtValue(amount);
    setBahtInputStr(formatNumber(amount, settings.bahtDecimals));
    if (currentRate > 0) {
      let k = (amount / currentRate) * 100000;
      if (settings.roundKyatToHundred) {
        k = Math.round(k / 100) * 100;
      } else {
        k = Math.round(k);
      }
      setKyatValue(k);
      setKyatInputStr(formatNumber(k, 0));
    }
  };

  // Inline rate editing
  const startInlineEdit = () => {
    setInlineRateInput(currentRate.toString());
    setIsEditingRate(true);
    setTimeout(() => {
      rateInputRef.current?.focus();
      rateInputRef.current?.select();
    }, 50);
  };

  const saveInlineRate = () => {
    const parsed = parseFloat(inlineRateInput);
    if (!isNaN(parsed) && parsed > 0) {
      const timeNow = formatCurrentTime();
      if (mode === 'THB_TO_MMK') {
        onUpdateSettings({
          ...settings,
          thbToMmkRate: parsed,
          thbToMmkUpdatedAt: timeNow,
        });
      } else {
        onUpdateSettings({
          ...settings,
          mmkToThbRate: parsed,
          mmkToThbUpdatedAt: timeNow,
        });
      }
    }
    setIsEditingRate(false);
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveInlineRate();
    } else if (e.key === 'Escape') {
      setIsEditingRate(false);
    }
  };

  // Customer amounts
  const customerPayAmount = mode === 'THB_TO_MMK' ? bahtValue : kyatValue;
  const customerReceiveAmount = mode === 'THB_TO_MMK' ? kyatValue : bahtValue;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  // 1. "စာကူးမယ်"
  const handleCopy = async () => {
    const text = buildMessageText(
      mode,
      customerPayAmount,
      customerReceiveAmount,
      currentRate,
      settings
    );
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast('ကူးပြီးပါပြီ');
    } catch {
      showToast('ကူးပြီးပါပြီ');
    }
  };

  // 2. "ပုံပို့မယ်" — Share PNG via navigator.share({ files })
  const handleShareImage = async () => {
    setIsGeneratingImage(true);
    try {
      const blob = await generateExchangeCanvas(
        mode,
        customerPayAmount,
        customerReceiveAmount,
        currentRate,
        settings,
        activeQrDataUrl
      );
      const filename = getExchangeImageFilename();
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: settings.displayName || 'Baht Kyat Exchange',
        });
      } else {
        // Fallback: download the image
        downloadImageBlob(blob, filename);
        showToast('ပုံသိမ်းပြီးပါပြီ');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share error', err);
        // Fallback: download
        try {
          const blob = await generateExchangeCanvas(
            mode,
            customerPayAmount,
            customerReceiveAmount,
            currentRate,
            settings,
            activeQrDataUrl
          );
          downloadImageBlob(blob, getExchangeImageFilename());
          showToast('ပုံသိမ်းပြီးပါပြီ');
        } catch {
          showToast('ပုံထုတ်မရပါ');
        }
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 3. "ပုံသိမ်းမယ်" — Download 1080x1350 PNG
  const handleDownloadImage = async () => {
    setIsGeneratingImage(true);
    try {
      const blob = await generateExchangeCanvas(
        mode,
        customerPayAmount,
        customerReceiveAmount,
        currentRate,
        settings,
        activeQrDataUrl
      );
      const filename = getExchangeImageFilename();
      downloadImageBlob(blob, filename);
      showToast('ပုံသိမ်းပြီးပါပြီ');
    } catch (err) {
      console.error('Download error', err);
      showToast('ပုံသိမ်းမရပါ');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7FF] text-[#2E1A47] pb-36 max-w-md mx-auto px-4 pt-4">
      {/* 1. Header with Settings Gear and Centered Small Date/Time */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="w-10"></div>
        <p className="text-[11px] font-medium text-[#6B5B7B] tracking-tight text-center">
          {headerDateStr}
        </p>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#6B5B7B] hover:text-[#2E1A47] hover:bg-[#F3E8FF] transition-colors"
        >
          <Settings className="w-5 h-5 stroke-[1.8]" />
        </button>
      </div>

      {/* 2. Segmented Tabs: "ဘတ်ပေးကျပ်ယူ" | "ကျပ်ပေးဘတ်ယူ" */}
      <div className="grid grid-cols-2 p-1 bg-[#F3E8FF] rounded-[20px] gap-1 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setMode('THB_TO_MMK');
            setIsEditingRate(false);
          }}
          className={`h-12 rounded-[16px] text-sm font-bold tracking-tight transition-all active:scale-[0.98] ${
            mode === 'THB_TO_MMK'
              ? 'bg-[#7C3AED] text-white shadow-xs'
              : 'text-[#6B5B7B] hover:text-[#2E1A47]'
          }`}
        >
          ဘတ်ပေးကျပ်ယူ
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('MMK_TO_THB');
            setIsEditingRate(false);
          }}
          className={`h-12 rounded-[16px] text-sm font-bold tracking-tight transition-all active:scale-[0.98] ${
            mode === 'MMK_TO_THB'
              ? 'bg-[#7C3AED] text-white shadow-xs'
              : 'text-[#6B5B7B] hover:text-[#2E1A47]'
          }`}
        >
          ကျပ်ပေးဘတ်ယူ
        </button>
      </div>

      {/* 3. Rate Row for Selected Tab: "၁ သိန်း = 715 ဘတ်" */}
      <div className="my-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-medium text-[#6B5B7B]">
            ဒီနေ့ပေါက်ဈေး :
          </span>

          {!isEditingRate ? (
            <button
              type="button"
              onClick={startInlineEdit}
              title="ပေါက်ဈေးပြင်ရန် နှိပ်ပါ"
              className="inline-flex items-center gap-1.5 py-1 px-3 bg-white hover:bg-[#F3E8FF] border border-purple-100 rounded-full shadow-2xs group transition-colors"
            >
              <span className="text-base font-bold text-[#7C3AED] tabular-nums">
                ၁ သိန်း = {formatNumber(currentRate, 0)} ဘတ်
              </span>
              <Edit3 className="w-3.5 h-3.5 text-[#EC4899] opacity-80 group-hover:opacity-100" />
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-white p-1 rounded-full border-2 border-[#7C3AED] shadow-xs">
              <span className="text-xs font-semibold pl-2 text-[#6B5B7B]">
                ၁ သိန်း =
              </span>
              <input
                ref={rateInputRef}
                type="number"
                step="1"
                value={inlineRateInput}
                onChange={(e) => setInlineRateInput(e.target.value)}
                onKeyDown={handleInlineKeyDown}
                onBlur={saveInlineRate}
                className="w-16 text-center font-bold text-[#7C3AED] text-base focus:outline-hidden"
              />
              <span className="text-xs font-semibold text-[#6B5B7B]">ဘတ်</span>
              <button
                type="button"
                onClick={saveInlineRate}
                className="w-7 h-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center hover:bg-[#6D28D9]"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-[11px] text-[#6B5B7B] mt-1.5">
          {currentUpdatedAt} မှာ ပြင်ခဲ့
        </p>
      </div>

      {/* 4. Two Input Cards, Both Editable (MMK & THB) */}
      <div className="space-y-3">
        {/* Myanmar Kyat (MMK) Card */}
        <div
          className={`bg-white rounded-[20px] p-4.5 border transition-all shadow-[0_2px_12px_rgba(46,26,71,0.04)] ${
            lastFocused === 'kyat'
              ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/10'
              : 'border-purple-100/70'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-lg" role="img" aria-label="Myanmar flag">
                🇲🇲
              </span>
              <span className="text-xs font-bold text-[#6B5B7B]">
                မြန်မာကျပ်ငွေ (MMK)
              </span>
            </div>

            <span className="text-[11px] font-semibold text-[#6B5B7B]">
              {mode === 'THB_TO_MMK' ? 'ရရှိမည့်ငွေ' : 'ပေးရမည့်ငွေ'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={kyatInputStr}
              onChange={(e) => handleKyatChange(e.target.value)}
              onFocus={() => setLastFocused('kyat')}
              placeholder="0"
              className={`w-full text-3xl font-extrabold tabular-nums bg-transparent focus:outline-hidden tracking-tight ${
                mode === 'THB_TO_MMK' ? 'text-[#EC4899]' : 'text-[#2E1A47]'
              }`}
            />
            <span className="text-base font-bold text-[#6B5B7B] shrink-0">
              ကျပ်
            </span>
          </div>

          <div className="mt-1 pt-2 border-t border-purple-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7C3AED]">
              {formatKyatInLakhs(kyatValue)}
            </span>
            <span className="text-[11px] text-[#6B5B7B]">
              (၁ သိန်း = ၁၀၀,၀၀၀ ကျပ်)
            </span>
          </div>
        </div>

        {/* Thai Baht (THB) Card */}
        <div
          className={`bg-white rounded-[20px] p-4.5 border transition-all shadow-[0_2px_12px_rgba(46,26,71,0.04)] ${
            lastFocused === 'baht'
              ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/10'
              : 'border-purple-100/70'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-lg" role="img" aria-label="Thailand flag">
                🇹🇭
              </span>
              <span className="text-xs font-bold text-[#6B5B7B]">
                ထိုင်းဘတ်ငွေ (THB)
              </span>
            </div>

            <span className="text-[11px] font-semibold text-[#6B5B7B]">
              {mode === 'MMK_TO_THB' ? 'ရရှိမည့်ငွေ' : 'ပေးရမည့်ငွေ'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={bahtInputStr}
              onChange={(e) => handleBahtChange(e.target.value)}
              onFocus={() => setLastFocused('baht')}
              placeholder="0"
              className={`w-full text-3xl font-extrabold tabular-nums bg-transparent focus:outline-hidden tracking-tight ${
                mode === 'MMK_TO_THB' ? 'text-[#EC4899]' : 'text-[#2E1A47]'
              }`}
            />
            <span className="text-base font-bold text-[#6B5B7B] shrink-0">
              ဘတ်
            </span>
          </div>

          <div className="mt-1 pt-2 border-t border-purple-50 flex items-center justify-between text-[11px] text-[#6B5B7B]">
            <span>ဒသမ {settings.bahtDecimals} နေရာ ဖြတ်ထားသည်</span>
            <span className="font-mono">฿ THB</span>
          </div>
        </div>
      </div>

      {/* 5. Quick-Amount Chips under Inputs */}
      <div className="my-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#6B5B7B]">
            အမြန်ရွေးချယ်ရန် ({lastFocused === 'kyat' ? 'ကျပ်ငွေ' : 'ဘတ်ငွေ'} အတွက်)
          </span>
          <button
            type="button"
            onClick={() => setLastFocused(lastFocused === 'kyat' ? 'baht' : 'kyat')}
            className="text-[10px] text-[#7C3AED] hover:underline"
          >
            {lastFocused === 'kyat' ? 'ဘတ်ပြောင်းမည် →' : 'ကျပ်ပြောင်းမည် →'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {lastFocused === 'kyat'
            ? settings.kyatChips.map((chipVal) => {
                const label = formatKyatInLakhs(chipVal);
                return (
                  <button
                    key={chipVal}
                    type="button"
                    onClick={() => handleKyatChipClick(chipVal)}
                    className="py-2.5 px-1 bg-white hover:bg-[#F3E8FF] border border-purple-100 rounded-[14px] text-xs font-semibold text-[#2E1A47] active:scale-95 transition-all text-center shadow-2xs"
                  >
                    {label}
                  </button>
                );
              })
            : settings.bahtChips.map((chipVal) => (
                <button
                  key={chipVal}
                  type="button"
                  onClick={() => handleBahtChipClick(chipVal)}
                  className="py-2.5 px-1 bg-white hover:bg-[#F3E8FF] border border-purple-100 rounded-[14px] text-xs font-semibold text-[#2E1A47] font-mono active:scale-95 transition-all text-center shadow-2xs"
                >
                  {formatNumber(chipVal)}
                </button>
              ))}
        </div>
      </div>

      {/* 6. Message Preview Card "ပို့မယ့်စာ", Chat-Bubble Style with QR Code */}
      <div className="my-5 bg-[#F3E8FF] rounded-[20px] p-4.5 border border-purple-200/60 shadow-2xs relative">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
            <h2 className="text-xs font-bold text-[#2E1A47]">
              ပို့မယ့်စာ (Message Preview)
            </h2>
          </div>
          <span className="text-[10px] text-[#6B5B7B] font-medium">
            ဖောက်သည်ထံ ပို့ရန်
          </span>
        </div>

        {/* Bubble message content */}
        <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-[16px] border border-purple-100 space-y-2 text-xs leading-relaxed text-[#2E1A47] font-sans">
          <p className="font-semibold text-[#7C3AED]">
            ဒီနေ့ဈေး — ၁ သိန်း = {formatNumber(currentRate, 0)} ဘတ်
          </p>

          <div className="py-1 border-y border-purple-50 space-y-1">
            <p>
              <span className="text-[#6B5B7B]">ပေးရမည့်ငွေ — </span>
              <span className="font-bold tabular-nums">
                {formatNumber(
                  customerPayAmount,
                  mode === 'THB_TO_MMK' ? settings.bahtDecimals : 0
                )}{' '}
                {mode === 'THB_TO_MMK' ? 'ဘတ်' : 'ကျပ်'}
              </span>
            </p>
            <p>
              <span className="text-[#6B5B7B]">ရရှိမည့်ငွေ — </span>
              <span className="font-bold tabular-nums text-[#EC4899]">
                {formatNumber(
                  customerReceiveAmount,
                  mode === 'THB_TO_MMK' ? 0 : settings.bahtDecimals
                )}{' '}
                {mode === 'THB_TO_MMK' ? 'ကျပ်' : 'ဘတ်'}
              </span>
            </p>
          </div>

          <div className="space-y-0.5 pt-0.5">
            <p className="font-semibold text-[#6B5B7B] text-[11px]">
              ငွေလွှဲရန် {mode === 'THB_TO_MMK' ? '(ထိုင်းအကောင့်)' : '(မြန်မာအကောင့်)'}
            </p>
            <p className="font-bold">
              {mode === 'THB_TO_MMK'
                ? `${settings.thaiAccount.type} · ${settings.thaiAccount.name}`
                : `${settings.myanmarAccount.type} · ${settings.myanmarAccount.name}`}
            </p>
            <p className="font-mono font-medium tracking-wide">
              {mode === 'THB_TO_MMK'
                ? settings.thaiAccount.number
                : settings.myanmarAccount.number}
            </p>
          </div>

          {/* QR Code Section inside Message Preview */}
          <div className="pt-2 pb-1 text-center">
            {hasValidQr && activeQrDataUrl ? (
              <div className="inline-block p-2 bg-white rounded-2xl border border-purple-100 shadow-2xs">
                <img
                  src={activeQrDataUrl}
                  alt={mode === 'THB_TO_MMK' ? 'PromptPay QR' : 'Myanmar QR'}
                  className="w-44 h-44 object-contain mx-auto rounded-xl"
                />
                <p className="text-[10px] text-[#6B5B7B] mt-1 font-medium">
                  {mode === 'THB_TO_MMK'
                    ? `PromptPay Scan (฿ ${formatNumber(bahtValue, 2)})`
                    : `${settings.myanmarAccount.type} QR`}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-white/60 rounded-xl border border-dashed border-purple-200">
                <p className="text-[11px] text-[#6B5B7B] mb-1">
                  {mode === 'THB_TO_MMK'
                    ? 'PromptPay QR မထည့်ရသေးပါ'
                    : 'မြန်မာ QR ပုံ မထည့်ရသေးပါ'}
                </p>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-xs font-bold text-[#7C3AED] hover:underline inline-flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Settings မှာ QR ထည့်ပါ
                </button>
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#6B5B7B] pt-1 border-t border-purple-50">
            {settings.footerMessage}
          </p>
        </div>
      </div>

      {/* 7. Replacement Bottom Buttons: "စာကူးမယ်" | "ပုံပို့မယ်" | "ပုံသိမ်းမယ်" */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#FBF7FF]/95 backdrop-blur-md border-t border-purple-100 p-3.5 pb-safe shadow-lg">
        {/* Toast confirmation */}
        {toastMessage && (
          <div className="max-w-xs mx-auto mb-2.5 py-2 px-4 bg-[#2E1A47] text-white text-xs font-medium rounded-full text-center flex items-center justify-center gap-1.5 shadow-md animate-fade-in">
            <Check className="w-4 h-4 text-[#EC4899]" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          {/* Button 1: "စာကူးမယ်" */}
          <button
            type="button"
            onClick={handleCopy}
            className="h-13 rounded-[16px] border-2 border-[#7C3AED] bg-white text-[#7C3AED] hover:bg-[#F3E8FF] active:scale-[0.98] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all select-none shadow-2xs"
          >
            <Copy className="w-4 h-4 stroke-[2]" />
            <span>စာကူးမယ်</span>
          </button>

          {/* Button 2: "ပုံပို့မယ်" */}
          <button
            type="button"
            disabled={isGeneratingImage}
            onClick={handleShareImage}
            className="h-13 rounded-[16px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white active:scale-[0.98] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all select-none shadow-md shadow-purple-900/10 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 stroke-[2]" />
            <span>ပုံပို့မယ်</span>
          </button>

          {/* Button 3: "ပုံသိမ်းမယ်" */}
          <button
            type="button"
            disabled={isGeneratingImage}
            onClick={handleDownloadImage}
            className="h-13 rounded-[16px] border border-purple-200 bg-white hover:bg-[#F3E8FF] text-[#2E1A47] active:scale-[0.98] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all select-none shadow-2xs disabled:opacity-50"
          >
            <Download className="w-4 h-4 stroke-[2] text-[#7C3AED]" />
            <span>ပုံသိမ်းမယ်</span>
          </button>
        </div>
      </div>
    </div>
  );
};
