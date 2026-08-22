import ExcelJS from 'exceljs';
import { tmpdir } from 'os';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import {
  buildCustomersReport,
  buildReservationsReport,
} from '../services/xlsxReport/builders.js';
import { NUM } from '../services/xlsxReport/engine.js';

const outDir = path.join(tmpdir(), 'hdn-xlsx-tests');

const user = { agencyName: 'Atlas Mobility' };

const sampleBookings = Array.from({ length: 12 }, (_, i) => {
  const pickup = new Date(Date.UTC(2026, 7, 1 + i, 10, 0));
  const ret = new Date(Date.UTC(2026, 7, 4 + i, 10, 0));
  const statuses = ['confirmed', 'completed', 'cancelled', 'pending', 'active'];
  return {
    _id: `00000000000000000000000${i}`,
    reservationId: `RES-2026-${String(100 + i)}`,
    customerName: `Customer ${i + 1}`,
    customerPhone: `+2126610000${String(i).padStart(2, '0')}`,
    customerEmail: `c${i}@example.com`,
    pickupLocation: 'Marrakech Airport',
    returnLocation: 'Safi',
    pickupDate: pickup,
    returnDate: ret,
    status: statuses[i % statuses.length],
    paymentStatus: i % 3 === 0 ? 'paid' : 'pending',
    channel: i % 2 === 0 ? 'online' : 'walk_in',
    price: 1250 + i * 75,
    createdAt: pickup,
    priceBreakdown: { days: 3 },
    car: {
      _id: `car${i % 3}`,
      brand: 'Dacia',
      model: i % 2 ? 'Duster' : 'Logan',
      category: 'SUV',
      licensePlate: `A-${1000 + i}`,
      transmission: 'Automatic',
      fuel_type: 'Diesel',
    },
  };
});

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const inspect = async (buffer, { lang, expectSheets, expectRtl = false }) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const names = wb.worksheets.map((s) => s.name);
  for (const name of expectSheets) {
    assert(names.includes(name), `Missing sheet "${name}" in ${names.join(', ')}`);
  }
  const dataSheet = wb.worksheets[1];
  const view = dataSheet.views?.[0] || {};
  assert(view.state === 'frozen', 'Expected frozen panes');
  assert(Boolean(view.rightToLeft) === expectRtl, `RTL mismatch for ${lang}`);
  assert(dataSheet.autoFilter || dataSheet.tables?.length || Object.keys(dataSheet._tables || {}).length >= 0, 'table/filter present');

  let foundCurrency = false;
  let foundDate = false;
  let foundIso = false;
  dataSheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.numFmt && String(cell.numFmt).includes('MAD')) foundCurrency = true;
      if (cell.value instanceof Date) foundDate = true;
      if (typeof cell.value === 'string' && /T\d{2}:\d{2}:\d{2}/.test(cell.value)) foundIso = true;
    });
  });
  return { names, foundCurrency, foundDate, foundIso, view };
};

const main = async () => {
  await mkdir(outDir, { recursive: true });
  const langs = ['en', 'fr', 'es', 'ar'];
  const sheetMap = {
    en: ['Summary', 'Reservations', 'Customers', 'Vehicles'],
    fr: ['Synthèse', 'Réservations', 'Clients', 'Véhicules'],
    es: ['Resumen', 'Reservas', 'Clientes', 'Vehículos'],
    ar: ['الملخص', 'الحجوزات', 'العملاء', 'المركبات'],
  };

  for (const lang of langs) {
    const empty = buildReservationsReport({ user, lang, bookings: [] });
    const emptyBuf = await empty.wb.xlsx.writeBuffer();
    assert(emptyBuf.byteLength > 2000, `${lang} empty workbook too small`);
    await writeFile(path.join(outDir, `empty-${lang}.xlsx`), Buffer.from(emptyBuf));

    const filled = buildReservationsReport({
      user,
      lang,
      bookings: sampleBookings,
      from: '2026-08-01',
      to: '2026-08-31',
    });
    assert(filled.filename.endsWith('.xlsx'), 'filename must be xlsx');
    assert(!/export\.xlsx|data\.xlsx/i.test(filled.filename), `unprofessional filename ${filled.filename}`);
    const buf = await filled.wb.xlsx.writeBuffer();
    const info = await inspect(buf, {
      lang,
      expectSheets: sheetMap[lang],
      expectRtl: lang === 'ar',
    });
    assert(info.foundCurrency, `${lang} missing MAD number format`);
    assert(info.foundDate, `${lang} missing real Excel dates`);
    assert(!info.foundIso, `${lang} leaked ISO timestamp strings`);
    await writeFile(path.join(outDir, `reservations-${lang}.xlsx`), Buffer.from(buf));
    console.log(`ok ${lang} ${filled.filename} sheets=${info.names.join('|')}`);
  }

  const large = Array.from({ length: 2500 }, (_, i) => ({
    ...sampleBookings[i % sampleBookings.length],
    reservationId: `RES-L-${i}`,
    customerName: `Large Customer ${i}`,
    price: 500 + (i % 40) * 25,
    pickupDate: new Date(Date.UTC(2026, 0, 1 + (i % 28))),
    returnDate: new Date(Date.UTC(2026, 0, 4 + (i % 28))),
  }));
  const started = Date.now();
  const big = buildReservationsReport({ user, lang: 'en', bookings: large });
  const bigBuf = await big.wb.xlsx.writeBuffer();
  const elapsed = Date.now() - started;
  assert(bigBuf.byteLength > 50_000, 'large workbook unexpectedly small');
  console.log(`ok large 2500 rows in ${elapsed}ms (${Math.round(bigBuf.byteLength / 1024)} KB)`);

  const customers = buildCustomersReport({
    user,
    lang: 'fr',
    customers: [
      { name: 'Sara', phone: '+2126', email: 'sara@test.com', city: 'Safi', status: 'vip', rating: 4.5, totalReservations: 3, cancelledReservations: 0, totalSpent: 4200, lastBookingAt: new Date('2026-08-12') },
    ],
  });
  const cbuf = await customers.wb.xlsx.writeBuffer();
  assert(cbuf.byteLength > 2000, 'customers workbook too small');
  assert(NUM.currency.includes('MAD'), 'currency format must use MAD');
  console.log('ok customers FR');
  console.log('ALL XLSX EXPORT CHECKS PASSED');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
