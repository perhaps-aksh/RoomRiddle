import qrcode from 'qrcode-generator';
import type {QrMatrix} from '@roomriddle/shared-types';

/**
 * Encodes a join URL as a QR matrix (rows of '1'/'0'). The TV draws it with
 * plain Views, so it needs no QR library of its own.
 */
export function qrMatrix(text: string): QrMatrix {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  const rows: string[] = [];
  for (let r = 0; r < size; r++) {
    let row = '';
    for (let c = 0; c < size; c++) row += qr.isDark(r, c) ? '1' : '0';
    rows.push(row);
  }
  return rows;
}
