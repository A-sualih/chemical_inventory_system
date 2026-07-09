# CIMS Mobile (Expo)

Native mobile client for the Chemical Inventory Management System.  
Uses the **same Express backend** as the web app (`/api/*`) with JWT auth and lab scope.

## Features

Field + lab modules against the **same** `/api/*` backend as the web SPA:

- Public marketing: Landing (CIMS PRO), Learn More, Privacy, Terms, Support
- Auth: Sign In (+ MFA), Create Account, Forgot password, Reset password
- Home dashboard + module hub
- Chemicals (list/detail), Containers, Batches
- Barcode/QR scan → check-out / check-in
- Requests, Transfers (approve/reject), Waste disposals
- Expiry summary, Safety dashboard / conflicts
- Transactions, Inventory logs, Locations
- Procurement: suppliers + purchase orders
- Notifications, Profile / lab switch

Still web-only for now (admin-heavy): full enroll form, integrations hub, security backups, audit export tooling, SDS PDF designer. Those can be added as screens on the same API.

## Preview on your PC (no phone)

Yes — use the **browser**:

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — mobile UI in Chrome
cd mobile
npm run web
```

Chrome opens automatically (or go to the URL Expo prints, usually `http://localhost:8081`).

**Limits on PC web preview:** camera/barcode scanning is limited; use manual code entry on the Scan screen. Everything else (landing, login, register, modules) works in the browser.

### Optional: Android emulator (more “phone-like”)
Install [Android Studio](https://developer.android.com/studio), create a Virtual Device, then:

```bash
cd mobile
npm start
# press `a` to open the Android emulator
```

You currently do **not** have `adb`/`emulator` installed, so **browser preview is the path that works now**.

## Setup

```bash
cd mobile
cp .env.example .env
npm install
npm start
```

### API URL for devices

| Environment | `EXPO_PUBLIC_API_URL` |
|-------------|----------------------|
| iOS simulator | `http://127.0.0.1:5001/api` |
| Android emulator | `http://10.0.2.2:5001/api` |
| Physical phone | `http://<your-LAN-IP>:5001/api` |

Example:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:5001/api npm start
```

If unset, the app tries to infer the LAN host from Expo’s debugger host, then falls back to the table above.

## Scripts

- `npm start` — Expo dev server
- `npm run android` / `npm run ios` — open platform

## Auth storage

Token + user are stored in **Expo SecureStore** (same JWT the web stores in `localStorage`).

## Expanding to full web parity

Add screens that call existing routes already used by the SPA:

- Transfers → `/api/transfers`
- Waste → `/api/waste`
- Expiry → `/api/expiry`
- Safety → `/api/safety`
- Procurement → `/api/procurement`

No backend fork is required — keep extending this Expo client against the shared API.
