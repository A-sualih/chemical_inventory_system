/** Normalize scanned QR / barcode / URL payloads (matches web TransactionSystem + ScanQR). */
export function parseScanCode(code: string): string {
  let finalCode = String(code || '').trim();
  if (!finalCode) return '';

  if (finalCode.includes('/chemicals/details/')) {
    finalCode = finalCode.split('/chemicals/details/')[1].split('/')[0].split('?')[0];
  } else if (finalCode.includes('/containers/')) {
    const parts = finalCode.split('/');
    finalCode = parts[parts.length - 1];
  } else if (finalCode.startsWith('CIMS:')) {
    finalCode = finalCode.split('|')[0].split(':')[1];
  }

  return finalCode;
}
