/**
 * Towne · 3 months — the little backend
 *
 * A Google Sheet is the database. This script is the door: the site posts
 * rows in, and Danil's private portal reads them back out.
 *
 * SETUP (all in a browser, no terminal):
 *   1. Open sheets.new and name the sheet anything you like.
 *   2. Extensions -> Apps Script. Delete whatever is in the editor.
 *   3. Paste this whole file in.
 *   4. Change SECRET below to your own string.
 *   5. Deploy -> New deployment -> gear icon -> Web app.
 *        Execute as:      Me
 *        Who has access:  Anyone            <- required; her phone is not
 *                                              signed into your Google account
 *      Deploy, then Authorize access and allow it.
 *   6. Copy the Web app URL. It ends in /exec.
 *   7. In towne.html, set CONFIG.db.url to that URL and CONFIG.db.key to
 *      the same SECRET.
 *
 * If you ever change this script, you must Deploy -> Manage deployments ->
 * edit -> Version: New version, or the old code keeps running.
 */

var SECRET = 'CHANGE_ME_SECRET';   // must match CONFIG.db.key in towne.html
var TAB    = 'towne';

var HEADERS = ['time', 'visitor', 'type', 'text', 'mom', 'dad', 'note'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.insertSheet(TAB);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

/** The site sends rows here. Content-Type is text/plain so the browser
 *  treats it as a simple request and skips the CORS preflight, which
 *  Apps Script cannot answer. */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok: false, error: 'empty' });

    var body = JSON.parse(e.postData.contents);
    if (body.key !== SECRET) return json_({ ok: false, error: 'bad key' });

    var events = body.events || [];
    if (!events.length) return json_({ ok: true, added: 0 });

    var visitor = String(body.visitor || '').slice(0, 40);
    var rows = events.slice(0, 200).map(function (ev) {
      return [
        new Date(Number(ev.t) || Date.now()),
        visitor,
        String(ev.type || '').slice(0, 40),
        String(ev.text || '').slice(0, 900),
        String(ev.mom  || '').slice(0, 40),
        String(ev.dad  || '').slice(0, 40),
        String(ev.note || '').slice(0, 4000)
      ];
    });

    var sh = sheet_();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    return json_({ ok: true, added: rows.length });

  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Danil's portal reads here. Called as JSONP (?callback=...) so it works
 *  from any origin without CORS headers. */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.key !== SECRET) return reply_(p.callback, { ok: false, error: 'bad key' });

  try {
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last < 2) return reply_(p.callback, { ok: true, rows: [] });

    var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
    var rows = values.map(function (r) {
      return {
        t:       r[0] instanceof Date ? r[0].getTime() : Number(r[0]) || 0,
        visitor: String(r[1] || ''),
        type:    String(r[2] || ''),
        text:    String(r[3] || ''),
        mom:     String(r[4] || ''),
        dad:     String(r[5] || ''),
        note:    String(r[6] || '')
      };
    });
    rows.sort(function (a, b) { return a.t - b.t; });
    return reply_(p.callback, { ok: true, rows: rows.slice(-600) });

  } catch (err) {
    return reply_(p.callback, { ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function reply_(callback, obj) {
  if (!callback) return json_(obj);
  var safe = String(callback).replace(/[^A-Za-z0-9_$]/g, '');
  return ContentService.createTextOutput(safe + '(' + JSON.stringify(obj) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
