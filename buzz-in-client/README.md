# Buzz In — Client (React + Vite)

The web app players and host will use at **goonersclub.com**.

## Local Dev
1) Install Node.js 18+
2) Install deps:
   ```bash
   npm install
   ```
3) Create a `.env` file with your server URL (or use the Render URL directly):
   ```bash
   VITE_SERVER_URL=https://buzz-in-server-1.onrender.com
   ```
4) Run locally:
   ```bash
   npm run dev
   ```

## Cloudflare Pages
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Environment variable:** `VITE_SERVER_URL=https://buzz-in-server-1.onrender.com` (or your custom server subdomain)
