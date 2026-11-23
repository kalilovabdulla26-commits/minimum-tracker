/**
 * Минимум трекер ↔ «Минимум — жооптор» таблицасы
 *
 * Тиркеме ушул скрипт аркылуу «Жооптор» барагына жазат жана окуйт.
 * Форманын жооптору да, тиркеменин жооптору да бир баракта — «Жумалык»
 * жана «Рейтинг» барактары мурункудай өзү эсептейт.
 *
 *  A Timestamp · B Атыңыз · C Үйүңүз · D Күнү · E..T 16 сан (форма менен бирдей)
 *  U app_key (тиркеменин сабы: «Аты|Үй_2026-11-24») · V app_json (тиркеме үчүн так маанилер)
 *
 * Орнотуу: Extensions → Apps Script → ушул кодду коюу →
 *          Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
 */

const SHEET = 'Жооптор';
const KEY_COL = 21;   // U
const JSON_COL = 22;  // V
const FIELDS = ['kk','jvsh','rus','prt','thj','orz','kino','mzk','avb','kn','adb','jto','sbk','z_istg','z_slv','z_tsb'];
const DAYS_BACK = 75; // акыркы ~10 жума

function doGet(e) {
  try {
    const sh = sheet_();
    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
    const last = sh.getLastRow();
    if (last < 2) return json_({ ok: true, rows: [] });
    const data = sh.getRange(2, 1, last - 1, JSON_COL).getValues();
    const since = new Date(Date.now() - DAYS_BACK * 864e5);
    const rows = [];
    for (const r of data) {
      const name = String(r[1] || '').trim();
      const d = r[3];
      if (!name || !(d instanceof Date) || d < since) continue;
      const row = {
        n: name,
        h: String(r[2] || '').trim(),
        d: Utilities.formatDate(d, tz, 'yyyy-MM-dd'),
        v: r.slice(4, 20).map(num_)
      };
      if (r[KEY_COL - 1]) {
        row.k = String(r[KEY_COL - 1]);
        try { row.j = JSON.parse(r[JSON_COL - 1] || '{}'); } catch (err) {}
      }
      rows.push(row);
    }
    return json_({ ok: true, rows: rows, tz: tz });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse(e.postData.contents);
    const items = Array.isArray(body.items) ? body.items : [body];
    const sh = sheet_();
    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
    ensureHeaders_(sh);
    const saved = [];
    for (const it of items) {
      const name = String(it.name || '').trim().slice(0, 40);
      const house = String(it.house || '').trim().slice(0, 40);
      if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(it.date || '')) continue;
      const key = String(it.key || (name + '|' + house + '_' + it.date)).slice(0, 120);
      const vals = it.values || {};
      const nums = FIELDS.map(f => {
        const x = Number(vals[f]) || 0;
        return x > 0 ? x : '';
      });
      const row = [new Date(), name, house, Utilities.parseDate(it.date, tz, 'yyyy-MM-dd')]
        .concat(nums, [key, JSON.stringify(vals)]);
      const found = sh.getRange(2, KEY_COL, Math.max(1, sh.getLastRow() - 1), 1)
        .createTextFinder(key).matchEntireCell(true).findNext();
      if (found) sh.getRange(found.getRow(), 1, 1, JSON_COL).setValues([row]);
      else sh.appendRow(row);
      saved.push(key);
    }
    return json_({ ok: true, saved: saved });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function sheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
  if (!sh) throw new Error('«' + SHEET + '» барагы табылган жок');
  return sh;
}

function ensureHeaders_(sh) {
  if (sh.getMaxColumns() < JSON_COL) sh.insertColumnsAfter(sh.getMaxColumns(), JSON_COL - sh.getMaxColumns());
  const h = sh.getRange(1, KEY_COL, 1, 2).getValues()[0];
  if (h[0] !== 'app_key') sh.getRange(1, KEY_COL, 1, 2).setValues([['app_key', 'app_json']]).setFontColor('#999999');
}

function num_(x) {
  if (typeof x === 'number') return x;
  // Таблицадагы VALUE() сыяктуу: «4 сүрө», «Дуа» → 0
  const s = String(x).trim();
  const n = s === '' ? 0 : Number(s);
  return isNaN(n) ? 0 : n;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Текшерүү: редактордон Run басыңыз — акыркы саптардын саны чыгат */
function test() {
  const out = JSON.parse(doGet({ parameter: {} }).getContent());
  Logger.log(out.ok ? ('✅ ' + out.rows.length + ' сап окулду') : ('❌ ' + out.error));
}
