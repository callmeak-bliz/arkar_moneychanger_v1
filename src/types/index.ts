/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ExchangeMode = 'THB_TO_MMK' | 'MMK_TO_THB';

export interface ThaiAccountInfo {
  type: string; // e.g. "PromptPay", "Kasikorn Bank"
  name: string; // e.g. "ဦးကျော်သူ"
  number: string; // e.g. "0812345678"
  promptPayId?: string; // 10-digit phone or 13-digit ID
}

export interface MyanmarAccountInfo {
  type: string; // e.g. "KBZPay", "WavePay", "AYA Pay"
  name: string; // e.g. "ဒေါ်လှလှဝင်း"
  number: string; // e.g. "09450012345"
  qrImageDataUrl?: string | null; // compressed square QR image base64
}

export interface AppSettings {
  displayName: string; // "ပြမယ့်နာမည်" shown at top of image
  // Rates (both written as "၁ သိန်း = ___ ဘတ်")
  thbToMmkRate: number; // ဘတ်ပေးကျပ်ယူ (e.g. 715)
  thbToMmkUpdatedAt: string; // e.g. "1:40 PM"
  mmkToThbRate: number; // ကျပ်ပေးဘတ်ယူ (e.g. 730)
  mmkToThbUpdatedAt: string;

  // Rounding settings
  bahtDecimals: 0 | 1 | 2; // default 2
  roundKyatToHundred: boolean; // "ရာပြည့်လုပ်မယ်" (round to nearest 100), default false

  // Accounts
  thaiAccount: ThaiAccountInfo;
  myanmarAccount: MyanmarAccountInfo;

  // Footer message
  footerMessage: string;

  // Quick amount chips
  kyatChips: number[]; // e.g. [100000, 500000, 1000000, 5000000]
  bahtChips: number[]; // e.g. [1000, 5000, 10000, 20000]
}
