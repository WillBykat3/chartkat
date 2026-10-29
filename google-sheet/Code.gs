/**
 * Course Chart Drill — Google Sheet backend.
 *
 * Paste this whole file into Extensions → Apps Script of an empty Google Sheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Put the web app URL into API_URL at the top of index.html.
 *
 * The sheet gets three tabs, created on first use:
 *   Users     one row per username
 *   Results   one row per finished quiz
 *   Progress  one row per unfinished quiz (per username and class)
 *
 * There are no passwords: anyone who types a username uses that account.
 */

const TABS = {
  Users: ["Username", "Key", "Created", "Last seen"],
  Results: ["Time", "Username", "Class", "Rows", "Mode", "Exact punctuation", "Blanks", "Correct", "First try", "Fixed after a miss", "Revealed", "Score %", "Seconds"],
  Progress: ["Key", "Class", "Updated", "State"]
};
// Columns kept as plain text, so Sheets never turns "007" into 7 or "1-3" into a date
const TEXT_COLS = { Users: "A:B", Results: "B:F", Progress: "A:D" };
const CLASSES = ["APUSH", "AP World"];

function doGet(e) { return handle_((e && e.parameter) || {}); }
function doPost(e) {
  let p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) {}
  return handle_(p);
}

function handle_(p) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    switch (p.action) {
      case "login": return out_(login_(p));
      case "result": return out_(result_(p));
      case "progress": return out_(progress_(p));
      case "history": return out_(history_(p));
      default: return out_({ ok: false, error: "Unknown action" });
    }
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function tab_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(TEXT_COLS[name]).setNumberFormat("@");
    sh.appendRow(TABS[name]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, TABS[name].length).setFontWeight("bold");
  }
  return sh;
}
function rows_(name) {
  const sh = tab_(name);
  const n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, TABS[name].length).getValues() : [];
}

// Usernames: 2–24 characters, starting with a letter or number. This also
// keeps anything that a spreadsheet would read as a formula out of the sheet.
function cleanName_(u) {
  u = String(u || "").trim().replace(/\s+/g, " ");
  if (!/^[A-Za-z0-9][A-Za-z0-9 _.\-]{1,23}$/.test(u)) {
    throw new Error("Usernames are 2–24 letters or numbers (spaces, dots, dashes and underscores are fine inside).");
  }
  return u;
}
const key_ = (u) => u.toLowerCase();
function cleanClass_(c) {
  if (CLASSES.indexOf(c) === -1) throw new Error("Unknown class");
  return c;
}
const num_ = (x) => { const n = Number(x); return isFinite(n) ? Math.max(0, Math.round(n)) : 0; };
const text_ = (x, max) => String(x == null ? "" : x).replace(/^[=+\-@]+/, "").slice(0, max || 60);

function findUser_(key) {
  const data = rows_("Users");
  for (let i = 0; i < data.length; i++) if (String(data[i][1]) === key) return { row: i + 2, name: String(data[i][0]) };
  return null;
}

function best_(key) {
  const best = {};
  rows_("Results").forEach((r) => {
    if (key_(String(r[1])) !== key) return;
    const c = r[2], s = Number(r[11]);
    if (best[c] === undefined || s > best[c]) best[c] = s;
  });
  return best;
}

function progressFor_(key) {
  const out = {};
  rows_("Progress").forEach((r) => {
    if (String(r[0]) !== key) return;
    try { out[r[1]] = { updated: r[2], state: JSON.parse(r[3]) }; } catch (err) {}
  });
  return out;
}

function login_(p) {
  const name = cleanName_(p.username);
  const key = key_(name);
  const now = new Date();
  let user = findUser_(key), created = false;
  if (user) {
    tab_("Users").getRange(user.row, 4).setValue(now);
  } else {
    tab_("Users").appendRow([name, key, now, now]);
    user = { name: name };
    created = true;
  }
  return { ok: true, username: user.name, created: created, best: best_(key), progress: progressFor_(key) };
}

function result_(p) {
  const user = findUser_(key_(cleanName_(p.username)));
  if (!user) throw new Error("No account with that username");
  const r = p.result || {};
  const blanks = num_(r.blanks), correct = Math.min(num_(r.correct), blanks);
  const cls = cleanClass_(r.course);
  const before = best_(key_(user.name))[cls];
  const score = blanks ? Math.round(correct / blanks * 100) : 0;
  tab_("Results").appendRow([
    new Date(), user.name, cls, text_(r.rows), r.mode === "row" ? "Row by row" : "Whole chart", r.exact ? "Yes" : "No",
    blanks, correct, num_(r.firstTry), num_(r.fixed), num_(r.revealed), score, num_(r.seconds)
  ]);
  clearProgress_(key_(user.name), cls);
  return { ok: true, score: score, first: before === undefined, newBest: before === undefined || score > before, best: best_(key_(user.name)) };
}

function clearProgress_(key, cls) {
  const sh = tab_("Progress");
  const data = rows_("Progress");
  for (let i = data.length - 1; i >= 0; i--) if (String(data[i][0]) === key && data[i][1] === cls) sh.deleteRow(i + 2);
}

function progress_(p) {
  const user = findUser_(key_(cleanName_(p.username)));
  if (!user) throw new Error("No account with that username");
  const key = key_(user.name), cls = cleanClass_(p.course);
  if (!p.state) { clearProgress_(key, cls); return { ok: true }; }
  const json = JSON.stringify(p.state);
  if (json.length > 45000) throw new Error("Progress is too large to save");
  const sh = tab_("Progress");
  const data = rows_("Progress");
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === key && data[i][1] === cls) {
      sh.getRange(i + 2, 3, 1, 2).setValues([[new Date(), json]]);
      return { ok: true };
    }
  }
  sh.appendRow([key, cls, new Date(), json]);
  return { ok: true };
}

function history_(p) {
  const key = key_(cleanName_(p.username));
  const list = rows_("Results")
    .filter((r) => key_(String(r[1])) === key)
    .map((r) => ({ time: r[0], course: r[2], rows: r[3], mode: r[4], score: r[11], correct: r[7], blanks: r[6], revealed: r[10], seconds: r[12] }));
  return { ok: true, results: list.slice(-20).reverse() };
}
