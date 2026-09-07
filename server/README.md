# Makerspace Utils — Server

Express + SQLite (`node:sqlite`) backend for the makerspace dashboards.

## Run

```bash
# create the admin account (>= 12 char password)
npm run create-admin <username> <password>

# start the server (serves the API + the built client from ../client/dist)
npm start
```

Requires a built client: `cd ../client && npm run build`.

- API + app: `http://localhost:3001`
- In dev, run `npm run dev` in `client/` instead (Vite on `:5173` proxies `/api`, `/events`, `/printers`, `/status` to `:3001`).

## Environment variables

| Variable            | Default                                             | Purpose |
| ------------------- | --------------------------------------------------- | ------- |
| `PORT`              | `3001`                                              | HTTP port |
| `NODE_ENV`          | *(empty)*                                           | `production` enables the `Secure` cookie flag and HSTS |
| `FRAME_ANCESTORS`   | *(empty)*                                          | Comma-separated origins allowed to embed the app in an iframe. **Empty = framing blocked** (`frame-ancestors 'none'` + `X-Frame-Options: DENY`). When set, X-Frame-Options is removed and `frame-ancestors <origins>` is emitted. |
| `APP_ORIGIN`        | `http://localhost:3001`                             | The app's own origin; allowed to submit mutating requests. |
| `ALLOWED_ORIGINS`   | dev origins                                        | Extra origins permitted for mutating (`POST/PUT/DELETE`) requests beyond `APP_ORIGIN`. |

### Embedding on other sites

To let trusted websites iframe the public pages (Printer Fleet, Calendar) without weakening security:

```bash
FRAME_ANCESTORS="https://site-a.com,https://site-b.com" npm start
```

Then on the embedding site, frame the app with a restrictive `sandbox`:

```html
<iframe src="https://your-app.example.com/#/fleet" sandbox="allow-scripts allow-same-origin"></iframe>
```

For the Calendar page, the embedded page auto-reports its height so the parent iframe can resize to fit all content (clean desktop + stacked `dayGridMonth` on mobile):

```html
<iframe id="calendar-iframe" src="https://your-app.example.com/#/calendar" sandbox="allow-scripts allow-same-origin" style="width:100%; border:0; overflow:hidden"></iframe>
<script>
  window.addEventListener('message', (e) => {
    // optionally verify e.origin === 'https://your-app.example.com'
    if (e.data?.type === 'calendar-resize' && typeof e.data.height === 'number') {
      document.getElementById('calendar-iframe').style.height = e.data.height + 'px';
    }
  });
</script>
```

The Calendar sends `postMessage({type:'calendar-resize', height: document.documentElement.scrollHeight})` on mount, resize, `ResizeObserver`, and after events load. Replace `'*'` with your app origin for stricter security if needed.

**What stays protected:**

- Only origins in `FRAME_ANCESTORS` can frame the app; all others are blocked (default).
- The admin interface (`/admin` + all `/api/*` CRUD) remains behind login. Its session cookie is `SameSite=Strict`, so a cross-origin iframe cannot carry it — admin cannot be embedded or hijacked.
- Mutating requests are rejected unless their `Origin` matches `APP_ORIGIN`/`ALLOWED_ORIGINS`, and the app no longer sends a blanket `Access-Control-Allow-Origin: *`.

If you ever need third-party sites to call `/events` or `/printers` **directly from JavaScript** (not via iframe), that requires CORS — not enabled by default. Let us know if this is needed.