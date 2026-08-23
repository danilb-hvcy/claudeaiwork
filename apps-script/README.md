# The database behind towne.html

A Google Sheet is the database. A Google Apps Script web app is the door in
front of it. Her phone posts rows in; your private portal reads them back.

No billing, no server to run, no command line — every step below is a browser.

## Setup

1. Open **sheets.new** and name the sheet whatever you like.
2. **Extensions → Apps Script.** Delete whatever is already in the editor.
3. Paste in all of `Code.gs` from this folder.
4. Change `SECRET` at the top to a string of your own.
5. **Deploy → New deployment → gear icon → Web app**, then:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   
   "Anyone" is required — her phone is not signed into your Google account,
   so anything stricter rejects her writes.
6. **Deploy**, then **Authorize access** and allow it. Google will warn that
   the app is unverified; it is your own script, so continue through.
7. Copy the **Web app URL**. It ends in `/exec`.
8. In `towne.html`, fill in `CONFIG.db`:

```js
db: {
  url: 'https://script.google.com/macros/s/AKfy.../exec',
  key: 'the same SECRET you set in Code.gs'
},
```

If you edit `Code.gs` later, you must **Deploy → Manage deployments → edit →
Version: New version**, or the old code keeps serving.

## What lands in the sheet

One row per thing that happens, columns
`time | visitor | type | text | mom | dad | note`.

`visitor` is a random id generated per device, so you can tell her phone from
your own. Your portal labels them A, B, C… in the log.

## How it behaves

- **Writes are fire-and-forget.** The site posts with `mode: 'no-cors'`,
  because Apps Script cannot answer a CORS preflight. The row lands; the
  browser just will not let the page read the reply. This is deliberate — an
  earlier version tried to read it, treated the blocked response as failure,
  retried, and wrote every row twice.
- **Reads use JSONP**, which sidesteps CORS entirely. Errors from the sheet
  (`bad key`, unreachable) do surface here, so a mismatched secret shows up
  as soon as you open your portal.
- **Events are batched** on a 1.4s debounce, and flushed with `sendBeacon`
  when she closes the tab, so the tail is not lost.
- **Offline is survivable.** If the network is genuinely down the batch is
  kept in memory and retried on the next flush.
- **No URL configured?** The whole layer sits quiet and the site behaves
  exactly as it did before: everything local to the device.

## Worth knowing

The secret sits in the page source, so anyone who reads the HTML could post
rows to your sheet. This is a gift for your girlfriend, not a bank — but do
not reuse a password you care about, and note the script only ever *appends*.
Nothing it exposes can delete or overwrite what is already there.
