/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppSettings, ExchangeMode } from '../types';
import { formatNumber } from './storage';

// Helper to draw a rounded rectangle on Canvas
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Generate the 1080 × 1350 PNG image using standard Canvas 2D API
export async function generateExchangeCanvas(
  mode: ExchangeMode,
  amount: number,
  result: number,
  rate: number,
  settings: AppSettings,
  qrDataUrl?: string | null
): Promise<Blob> {
  // Wait for Google Fonts to load so Burmese fonts don't break
  try {
    await Promise.all([
      document.fonts.load('48px "Noto Sans Myanmar"'),
      document.fonts.load('bold 48px "Noto Sans Myanmar"'),
      document.fonts.load('bold 60px "Noto Sans Myanmar"'),
      document.fonts.load('bold 72px "Nunito"'),
      document.fonts.load('32px "Nunito"'),
    ]);
  } catch (err) {
    console.warn('Fonts preloading caught error', err);
  }
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 1. Overall Background: lavender #FBF7FF
  ctx.fillStyle = '#FBF7FF';
  ctx.fillRect(0, 0, 1080, 1350);

  // 2. White Card with soft corners & subtle border
  const cardX = 48;
  const cardY = 48;
  const cardW = 984;
  const cardH = 1254;
  const cardRadius = 36;

  ctx.save();
  ctx.shadowColor = 'rgba(46, 26, 71, 0.06)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  // Card outline
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.strokeStyle = '#E9D5FF';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const centerX = 540;

  // 3. Display Name
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2E1A47';
  ctx.font = 'bold 44px "Noto Sans Myanmar", "Nunito", sans-serif';
  const titleText = settings.displayName || 'Money Changer';
  ctx.fillText(titleText, centerX, 115);

  // 4. Date and Time (e.g. 9 Nov 2026 · 1:54 PM)
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  ctx.fillStyle = '#6B5B7B';
  ctx.font = '500 24px "Nunito", "Noto Sans Myanmar", sans-serif';
  ctx.fillText(`${dateFormatted} · ${timeFormatted}`, centerX, 165);

  // 5. Tab Label Pill ("ဘတ်ပေးကျပ်ယူ" or "ကျပ်ပေးဘတ်ယူ")
  const tabLabel = mode === 'THB_TO_MMK' ? 'ဘတ်ပေးကျပ်ယူ' : 'ကျပ်ပေးဘတ်ယူ';
  ctx.save();
  const pillW = 220;
  const pillH = 46;
  const pillX = centerX - pillW / 2;
  const pillY = 205;
  roundRect(ctx, pillX, pillY, pillW, pillH, 23);
  ctx.fillStyle = '#F3E8FF';
  ctx.fill();

  ctx.fillStyle = '#7C3AED';
  ctx.font = 'bold 24px "Noto Sans Myanmar", "Nunito", sans-serif';
  ctx.fillText(tabLabel, centerX, pillY + pillH / 2);
  ctx.restore();

  // 6. Rate: "၁ သိန်း = {rate} ဘတ်"
  ctx.fillStyle = '#7C3AED';
  ctx.font = 'bold 32px "Noto Sans Myanmar", "Nunito", sans-serif';
  ctx.fillText(`၁ သိန်း = ${formatNumber(rate, 0)} ဘတ်`, centerX, 290);

  // Hairline separator
  ctx.strokeStyle = '#F3E8FF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(120, 325);
  ctx.lineTo(960, 325);
  ctx.stroke();

  // 7. ပေးရမည့်ငွေ — {amount}
  const payCurrency = mode === 'THB_TO_MMK' ? 'ဘတ်' : 'ကျပ်';
  const payDecimals = mode === 'THB_TO_MMK' ? settings.bahtDecimals : 0;
  const payAmountText = `${formatNumber(amount, payDecimals)} ${payCurrency}`;

  ctx.font = '500 28px "Noto Sans Myanmar", "Nunito", sans-serif';
  ctx.fillStyle = '#6B5B7B';
  ctx.fillText(`ပေးရမည့်ငွေ — `, centerX - 80, 370);
  ctx.font = 'bold 34px "Nunito", "Noto Sans Myanmar", sans-serif';
  ctx.fillStyle = '#2E1A47';
  ctx.textAlign = 'left';
  ctx.fillText(payAmountText, centerX - 10, 370);

  // 8. ရရှိမည့်ငွေ — {result} (large, pink #EC4899)
  const receiveCurrency = mode === 'THB_TO_MMK' ? 'ကျပ်' : 'ဘတ်';
  const receiveDecimals = mode === 'THB_TO_MMK' ? 0 : settings.bahtDecimals;
  const receiveAmountText = `${formatNumber(result, receiveDecimals)} ${receiveCurrency}`;

  ctx.textAlign = 'center';
  ctx.font = '500 28px "Noto Sans Myanmar", "Nunito", sans-serif';
  ctx.fillStyle = '#6B5B7B';
  ctx.fillText(`ရရှိမည့်ငွေ`, centerX, 425);

  ctx.font = 'bold 54px "Nunito", "Noto Sans Myanmar", sans-serif';
  ctx.fillStyle = '#EC4899'; // Accent Pink
  ctx.fillText(receiveAmountText, centerX, 480);

  // 9. ငွေလွှဲရန် — account type · name · number
  const activeAccount = mode === 'THB_TO_MMK' ? settings.thaiAccount : settings.myanmarAccount;
  const accountTypeText = mode === 'THB_TO_MMK' ? 'ထိုင်းအကောင့်သို့' : 'မြန်မာအကောင့်သို့';

  ctx.fillStyle = '#6B5B7B';
  ctx.font = '500 24px "Noto Sans Myanmar", "Nunito", sans-serif';
  ctx.fillText(`ငွေလွှဲရန် (${accountTypeText})`, centerX, 538);

  ctx.fillStyle = '#2E1A47';
  ctx.font = 'bold 30px "Noto Sans Myanmar", "Nunito", sans-serif';
  ctx.fillText(`${activeAccount.type} · ${activeAccount.name}`, centerX, 578);

  ctx.fillStyle = '#2E1A47';
  ctx.font = 'bold 32px "Nunito", monospace';
  ctx.fillText(activeAccount.number, centerX, 618);

  // 10. QR Code (large, centered, white background, at least 520px)
  const qrSize = 520;
  const qrX = centerX - qrSize / 2;
  const qrY = 660;

  // Draw QR background box with subtle border
  ctx.save();
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E9D5FF';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  if (qrDataUrl) {
    try {
      const qrImg = await loadImage(qrDataUrl);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch (err) {
      console.error('Failed to draw QR image on canvas', err);
      drawQrPlaceholder(ctx, qrX, qrY, qrSize);
    }
  } else {
    drawQrPlaceholder(ctx, qrX, qrY, qrSize);
  }

  // 11. Footer line
  ctx.fillStyle = '#6B5B7B';
  ctx.font = '500 24px "Noto Sans Myanmar", "Nunito", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(settings.footerMessage || 'လွှဲပြီးပါက Slip လေး ပို့ပေးပါခင်ဗျာ။', centerX, 1245);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/png');
  });
}

function drawQrPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.fillStyle = '#F3E8FF';
  roundRect(ctx, x, y, size, size, 16);
  ctx.fill();

  ctx.fillStyle = '#7C3AED';
  ctx.font = 'bold 26px "Noto Sans Myanmar", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Settings တွင် QR ထည့်သွင်းပါ', x + size / 2, y + size / 2);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Generate filename e.g. exchange-20261109-1354.png
export function getExchangeImageFilename(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `exchange-${year}${month}${day}-${hours}${mins}.png`;
}

// Download blob as PNG file
export function downloadImageBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Compress and crop uploaded image to square (500x500 JPEG)
export function compressImageToSquare(file: File, maxDim = 500, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const minSide = Math.min(img.width, img.height);
        const startX = (img.width - minSide) / 2;
        const startY = (img.height - minSide) / 2;

        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, maxDim, maxDim);
        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, maxDim, maxDim);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
