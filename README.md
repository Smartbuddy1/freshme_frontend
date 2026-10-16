# Fresh Me frontend

Independent React/Vite frontend. Use Node 24:

```bash
npm ci
npm run dev
```

Start the backend separately. Vite forwards `/api` and `/healthz` to
`http://127.0.0.1:3000`. Use `npm run build` to create `dist/`.

Production hosting must serve `dist/`, fall back to `index.html` for browser
routes, and proxy `/api/` to the backend while preserving the request origin
and cookies. Set backend `CLIENT_ORIGIN` to the frontend's HTTPS origin.
Customer QR routes use `/m/CODE`; `/admin` is the staff panel. Legacy `/freshme/`
routes remain supported. Assets use `/freshme/assets/`, so expose that directory
from the build and serve `index.html` for client routes. Keep the API at `/api/`
so admin cookie paths work. The printer agent runs on the shop PC.

`npm test` runs checkout, validation and machine-storage regressions.
