import { PaymentSlip, Student } from '@/types';
import { formatDMY, rupeesInWords } from './billingUtils';

/**
 * Draws a "Food Charges Slip" that looks like the pink paper slip given at the
 * dining office (Book No, R. No, Received From, Class, En. No, Room No, Sum of Rs,
 * amount in words, Date, Cashier). Pure canvas, no dependencies.
 */

const W = 1200;
const H = 960;
const PAPER = '#ecc4e6';
const PAPER_DARK = '#e2b2dc';
const PRINT = '#1b1b1b';
const INK = '#1f3fae';

const PRINT_FONT = '"Times New Roman", Times, serif';
const HAND_FONT = '"Segoe Print", "Bradley Hand", "Comic Sans MS", "Chalkboard SE", cursive';

export interface SlipData {
  slip: PaymentSlip;
  student: Pick<Student, 'name' | 'course' | 'enrollment_no' | 'house' | 'room_no'>;
}

const dotted = (ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) => {
  ctx.save();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
};

const label = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 27) => {
  ctx.fillStyle = PRINT;
  ctx.font = `bold ${size}px ${PRINT_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
  return ctx.measureText(text).width;
};

/** Handwriting-style value that shrinks to fit the given width. */
const ink = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, size = 32) => {
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  let s = size;
  ctx.font = `${s}px ${HAND_FONT}`;
  while (ctx.measureText(text).width > maxWidth && s > 16) {
    s -= 1;
    ctx.font = `${s}px ${HAND_FONT}`;
  }
  ctx.fillText(text, x, y);
};

const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
};

function tornPaperPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const step = 9;
  const jag = (i: number) => (i % 2 === 0 ? 0 : 3);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  for (let py = y, i = 0; py < y + h; py += step, i++) ctx.lineTo(x + w + jag(i), py);
  for (let px = x + w, i = 0; px > x; px -= step, i++) ctx.lineTo(px, y + h + jag(i));
  for (let py = y + h, i = 0; py > y; py -= step, i++) ctx.lineTo(x - jag(i), py);
  ctx.closePath();
}

export function renderFoodSlip({ slip, student }: SlipData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');

  // Backdrop + paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const px = 40;
  const py = 40;
  const pw = W - 80;
  const ph = H - 80;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  tornPaperPath(ctx, px, py, pw, ph);
  const grad = ctx.createLinearGradient(px, py, px + pw, py + ph);
  grad.addColorStop(0, PAPER);
  grad.addColorStop(1, PAPER_DARK);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Header
  ctx.textAlign = 'center';
  ctx.fillStyle = PRINT;
  ctx.font = `bold 40px ${PRINT_FONT}`;
  ctx.fillText('DUPLICATE', W / 2, 120);

  // Slip No. (formerly Book No., with R. No. removed)
  const sw = label(ctx, 'Slip No.', 90, 200);
  dotted(ctx, 90 + sw + 4, 520, 204);
  ctx.fillStyle = PRINT;
  ctx.font = `bold 46px ${PRINT_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(slip.slip_no, 90 + sw + 24, 200);

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = PRINT;
  ctx.font = `bold 44px ${PRINT_FONT}`;
  ctx.fillText('FOOD CHARGES SLIP', W / 2, 280);
  ctx.font = `bold 29px ${PRINT_FONT}`;
  ctx.fillText('SIR SHAH SULAIMAN HALL, A.M.U. ALIGARH', W / 2, 330);

  // Received From
  let wd = label(ctx, 'Received From', 90, 430);
  dotted(ctx, 90 + wd + 6, 1110, 434);
  ink(ctx, student.name, 90 + wd + 20, 426, 1110 - (90 + wd + 30), 36);

  // Class / En. No. / Room No.
  wd = label(ctx, 'Class.', 90, 520);
  dotted(ctx, 90 + wd + 4, 470, 524);
  ink(ctx, student.course, 90 + wd + 14, 516, 470 - (90 + wd + 20), 30);

  wd = label(ctx, 'En. No.', 485, 520);
  dotted(ctx, 485 + wd + 4, 800, 524);
  ink(ctx, student.enrollment_no, 485 + wd + 14, 516, 800 - (485 + wd + 20), 32);

  wd = label(ctx, 'Room No.', 815, 520);
  dotted(ctx, 815 + wd + 4, 1110, 524);
  ink(ctx, `${student.house}${student.room_no}`, 815 + wd + 14, 516, 1110 - (815 + wd + 20), 32);

  // Sum of Rs.
  wd = label(ctx, 'The Sum of Rs.', 90, 615);
  dotted(ctx, 90 + wd + 6, 1110, 619);
  const sumText =
    slip.breakup && slip.breakup.length > 1
      ? `${slip.breakup.join(' + ')} = ${slip.amount}/-`
      : `${slip.amount}/-`;
  ink(ctx, sumText, 90 + wd + 20, 611, 1110 - (90 + wd + 30), 38);

  // Rs. (in words)
  wd = label(ctx, 'Rs.', 90, 705);
  dotted(ctx, 90 + wd + 6, 1110, 709);
  ctx.font = `30px ${HAND_FONT}`;
  const words = wrap(ctx, rupeesInWords(slip.amount), 1110 - (90 + wd + 30));
  ink(ctx, words[0] ?? '', 90 + wd + 20, 700, 1110 - (90 + wd + 30), 30);
  if (words[1]) {
    dotted(ctx, 90, 1110, 769);
    ink(ctx, words[1], 110, 760, 980, 30);
  }

  // Date + cashier
  wd = label(ctx, 'Date', 90, 860);
  dotted(ctx, 90 + wd + 4, 520, 864);
  ink(ctx, formatDMY(slip.paid_on), 90 + wd + 20, 856, 520 - (90 + wd + 30), 34);

  if (slip.cashier) {
    ctx.save();
    ctx.translate(960, 820);
    ctx.rotate(-0.08);
    ink(ctx, slip.cashier, 0, 0, 190, 28);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  label(ctx, 'Cashier', 945, 868);

  // Footer note
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.font = `italic 17px ${PRINT_FONT}`;
  ctx.fillText('Duplicate copy generated from the Dining Portal', W / 2, 905);

  return canvas;
}

export function slipFileName({ slip, student }: SlipData): string {
  return `food-slip-${slip.slip_no}-${student.enrollment_no}.png`;
}

export function downloadCanvas(canvas: HTMLCanvasElement, fileName: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
