# SIGRA Web

React, Vite, TypeScript, Tailwind CSS, and shadcn-compatible web client for SIGRA administrators and guards. Mobile resident screens are intentionally out of scope.

## Local setup

Start `sigra-api` first, then:

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_API_URL` is the API origin without the `/api` suffix. The default is `http://localhost:3000`.

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

The authenticated shell exposes admin dashboard metrics, resident and unit administration, the digital bulletin, and maintenance ticket status. Guard accounts receive only the QR scanner workflow.

## Offline limitation

QR scanning requires a live API connection because TOTP verifier material remains server-side. The web client does not claim offline authorization and does not store verifier secrets. Network failures are shown to the guard and must be retried; `clientEventId` makes successful retried writes idempotent. A dedicated durable offline queue belongs in the deferred mobile or installed-client scope.
