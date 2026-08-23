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

## After her first visit

Once she reaches the portal, that device is flagged as done. Every visit
after opens **straight into the Girlfriend Portal** — no landing, no
message, no code, no story. The story is still there behind *Watch our
story again* in the portal.

The flag lives in that browser's storage, so it is per device and per
browser. Clearing site data, or opening it in a different browser, starts
her from the beginning again.

## Adding it to her phone

The page ships as an installable web app: a manifest, an apple-touch-icon
(a white heart on a pink gradient) and the Apple meta tags are all inline,
so nothing extra needs hosting. After the parents step she is told you
love her and asked to get you to walk her through **Add to Home Screen**,
with the steps for her platform on screen.

Once installed it opens full screen with no browser chrome, and since it
is a return visit it lands straight in her portal. If she opens it from
the home screen the add-to-home-screen step is skipped automatically.

Two things this needs: the site must be served over **https** (GitHub
Pages, Netlify, Vercel all qualify — a `file://` copy will not install),
and on iPhone the Add to Home Screen option only appears in **Safari**,
not Chrome.

## Worth knowing

The secret sits in the page source, so anyone who reads the HTML could post
rows to your sheet. This is a gift for your girlfriend, not a bank — but do
not reuse a password you care about, and note the script only ever *appends*.
Nothing it exposes can delete or overwrite what is already there.
