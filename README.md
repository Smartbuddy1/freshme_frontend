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
The current frontend uses root hosting; subpath hosting needs additional
base-path/router/proxy configuration. The printer agent runs on the shop PC.
