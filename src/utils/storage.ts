/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppSettings, ExchangeMode } from '../types';

const STORAGE_KEY = 'baht_kyat_v2_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  displayName: 'Money Changer',
  thbToMmkRate: 715,
  thbToMmkUpdatedAt: '1:40 PM',
  mmkToThbRate: 730,
  mmkToThbUpdatedAt: '1:40 PM',
  bahtDecimals: 2,
  roundKyatToHundred: false,
  thaiAccount: {
    type: 'PromptPay',
    name: 'ဦးကျော်သူ',
    number: '0812345678',
    promptPayId: '0812345678',
  },
  myanmarAccount: {
    type: 'KBZPay',
    name: 'ဒေါ်လှလှဝင်း',
    number: '09450012345',
    qrImageDataUrl: null,
  },
  footerMessage: 'လွှဲပြီးပါက Slip လေး ပို့ပေးပါခင်ဗျာ။',
  kyatChips: [100000, 500000, 1000000, 5000000],
  bahtChips: [1000, 5000, 10000, 20000],
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      displayName: typeof parsed.displayName === 'string' && parsed.displayName.trim() ? parsed.displayName : DEFAULT_SETTINGS.displayName,
      thbToMmkRate: Number(parsed.thbToMmkRate) || DEFAULT_SETTINGS.thbToMmkRate,
      thbToMmkUpdatedAt: parsed.thbToMmkUpdatedAt || DEFAULT_SETTINGS.thbToMmkUpdatedAt,
      mmkToThbRate: Number(parsed.mmkToThbRate) || DEFAULT_SETTINGS.mmkToThbRate,
      mmkToThbUpdatedAt: parsed.mmkToThbUpdatedAt || DEFAULT_SETTINGS.mmkToThbUpdatedAt,
      bahtDecimals: [0, 1, 2].includes(parsed.bahtDecimals) ? parsed.bahtDecimals : 2,
      roundKyatToHundred: Boolean(parsed.roundKyatToHundred),
      thaiAccount: {
        type: parsed.thaiAccount?.type || DEFAULT_SETTINGS.thaiAccount.type,
        name: parsed.thaiAccount?.name || DEFAULT_SETTINGS.thaiAccount.name,
        number: parsed.thaiAccount?.number || DEFAULT_SETTINGS.thaiAccount.number,
        promptPayId: parsed.thaiAccount?.promptPayId || parsed.thaiAccount?.number || DEFAULT_SETTINGS.thaiAccount.promptPayId,
      },
      myanmarAccount: {
        type: parsed.myanmarAccount?.type || DEFAULT_SETTINGS.myanmarAccount.type,
        name: parsed.myanmarAccount?.name || DEFAULT_SETTINGS.myanmarAccount.name,
        number: parsed.myanmarAccount?.number || DEFAULT_SETTINGS.myanmarAccount.number,
        qrImageDataUrl: parsed.myanmarAccount?.qrImageDataUrl || null,
      },
      footerMessage: typeof parsed.footerMessage === 'string' ? parsed.footerMessage : DEFAULT_SETTINGS.footerMessage,
      kyatChips: Array.isArray(parsed.kyatChips) && parsed.kyatChips.length > 0 ? parsed.kyatChips : DEFAULT_SETTINGS.kyatChips,
      bahtChips: Array.isArray(parsed.bahtChips) && parsed.bahtChips.length > 0 ? parsed.bahtChips : DEFAULT_SETTINGS.bahtChips,
    };
  } catch (err) {
    console.error('Failed to load settings', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

// English to Myanmar numeral converter
export function toMyanmarNumerals(numStr: string | number): string {
  const burmeseDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
  return String(numStr).replace(/[0-9]/g, (match) => burmeseDigits[parseInt(match, 10)]);
}

// Format numbers with thousand separators
export function formatNumber(num: number | string | undefined | null, decimals: number = 0): string {
  if (num === undefined || num === null || isNaN(Number(num))) return '0';
  const val = Number(num);
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Convert Kyat to Lakhs representation (e.g., 500,000 -> ၅ သိန်း, 1,250,000 -> ၁၂.၅ သိန်း)
export function formatKyatInLakhs(kyat: number): string {
  if (!kyat || isNaN(kyat) || kyat <= 0) return '၀ သိန်း';
  const lakhs = kyat / 100000;
  
  if (Number.isInteger(lakhs)) {
    return `${toMyanmarNumerals(lakhs)} သိန်း`;
  }
  // If decimal, show up to 2 decimal places without trailing zeros
  const rounded = Math.round(lakhs * 100) / 100;
  return `${toMyanmarNumerals(rounded)} သိန်း`;
}

// Format current time as "1:40 PM"
export function formatCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Format today's date in Burmese style
export function formatHeaderDate(): string {
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
  const burmeseMonths = [
    'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
    'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'
  ];
  const burmeseDays = [
    'တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'
  ];

  const dayOfWeek = burmeseDays[now.getDay()];
  const month = burmeseMonths[now.getMonth()];
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return `${dayOfWeek}၊ ${toMyanmarNumerals(year)} ${month} ${toMyanmarNumerals(day)} · ${time}`;
}

// Build the clipboard / share message
export function buildMessageText(
  mode: ExchangeMode,
  amount: number, // customer pays
  result: number, // customer receives
  rate: number,
  settings: AppSettings
): string {
  const rateLine = `၁ သိန်း = ${formatNumber(rate, 0)} ဘတ်`;
  const payCurrency = mode === 'THB_TO_MMK' ? 'ဘတ်' : 'ကျပ်';
  const receiveCurrency = mode === 'THB_TO_MMK' ? 'ကျပ်' : 'ဘတ်';

  const payDecimals = mode === 'THB_TO_MMK' ? settings.bahtDecimals : 0;
  const receiveDecimals = mode === 'THB_TO_MMK' ? 0 : settings.bahtDecimals;

  const account = mode === 'THB_TO_MMK' ? settings.thaiAccount : settings.myanmarAccount;
  const accountLine = `${account.type} · ${account.name}`;

  return `ဒီနေ့ဈေး — ${rateLine}

ပေးရမည့်ငွေ — ${formatNumber(amount, payDecimals)} ${payCurrency}
ရရှိမည့်ငွေ — ${formatNumber(result, receiveDecimals)} ${receiveCurrency}

ငွေလွှဲရန်
${accountLine}
${account.number}

${settings.footerMessage || 'လွှဲပြီးပါက Slip လေး ပို့ပေးပါခင်ဗျာ။'}`;
}

// Export backup JSON
export function exportBackup(settings: AppSettings): void {
  const jsonContent = JSON.stringify(settings, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `money_changer_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
