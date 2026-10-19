# Fresh Me frontend

Independent React/Vite frontend. Use Node 24:

```bash
npm ci
npm run dev
```

Start the backend separately. Vite forwards `/api` and `/healthz` to
`http://127.0.0.1:3001` by default; set `VITE_BACKEND_TARGET` for your backend port. Use `npm run build` to create `dist/`.

Production hosting must serve `dist/`, fall back to `index.html` for browser
routes, and proxy `/api/` to the backend while preserving the request origin
and cookies. Set backend `CLIENT_ORIGIN` to the frontend's HTTPS origin.
Customer QR routes use `/fresheme/shop-slug`; `/admin` is the assigned Client Admin panel and `/super-admin` manages all clients. The asset base defaults to `/`. Each shop pairs its own printer agent on its Windows PC.

For `https://aaryainnovtech.com/freshme/`, build with `VITE_BASE_PATH=/freshme/`, serve the build at `/freshme/`, and proxy `/freshme/api/` to the backend's `/api/`. Preserve the browser Origin and cookies. QR and shop links retain `/freshme`, for example `/freshme/fresheme/fresh-me`. Use SPA fallback for deep links and set backend `CLIENT_ORIGIN=https://aaryainnovtech.com`. Cookies currently use Path `/`, which supports both hosting layouts. The backend itself exposes `/api/`; Nginx or the Vercel rewrites must remove the frontend prefix.

On Vercel, set `BACKEND_URL` to your backend's HTTPS base URL. The server-side proxy has no fallback URL and preserves Origin, cookies and shop scope. Do not configure private Razorpay credentials in any `VITE_*` variable.

`npm test` runs checkout, optional contact validation, shop storage/routing and proxy security regressions. See [the multi-client guide](../fresheme_backned/deploy/MULTI_CLIENT_UPGRADE.md) for onboarding and deployment.
