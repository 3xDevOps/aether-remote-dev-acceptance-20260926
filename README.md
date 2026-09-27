# aether-remote-dev-acceptance-20260926
Temporary private remote-development acceptance fixture; removed after verification

## Little Workspace

Run `npm ci`, then `npm start`. Requires Node ^20.19.0 or >=22.12.0;
the migration was verified with Node 24.20.0 and npm 11.19.0.
The app binds to `http://127.0.0.1:3000`. Vite runs in middleware mode
on the Node HTTP server, including its HMR WebSocket on the same port.

Demo login: `test@example.invalid` / `demo-password`. Both inputs trim
surrounding whitespace; email is case-insensitive.

Edit the exported `heading` string in `client/welcome.js`. `client/app.js`
imports this ES module and explicitly accepts it using
`import.meta.hot.accept('./welcome.js', ...)`. Vite sends the dependency update
over its WebSocket; the handler changes only the heading's `textContent`.
It does not reload the page, reinitialize authentication, or replace the saved
note or unsaved draft. There is no heading polling or JSON configuration path.
The hosted proxy must forward WebSocket upgrades to port 3000.

Notes and sessions live in server memory. Saved notes survive page reloads in
the same session; logout or server restart clears that session's access.
This is a disposable demo with synthetic credentials, not a production identity service.
