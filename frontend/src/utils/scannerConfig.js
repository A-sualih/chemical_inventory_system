import { Html5QrcodeSupportedFormats } from 'html5-qrcode';

/** Formats for lab labels (QR) and manufacturer bottle barcodes (1D) */
export const SCAN_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
];

/**
 * Adaptive scan window — wide for 1D barcodes, tall enough for QR.
 * @param {'auto'|'qr'|'barcode'} mode
 */
export function getQrBox(mode = 'auto') {
  return (viewfinderWidth, viewfinderHeight) => {
    const maxW = Math.floor(viewfinderWidth * 0.88);
    const maxH = Math.floor(viewfinderHeight * 0.72);

    if (mode === 'qr') {
      const side = Math.min(maxW, maxH, 280);
      return { width: side, height: side };
    }

    if (mode === 'barcode') {
      const width = Math.min(maxW, 460);
      const height = Math.min(Math.floor(width * 0.32), 150, maxH);
      return { width, height: Math.max(height, 100) };
    }

    // Auto: wide rectangle that still fits QR codes
    const width = Math.min(maxW, 400);
    const height = Math.min(Math.floor(width * 0.55), 240, maxH);
    return { width, height: Math.max(height, 160) };
  };
}

export function getScannerConfig(mode = 'auto') {
  return {
    fps: 24,
    qrbox: getQrBox(mode),
    aspectRatio: mode === 'barcode' ? 1.777 : 1.333,
    disableFlip: false,
    formatsToSupport: SCAN_FORMATS,
  };
}
