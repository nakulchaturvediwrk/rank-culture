/**
 * Rank Culture — automatic Google Drive backup of player data.
 *
 * What it does
 *  - Every hour it asks the database how many people have signed up. Each time that number passes the next multiple
 *    of 50 (50, 100, 150 …) it takes a full backup. It also takes one every Sunday at 3 AM, so changes to existing
 *    players are captured even in slow weeks.
 *  - Each backup is a NEW Google Sheet (one tab per table) plus an .xlsx copy, in the Drive folder "Rank Culture backups".
 *    Nothing is ever overwritten or deleted. After writing, it re-counts every tab against the data it received; only a
 *    backup that matches is named normally. Both files are then locked read-only in Drive.
 *  - Every run is recorded in the "Rank Culture backup log" sheet. If a backup fails you get an email, and the
 *    half-written file is renamed "FAILED — …" (kept, never deleted).
 *
 * Setup (once): see ops/backup/README.md. Run setup(), give Claude the hash it prints, then run backupNow() once.
 */

const CFG = {
  url: 'https://vxzbiytdjcyaqupgxjzx.supabase.co',
  apikey: 'sb_publishable_JKmm-b6Iz0bvOpxP23wVOg_POF2ECrn', // public key; the backup token below is what grants access
  every: 50,
  folderName: 'Rank Culture backups',
  logName: 'Rank Culture backup log',
  tabs: ['users', 'ratings', 'tournament_entries', 'registrations', 'applications', 'skill_stats', 'arena_ratings',
         'paths', 'path_attempts', 'contact_messages', 'feedback'],
};

/** Run once. Creates the secret token, the Drive folder and the two timers; logs the token's hash to give Claude. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty('BACKUP_TOKEN');
  if (!token) {
    token = (Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty('BACKUP_TOKEN', token);
  }
  folder_();
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkAndBackup').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('weeklyBackup').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).create();
  const hash = sha256Hex_(token);
  Logger.log('Setup done. Give Claude this hash (it is NOT the secret, it is safe to share):\n' + hash);
  return hash;
}

/** Hourly: back up when sign-ups have grown by CFG.every since the last backup. */
function checkAndBackup() {
  const status = rpc_('backup_status');
  const last = Number(PropertiesService.getScriptProperties().getProperty('LAST_BACKUP_SIGNUPS') || '-1');
  if (last < 0 || nextMilestone_(last) <= status.signups) backup_('reached ' + status.signups + ' sign-ups');
}

/** Sunday 3 AM: a backup regardless of sign-ups. */
function weeklyBackup() { backup_('weekly'); }

/** Run by hand any time you want a backup now. */
function backupNow() { backup_('manual'); }

// ------------------------------------------------------------------------------------------------ internals

function nextMilestone_(last) { return (Math.floor(last / CFG.every) + 1) * CFG.every; }

function backup_(reason) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) { Logger.log('Another backup is running; skipped.'); return; }
  let ss = null, xlsx = null, name = '';
  try {
    const snap = rpc_('backup_snapshot');
    const stamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HHmm');
    name = 'Rank Culture backup ' + stamp + ' IST — ' + snap.signups + ' users';
    const folder = folder_();

    ss = SpreadsheetApp.create('INCOMPLETE — ' + name);
    DriveApp.getFileById(ss.getId()).moveTo(folder);

    const counts = {};
    const summary = ss.getSheets()[0].setName('summary');
    CFG.tabs.forEach(tab => {
      const rows = (snap.tables && snap.tables[tab]) || [];
      counts[tab] = rows.length;
      writeTab_(ss.insertSheet(tab), rows);
    });
    const sumRows = [['Backup of', 'Rank Culture player data'], ['Taken at (IST)', stamp], ['Database time', String(snap.generated_at)],
                     ['Reason', reason], ['Sign-ups', String(snap.signups)]].concat(CFG.tabs.map(t => [t + ' rows', String(counts[t])]));
    summary.getRange(1, 1, sumRows.length, 2).setNumberFormat('@').setValues(sumRows);
    SpreadsheetApp.flush();

    // Verify: every tab holds exactly the rows received, and the users tab matches the sign-up count.
    CFG.tabs.forEach(tab => {
      const sh = ss.getSheetByName(tab), want = counts[tab];
      const got = want === 0 ? 0 : sh.getLastRow() - 1;
      if (got !== want) throw new Error('verification failed on tab "' + tab + '": wrote ' + got + ' rows, expected ' + want);
    });
    if (counts.users !== Number(snap.signups)) throw new Error('verification failed: users tab has ' + counts.users + ' rows but there are ' + snap.signups + ' sign-ups');

    ss.rename(name);
    xlsx = exportXlsx_(ss.getId(), name, folder);
    let note = '';
    try { lockReadOnly_(ss.getId()); lockReadOnly_(xlsx.getId()); } catch (e) { note = 'saved and verified, but not locked: ' + e.message; }

    PropertiesService.getScriptProperties().setProperty('LAST_BACKUP_SIGNUPS', String(snap.signups));
    log_([stamp, reason, 'OK', snap.signups].concat(CFG.tabs.map(t => counts[t])).concat([ss.getUrl(), xlsx.getUrl(), note]));
  } catch (e) {
    if (ss) { try { ss.rename('FAILED — ' + (name || 'Rank Culture backup')); } catch (ignore) {} }
    log_([Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HHmm'), reason, 'FAILED', ''].concat(CFG.tabs.map(() => ''))
           .concat([ss ? ss.getUrl() : '', xlsx ? xlsx.getUrl() : '', String(e && e.message || e)]));
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Rank Culture backup FAILED',
      'The automatic backup failed: ' + (e && e.message || e) + '\n\nNothing was deleted. Open the "' + CFG.logName +
      '" sheet in Drive for details, or run backupNow() in the Apps Script project to try again.');
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function writeTab_(sheet, rows) {
  if (!rows.length) { sheet.getRange(1, 1).setValue('(no rows)'); return; }
  const headers = [];
  rows.forEach(r => Object.keys(r).forEach(k => { if (headers.indexOf(k) < 0) headers.push(k); }));
  const values = rows.map(r => headers.map(h => cell_(r[h])));
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  const CHUNK = 5000;
  for (let i = 0; i < values.length; i += CHUNK) {
    const part = values.slice(i, i + CHUNK);
    // Plain-text format first, so Sheets never re-interprets a value as a date, number or formula.
    sheet.getRange(2 + i, 1, part.length, headers.length).setNumberFormat('@').setValues(part);
  }
  sheet.setFrozenRows(1);
}

/** One cell: text only, formula-safe, within Sheets' 50,000-character cell limit. */
function cell_(v) {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // a player can't plant a formula that runs when you open the backup
  if (s.length > 49000) s = s.slice(0, 49000) + ' …[truncated]';
  return s;
}

function rpc_(fn) {
  const token = PropertiesService.getScriptProperties().getProperty('BACKUP_TOKEN');
  if (!token) throw new Error('run setup() first');
  const res = UrlFetchApp.fetch(CFG.url + '/rest/v1/rpc/' + fn, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { apikey: CFG.apikey }, payload: JSON.stringify({ p_token: token }),
  });
  const code = res.getResponseCode(), body = res.getContentText();
  if (code !== 200) throw new Error(fn + ' returned HTTP ' + code + ': ' + body.slice(0, 300));
  const data = JSON.parse(body);
  if (!data || typeof data !== 'object') throw new Error(fn + ' returned an unexpected response');
  return data;
}

function exportXlsx_(id, name, folder) {
  const res = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('Excel export failed: HTTP ' + res.getResponseCode());
  const blob = res.getBlob().setName(name + '.xlsx');
  if (blob.getBytes().length < 1000) throw new Error('Excel export looks empty');
  return folder.createFile(blob);
}

/** Drive "Lock" (content restriction): the file can't be edited until someone deliberately unlocks it. */
function lockReadOnly_(id) {
  const res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '?fields=contentRestrictions', {
    method: 'patch', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ contentRestrictions: [{ readOnly: true, reason: 'Rank Culture backup — do not edit' }] }),
  });
  if (res.getResponseCode() !== 200) throw new Error('could not lock backup file: HTTP ' + res.getResponseCode());
}

function folder_() {
  const it = DriveApp.getFoldersByName(CFG.folderName);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CFG.folderName);
}

function log_(row) {
  const folder = folder_();
  const it = folder.getFilesByName(CFG.logName);
  let ss;
  if (it.hasNext()) ss = SpreadsheetApp.open(it.next());
  else {
    ss = SpreadsheetApp.create(CFG.logName);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    ss.getSheets()[0].appendRow(['Taken at (IST)', 'Reason', 'Status', 'Sign-ups'].concat(CFG.tabs).concat(['Sheet', 'Excel file', 'Error']));
    ss.getSheets()[0].setFrozenRows(1);
  }
  ss.getSheets()[0].appendRow(row.map(v => typeof v === 'string' ? cell_(v) : v));
}

function sha256Hex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}
