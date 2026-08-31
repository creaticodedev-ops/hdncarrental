import ExcelJS from 'exceljs';
import { defaultAgencyName } from '../../utils/brand.js';
import { calcRentalDays } from '../../utils/helpers.js';
import { labelStatus, monthName, normalizeLang, t } from './i18n.js';

export const EXPORT_ROW_CAP = 25000;
export const CURRENCY_CODE = 'MAD';
export const AGENCY_TZ = 'Africa/Casablanca';

export const DESIGN = {
  burgundy: 'FF8F1F1F',
  ivory: 'FFFFF8F0',
  sand: 'FFF7F1EA',
  ink: 'FF1C1412',
  muted: 'FF6B5E56',
  line: 'FFD9CDBF',
  positiveBg: 'FFE8F0EA',
  positiveFg: 'FF1F5C3A',
  warningBg: 'FFF6F0E4',
  warningFg: 'FF8A6A1F',
  dangerBg: 'FFF8EBE8',
  dangerFg: 'FF8F1F1F',
  infoBg: 'FFEEE8E0',
  infoFg: 'FF4A4038',
  font: 'Calibri',
};

export const NUM = {
  currency: `#,##0.00 "${CURRENCY_CODE}"`,
  integer: '#,##0',
  decimal: '#,##0.00',
  percent: '0.0%',
  date: 'dd mmm yyyy',
  datetime: 'dd mmm yyyy hh:mm',
};

const POSITIVE_STATUS = new Set([
  'confirmed', 'completed', 'paid', 'available', 'vip', 'regular', 'final', 'signed',
]);
const WARNING_STATUS = new Set([
  'pending', 'scheduled', 'draft', 'in_progress', 'ready_for_pickup', 'new',
]);
const DANGER_STATUS = new Set([
  'cancelled', 'failed', 'refunded', 'blacklisted', 'unavailable',
]);
const INFO_STATUS = new Set(['active', 'booked', 'maintenance', 'walk_in', 'online', 'whatsapp']);

const TZ_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: AGENCY_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const part = (parts, type) => Number(parts.find((p) => p.type === type)?.value || 0);

export const toExcelDate = (value, { time = false } = {}) => {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const parts = TZ_FMT.formatToParts(d);
  const y = part(parts, 'year');
  const m = part(parts, 'month');
  const day = part(parts, 'day');
  if (!time) return new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  const h = part(parts, 'hour');
  const min = part(parts, 'minute');
  return new Date(Date.UTC(y, m - 1, day, h, min, 0));
};

export const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const rentalDays = (booking) => {
  const days = calcRentalDays(booking?.pickupDate, booking?.returnDate);
  if (days > 0) return days;
  const fromBreakdown = Number(booking?.priceBreakdown?.days);
  return fromBreakdown > 0 ? fromBreakdown : 0;
};

export const vehicleLabel = (car) => {
  if (!car) return '';
  return `${car.brand || ''} ${car.model || ''}`.trim();
};

export const resolveAgencyName = (user) => {
  const name = String(user?.agencyName || '').trim();
  return name || defaultAgencyName();
};

export const resolveLang = (req) => {
  if (req?.query?.lang) return normalizeLang(req.query.lang);
  const header = String(req?.headers?.['accept-language'] || '');
  return normalizeLang(header);
};

export const formatPeriodLabel = (from, to, lang) => {
  const start = toExcelDate(from);
  const end = toExcelDate(to);
  if (!start && !end) return t(lang, 'meta.allTime');
  const fmt = (d) => {
    if (!d) return '—';
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = monthName(lang, d.getUTCMonth());
    return `${day} ${month} ${d.getUTCFullYear()}`;
  };
  if (start && end) return `${fmt(start)} ${t(lang, 'meta.to')} ${fmt(end)}`;
  return fmt(start || end);
};

export const periodFilenamePart = (from, to, lang) => {
  const start = toExcelDate(from);
  const end = toExcelDate(to);
  const yyyymm = (d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  if (lang === 'ar') {
    if (!start && !end) return yyyymm(toExcelDate(new Date()));
    if (start && end && yyyymm(start) === yyyymm(end)) return yyyymm(start);
    if (start && end) return `${yyyymm(start)}_to_${yyyymm(end)}`;
    return yyyymm(start || end);
  }
  if (!start && !end) {
    const now = toExcelDate(new Date());
    return `${monthName(lang, now.getUTCMonth())}_${now.getUTCFullYear()}`.replace(/\s+/g, '_');
  }
  if (start && end && yyyymm(start) === yyyymm(end)) {
    return `${monthName(lang, start.getUTCMonth())}_${start.getUTCFullYear()}`.replace(/\s+/g, '_');
  }
  const iso = (d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  if (start && end) return `${iso(start)}_to_${iso(end)}`;
  return iso(start || end);
};

const asciiSafe = (value, fallback = 'Report') => {
  const cleaned = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return cleaned || fallback;
};

export const buildFilename = ({ agencyName, reportKey, from, to, lang }) => {
  const agency = asciiSafe(agencyName, 'Agency');
  const report = asciiSafe(t(lang, `filename.${reportKey}`, reportKey), 'Report');
  const period = asciiSafe(periodFilenamePart(from, to, lang), 'Export');
  return `${agency}_${report}_${period}.xlsx`;
};

export const contentDisposition = (filename) => {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
};

export const createWorkbook = ({ agencyName, lang, title }) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = agencyName;
  wb.lastModifiedBy = agencyName;
  wb.created = new Date();
  wb.modified = new Date();
  wb.company = agencyName;
  wb.title = `${agencyName} — ${title}`;
  wb.description = title;
  wb.calcProperties.fullCalcOnLoad = true;
  wb._hdn = { agencyName, lang, title };
  return wb;
};

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thinBorder = {
  top: { style: 'thin', color: { argb: DESIGN.line } },
  left: { style: 'thin', color: { argb: DESIGN.line } },
  bottom: { style: 'thin', color: { argb: DESIGN.line } },
  right: { style: 'thin', color: { argb: DESIGN.line } },
};

const applyPrint = (ws, { landscape = true, freezeAt = 1, rtl = false, titleRows = '1:1' } = {}) => {
  ws.pageSetup = {
    paperSize: 9,
    orientation: landscape ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalDpi: 200,
    verticalDpi: 200,
    margins: { left: 0.45, right: 0.45, top: 0.55, bottom: 0.55, header: 0.25, footer: 0.25 },
    printTitlesRow: titleRows,
    blackAndWhite: false,
  };
  ws.headerFooter = {
    oddHeader: `&L&"Calibri,Bold"&8${ws.workbook?._hdn?.agencyName || ''}&R&8&D`,
    oddFooter: '&L&8&A&R&8&P / &N',
  };
  ws.views = [{
    state: 'frozen',
    xSplit: 0,
    ySplit: freezeAt,
    topLeftCell: `A${freezeAt + 1}`,
    activeCell: `A${freezeAt + 1}`,
    showGridLines: false,
    rightToLeft: rtl,
  }];
};

const styleRange = (ws, row, from, to, styles = {}) => {
  for (let c = from; c <= to; c += 1) {
    const cell = ws.getRow(row).getCell(c);
    if (styles.font) cell.font = { ...cell.font, ...styles.font };
    if (styles.fill) cell.fill = styles.fill;
    if (styles.alignment) cell.alignment = { ...cell.alignment, ...styles.alignment };
    if (styles.border) cell.border = styles.border;
  }
};

export const writeBrandHeader = (ws, {
  agencyName,
  title,
  periodLabel,
  generatedAt,
  lang,
  extra = [],
  lastCol = 8,
}) => {
  const rtl = lang === 'ar';
  ws.getRow(1).height = 28;
  ws.mergeCells(1, 1, 1, lastCol);
  const brand = ws.getCell(1, 1);
  brand.value = String(agencyName || '').toUpperCase();
  brand.font = { name: DESIGN.font, size: 16, bold: true, color: { argb: DESIGN.ivory } };
  brand.alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left', indent: 1 };
  styleRange(ws, 1, 1, lastCol, { fill: fill(DESIGN.burgundy) });

  ws.getRow(2).height = 22;
  ws.mergeCells(2, 1, 2, lastCol);
  const titleCell = ws.getCell(2, 1);
  titleCell.value = title;
  titleCell.font = { name: DESIGN.font, size: 13, bold: true, color: { argb: DESIGN.ink } };
  titleCell.alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left', indent: 1 };
  styleRange(ws, 2, 1, lastCol, { fill: fill(DESIGN.sand) });

  ws.getRow(3).height = 18;
  ws.mergeCells(3, 1, 3, lastCol);
  ws.getCell(3, 1).value = `${t(lang, 'meta.period')}:  ${periodLabel}`;
  ws.getCell(3, 1).font = { name: DESIGN.font, size: 10, bold: true, color: { argb: DESIGN.ink } };
  ws.getCell(3, 1).alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left', indent: 1 };

  ws.getRow(4).height = 18;
  ws.mergeCells(4, 1, 4, lastCol);
  const generated = toExcelDate(generatedAt || new Date(), { time: true });
  const generatedLabel = generated
    ? `${String(generated.getUTCDate()).padStart(2, '0')} ${monthName(lang, generated.getUTCMonth())} ${generated.getUTCFullYear()}  ${String(generated.getUTCHours()).padStart(2, '0')}:${String(generated.getUTCMinutes()).padStart(2, '0')}`
    : '';
  ws.getCell(4, 1).value = `${t(lang, 'meta.generated')}:  ${generatedLabel}`;
  ws.getCell(4, 1).font = { name: DESIGN.font, size: 10, color: { argb: DESIGN.muted } };
  ws.getCell(4, 1).alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left', indent: 1 };

  extra.forEach((line, idx) => {
    const row = 5 + idx;
    ws.mergeCells(row, 1, row, lastCol);
    ws.getCell(row, 1).value = line;
    ws.getCell(row, 1).font = { name: DESIGN.font, size: 9, color: { argb: DESIGN.muted } };
    ws.getCell(row, 1).alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left', indent: 1 };
  });

  return 5 + extra.length;
};

const kpiTone = (type) => {
  if (type === 'currency' || type === 'positive') return { bg: DESIGN.sand, fg: DESIGN.burgundy };
  if (type === 'danger') return { bg: DESIGN.dangerBg, fg: DESIGN.dangerFg };
  if (type === 'warning') return { bg: DESIGN.warningBg, fg: DESIGN.warningFg };
  return { bg: DESIGN.ivory, fg: DESIGN.ink };
};

export const writeKpiRow = (ws, startRow, kpis = [], { lang = 'en' } = {}) => {
  const rtl = lang === 'ar';
  const count = Math.min(kpis.length, 5);
  if (!count) return startRow;
  for (let i = 0; i < count; i += 1) {
    const kpi = kpis[i];
    const c1 = i * 2 + 1;
    const c2 = c1 + 1;
    const tone = kpiTone(kpi.tone || kpi.type);
    ws.mergeCells(startRow, c1, startRow, c2);
    ws.mergeCells(startRow + 1, c1, startRow + 2, c2);
    const label = ws.getCell(startRow, c1);
    label.value = kpi.label;
    label.font = { name: DESIGN.font, size: 8, bold: true, color: { argb: DESIGN.muted } };
    label.alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left', indent: 1 };
    const value = ws.getCell(startRow + 1, c1);
    value.value = kpi.value == null ? 0 : kpi.value;
    if (kpi.type === 'currency') value.numFmt = NUM.currency;
    else if (kpi.type === 'integer') value.numFmt = NUM.integer;
    else if (kpi.type === 'percent') value.numFmt = NUM.percent;
    value.font = { name: DESIGN.font, size: 16, bold: true, color: { argb: tone.fg } };
    value.alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left', indent: 1 };
    for (let r = startRow; r <= startRow + 2; r += 1) {
      styleRange(ws, r, c1, c2, { fill: fill(tone.bg), border: thinBorder });
    }
  }
  ws.getRow(startRow).height = 16;
  ws.getRow(startRow + 1).height = 18;
  ws.getRow(startRow + 2).height = 18;
  return startRow + 4;
};

const colNumFmt = (type) => {
  if (type === 'currency') return NUM.currency;
  if (type === 'integer') return NUM.integer;
  if (type === 'number' || type === 'decimal') return NUM.decimal;
  if (type === 'percent') return NUM.percent;
  if (type === 'date') return NUM.date;
  if (type === 'datetime') return NUM.datetime;
  return undefined;
};

const normalizeCell = (value, type) => {
  if (value == null || value === '') return type === 'text' || type === 'status' ? '' : null;
  if (type === 'date') return toExcelDate(value);
  if (type === 'datetime') return toExcelDate(value, { time: true });
  if (type === 'currency' || type === 'number' || type === 'decimal') return money(value);
  if (type === 'integer') return Number(value) || 0;
  if (type === 'percent') return Number(value) || 0;
  return value;
};

const estimateWidth = (columns, rows) => columns.map((col, idx) => {
  let width = String(col.header || '').length + 3;
  const sample = rows.slice(0, 250);
  for (const row of sample) {
    const raw = row[idx];
    let len = 8;
    if (raw instanceof Date) len = col.type === 'datetime' ? 18 : 13;
    else if (typeof raw === 'number') len = col.type === 'currency' ? 16 : 10;
    else len = String(raw ?? '').length;
    if (len > width) width = len;
  }
  const max = col.maxWidth || (col.type === 'text' ? 36 : 22);
  const min = col.minWidth || (col.type === 'date' || col.type === 'datetime' ? 14 : 11);
  return Math.min(max, Math.max(min, width + 1));
});

const addStatusFormatting = (ws, ref, lang, keys = []) => {
  if (!ref || !keys.length) return;
  keys.forEach((key) => {
    const text = labelStatus(lang, key);
    if (!text) return;
    let bg = DESIGN.infoBg;
    let fg = DESIGN.infoFg;
    if (POSITIVE_STATUS.has(key)) {
      bg = DESIGN.positiveBg;
      fg = DESIGN.positiveFg;
    } else if (WARNING_STATUS.has(key)) {
      bg = DESIGN.warningBg;
      fg = DESIGN.warningFg;
    } else if (DANGER_STATUS.has(key)) {
      bg = DESIGN.dangerBg;
      fg = DESIGN.dangerFg;
    } else if (!INFO_STATUS.has(key)) {
      return;
    }
    ws.addConditionalFormatting({
      ref,
      rules: [{
        type: 'containsText',
        operator: 'containsText',
        text,
        style: {
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: bg } },
          font: { color: { argb: fg }, bold: true, name: DESIGN.font, size: 10 },
        },
      }],
    });
  });
};

let tableSeq = 1;

export const writeDataTable = (ws, {
  startRow = 1,
  columns,
  rows,
  lang,
  tableName,
  totals = false,
  statusKeys = [
    'pending', 'confirmed', 'ready_for_pickup', 'active', 'completed', 'cancelled',
    'paid', 'failed', 'refunded', 'available', 'maintenance', 'booked', 'vip', 'blacklisted',
    'scheduled', 'in_progress', 'new', 'regular',
  ],
}) => {
  const headerRow = startRow;
  const rtl = lang === 'ar';
  const safeRows = Array.isArray(rows) ? rows.slice(0, EXPORT_ROW_CAP) : [];
  const widths = estimateWidth(columns, safeRows);

  columns.forEach((col, idx) => {
    const cell = ws.getRow(headerRow).getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: DESIGN.font, size: 10, bold: true, color: { argb: DESIGN.ivory } };
    cell.fill = fill(DESIGN.burgundy);
    cell.alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left', wrapText: true };
    cell.border = thinBorder;
    ws.getColumn(idx + 1).width = widths[idx];
    const fmt = colNumFmt(col.type);
    if (fmt) ws.getColumn(idx + 1).numFmt = fmt;
  });
  ws.getRow(headerRow).height = 22;

  if (!safeRows.length) {
    ws.getRow(headerRow + 1).getCell(1).value = t(lang, 'meta.empty');
    ws.getRow(headerRow + 1).getCell(1).font = {
      name: DESIGN.font, size: 10, italic: true, color: { argb: DESIGN.muted },
    };
    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: headerRow, column: columns.length },
    };
    return headerRow;
  }

  const values = safeRows.map((row) =>
    columns.map((col, idx) => normalizeCell(row[idx], col.type || 'text')),
  );

  const name = `${(tableName || 'DataTable').replace(/[^A-Za-z0-9]/g, '')}${tableSeq}`.slice(0, 200);
  tableSeq += 1;
  const lastDataRow = headerRow + values.length;
  const hasTotals = totals && columns.some((c) => c.type === 'currency' || c.type === 'integer' || c.type === 'number');

  ws.addTable({
    name: name || `T${tableSeq}`,
    ref: `A${headerRow}`,
    headerRow: true,
    totalsRow: Boolean(hasTotals),
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
      showFirstColumn: false,
    },
    columns: columns.map((col) => ({
      name: col.header,
      filterButton: true,
      totalsRowFunction: hasTotals && (col.type === 'currency' || col.type === 'integer' || col.type === 'number')
        ? 'sum'
        : 'none',
    })),
    rows: values,
  });

  columns.forEach((col, idx) => {
    const fmt = colNumFmt(col.type);
    const letterEnd = lastDataRow + (hasTotals ? 1 : 0);
    for (let r = headerRow + 1; r <= letterEnd; r += 1) {
      const cell = ws.getRow(r).getCell(idx + 1);
      if (fmt) cell.numFmt = fmt;
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.type === 'text' || col.type === 'status' ? (rtl ? 'right' : 'left') : (rtl ? 'left' : 'right'),
      };
      cell.font = { name: DESIGN.font, size: 10, color: { argb: DESIGN.ink } };
    }
    if (col.type === 'status' || col.status) {
      const colLetter = ws.getColumn(idx + 1).letter;
      addStatusFormatting(ws, `${colLetter}${headerRow + 1}:${colLetter}${lastDataRow}`, lang, statusKeys);
    }
  });

  return lastDataRow + (hasTotals ? 1 : 0);
};

export const addWorksheet = (wb, name) => {
  const safe = String(name || 'Sheet').replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sheet';
  const existing = new Set(wb.worksheets.map((s) => s.name));
  let finalName = safe;
  let i = 2;
  while (existing.has(finalName)) {
    finalName = `${safe.slice(0, 28)}_${i}`;
    i += 1;
  }
  const ws = wb.addWorksheet(finalName, {
    properties: { tabColor: { argb: DESIGN.burgundy } },
    views: [{ showGridLines: false }],
  });
  ws.properties.defaultRowHeight = 18;
  return ws;
};

export const writeSummarySheet = (wb, {
  title,
  agencyName,
  lang,
  periodLabel,
  generatedAt,
  kpis = [],
  breakdown = null,
  extraLines = [],
}) => {
  const ws = addWorksheet(wb, t(lang, 'sheets.summary'));
  const lastCol = Math.max(8, (kpis.length || 4) * 2);
  const headerEnd = writeBrandHeader(ws, {
    agencyName,
    title,
    periodLabel,
    generatedAt,
    lang,
    extra: extraLines,
    lastCol,
  });
  const afterKpis = writeKpiRow(ws, headerEnd + 1, kpis, { lang });

  if (breakdown?.columns && breakdown?.rows) {
    ws.getRow(afterKpis).getCell(1).value = breakdown.title || t(lang, 'sheets.byStatus');
    ws.getRow(afterKpis).getCell(1).font = { name: DESIGN.font, size: 11, bold: true, color: { argb: DESIGN.ink } };
    writeDataTable(ws, {
      startRow: afterKpis + 1,
      columns: breakdown.columns,
      rows: breakdown.rows,
      lang,
      tableName: 'SummaryBreakdown',
      totals: true,
    });
  }

  applyPrint(ws, { landscape: true, freezeAt: 1, rtl: lang === 'ar', titleRows: '1:4' });
  return ws;
};

export const writeTableSheet = (wb, {
  sheetName,
  title,
  agencyName,
  lang,
  periodLabel,
  generatedAt,
  columns,
  rows,
  totals = true,
  tableName,
  extraLines = [],
}) => {
  const ws = addWorksheet(wb, sheetName);
  const lastCol = Math.max(columns.length, 6);
  const headerEnd = writeBrandHeader(ws, {
    agencyName,
    title,
    periodLabel,
    generatedAt,
    lang,
    extra: extraLines,
    lastCol,
  });
  const tableStart = headerEnd + 1;
  writeDataTable(ws, {
    startRow: tableStart,
    columns,
    rows,
    lang,
    tableName,
    totals,
  });
  applyPrint(ws, {
    landscape: true,
    freezeAt: tableStart,
    rtl: lang === 'ar',
    titleRows: `${tableStart}:${tableStart}`,
  });
  return ws;
};

export const sendWorkbook = async (res, workbook, filename) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', contentDisposition(filename));
  res.setHeader('Cache-Control', 'no-store');
  await workbook.xlsx.write(res);
  res.end();
};

export const inferDateRange = (items, fields = ['pickupDate', 'createdAt']) => {
  let min = null;
  let max = null;
  for (const item of items || []) {
    for (const field of fields) {
      const d = item?.[field] ? new Date(item[field]) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      if (!min || d < min) min = d;
      if (!max || d > max) max = d;
    }
  }
  return { from: min, to: max };
};

export const REVENUE_STATUSES = ['confirmed', 'ready_for_pickup', 'active', 'completed'];
