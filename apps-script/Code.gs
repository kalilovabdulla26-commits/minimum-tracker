/**
 * Минимум трекер ↔ «Минимум — жооптор» таблицасы
 *
 * Тиркеме ушул скрипт аркылуу «Жооптор» барагына жазат жана окуйт.
 * Форманын жооптору да, тиркеменин жооптору да бир баракта — «Жумалык»
 * жана «Рейтинг» барактары мурункудай өзү эсептейт.
 *
 *  Жооптор:  A Timestamp · B Атыңыз · C Үйүңүз · D Күнү · E..T 16 сан (форма менен бирдей)
 *            U app_key («Аты|Үй_2026-11-24») · V app_json (тиркеме үчүн так маанилер)
 *  Колдонуучулар: ар бир адамдын сырсөзү (хэш). Сырсөздү унутса —
 *            ошол адамдын сабын өчүрүңүз, ал кайра жаңы сырсөз коёт.
 *
 * Орнотуу: Extensions → Apps Script → ушул кодду коюу →
 *          Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
 */

const SHEET = 'Жооптор';
const USERS = 'Колдонуучулар';
const KEY_COL = 21;   // U
const JSON_COL = 22;  // V
const FIELDS = ['kk','jvsh','rus','prt','thj','orz','kino','mzk','avb','kn','adb','jto','sbk','z_istg','z_slv','z_tsb'];
const DAYS_BACK = 75; // акыркы ~10 жума
const MAX_FAILS = 8, LOCK_MIN = 15;

/* ---------------- окуу ---------------- */
function doGet(e) {
  try {
    const sh = sheet_();
    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
    const rows = [];
    const last = sh.getLastRow();
    if (last >= 2) {
      const data = sh.getRange(2, 1, last - 1, JSON_COL).getValues();
      const since = new Date(Date.now() - DAYS_BACK * 864e5);
      for (const r of data) {
        const name = String(r[1] || '').trim();
        const d = r[3];
        if (!name || !(d instanceof Date) || d < since) continue;
        const row = { n: name, h: String(r[2] || '').trim(), d: Utilities.formatDate(d, tz, 'yyyy-MM-dd'), v: r.slice(4, 20).map(num_) };
        if (r[KEY_COL - 1]) {
          row.k = String(r[KEY_COL - 1]);
          try { row.j = JSON.parse(r[JSON_COL - 1] || '{}'); } catch (err) {}
        }
        rows.push(row);
      }
    }
    const users = userRows_().filter(u => u.v[3]).map(u => ({ id: String(u.v[0]), n: String(u.v[1]), h: String(u.v[2]) }));
    return json_({ ok: true, rows: rows, users: users, tz: tz });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ---------------- жазуу ---------------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'register') return json_(register_(body));
    if (body.action === 'login') return json_(login_(body));
    if (body.action === 'rehouse') return json_(rehouse_(body));
    return json_(save_(body));
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function save_(body) {
  const a = body.auth || {};
  const u = auth_(a.id, a.token);
  if (!u) return { ok: false, error: 'auth' };
  const id = String(u.v[0]), name = String(u.v[1]), house = String(u.v[2]);
  const sh = sheet_();
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  ensureHeaders_(sh);
  const saved = [];
  for (const it of (Array.isArray(body.items) ? body.items : [])) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date || '')) continue;
    const key = id + '_' + it.date;           // ар ким өзүнүн гана сабын өзгөртө алат
    const vals = it.values || {};
    const nums = FIELDS.map(f => { const x = Number(vals[f]) || 0; return x > 0 ? x : ''; });
    const row = [new Date(), name, house, Utilities.parseDate(it.date, tz, 'yyyy-MM-dd')].concat(nums, [key, JSON.stringify(vals)]);
    const r = findKeyRow_(sh, key);
    if (r) sh.getRange(r, 1, 1, JSON_COL).setValues([row]);
    else sh.appendRow(row);
    saved.push(key);
  }
  return { ok: true, saved: saved };
}

/* ---------------- колдонуучулар ---------------- */
// A id · B Аты · C Үй · D hash · E salt · F Катталды · G fails · H lock
function users_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(USERS);
  if (!sh) {
    sh = ss.insertSheet(USERS);
    sh.getRange(1, 1, 1, 8).setValues([['id', 'Аты', 'Үй', 'hash', 'salt', 'Катталды', 'fails', 'lock']]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A1').setNote('Сырсөздү унутса — ошол адамдын сабын толук өчүрүңүз. Ал тиркемеден кайра жаңы сырсөз коёт.');
  }
  return sh;
}
function userRows_() {
  const sh = users_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 8).getValues().map((v, i) => ({ row: i + 2, v: v })).filter(u => u.v[0]);
}
function findUser_(id) { return userRows_().find(u => String(u.v[0]) === String(id)) || null; }
function hash_(s) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
function token_(u) { return hash_('tok:' + u.v[3] + ':' + u.v[4]); }
function auth_(id, token) {
  if (!id || !token) return null;
  const u = findUser_(id);
  return u && u.v[3] && token_(u) === token ? u : null;
}

function register_(b) {
  const name = String(b.name || '').trim().slice(0, 40), house = String(b.house || '').trim().slice(0, 40);
  const pass = String(b.pass || '');
  if (!name || !house) return { ok: false, error: 'name' };
  if (pass.length < 4) return { ok: false, error: 'short' };
  const id = name + '|' + house;
  const sh = users_();
  const u = findUser_(id);
  if (u && u.v[3]) return { ok: false, error: 'exists' };
  const salt = Utilities.getUuid();
  const v = [id, name, house, hash_(salt + ':' + pass), salt, new Date(), 0, ''];
  if (u) sh.getRange(u.row, 1, 1, 8).setValues([v]); else sh.appendRow(v);
  return { ok: true, id: id, token: token_({ v: v }) };
}

function login_(b) {
  const u = findUser_(b.id);
  if (!u || !u.v[3]) return { ok: false, error: 'nouser' };
  const sh = users_(), now = Date.now();
  const lockUntil = u.v[7] instanceof Date ? u.v[7].getTime() : 0;
  if (lockUntil > now) return { ok: false, error: 'locked', minutes: Math.ceil((lockUntil - now) / 60000) };
  if (hash_(u.v[4] + ':' + String(b.pass || '')) === u.v[3]) {
    sh.getRange(u.row, 7, 1, 2).setValues([[0, '']]);
    return { ok: true, id: String(u.v[0]), token: token_(u) };
  }
  const fails = (Number(u.v[6]) || 0) + 1;
  sh.getRange(u.row, 7, 1, 2).setValues([[fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? new Date(now + LOCK_MIN * 60000) : '']]);
  return { ok: false, error: fails >= MAX_FAILS ? 'locked' : 'wrong', minutes: LOCK_MIN };
}

function rehouse_(b) {
  const u = auth_(b.id, b.token);
  if (!u) return { ok: false, error: 'auth' };
  const house = String(b.house || '').trim().slice(0, 40);
  if (!house) return { ok: false, error: 'name' };
  const oldId = String(u.v[0]), name = String(u.v[1]), newId = name + '|' + house;
  if (newId === oldId) return { ok: true, id: oldId };
  const other = findUser_(newId);
  if (other && other.v[3]) return { ok: false, error: 'exists' };
  if (other) users_().deleteRow(other.row);
  const me = findUser_(oldId);
  users_().getRange(me.row, 1, 1, 3).setValues([[newId, name, house]]);
  // тиркеменин саптарын жаңы үйгө көчүрүү
  const sh = sheet_(), n = sh.getLastRow();
  if (n >= 2) {
    const keys = sh.getRange(2, KEY_COL, n - 1, 1).getValues();
    keys.forEach((k, i) => {
      const s = String(k[0] || '');
      if (s.indexOf(oldId + '_') === 0) {
        sh.getRange(i + 2, 3).setValue(house);
        sh.getRange(i + 2, KEY_COL).setValue(newId + s.slice(oldId.length));
      }
    });
  }
  return { ok: true, id: newId };
}

/* ---------------- жардамчылар ---------------- */
function sheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
  if (!sh) throw new Error('«' + SHEET + '» барагы табылган жок');
  return sh;
}
function findKeyRow_(sh, key) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const f = sh.getRange(2, KEY_COL, n - 1, 1).createTextFinder(key).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
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

/** Текшерүү: редактордон Run басыңыз */
function test() {
  const out = JSON.parse(doGet({ parameter: {} }).getContent());
  Logger.log(out.ok ? ('✅ ' + out.rows.length + ' сап, ' + out.users.length + ' колдонуучу') : ('❌ ' + out.error));
}
