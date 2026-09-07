# SIGRA Web

React, Vite, TypeScript, Tailwind CSS, and shadcn-compatible web client for SIGRA administrators and guards. The complete implementation plan, including the future resident mobile app, is documented in [docs/implementation-roadmap.md](docs/implementation-roadmap.md).

## Local setup

Start `sigra-api` first, then:

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_API_URL` is the API origin without the `/api` suffix. The default is `http://localhost:3000`.

In production, `VITE_API_URL` should point to the HTTPS API origin. If frontend and API share the same origin, it can be omitted to use relative paths.

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run preview
npm run validate
```

`npm run validate` runs lint and a production build. Before publishing, also run the contract, authorization, and end-to-end tests against a staging backend.

The authenticated shell exposes admin dashboard metrics, resident and unit administration, the digital bulletin, and maintenance ticket status. Guard accounts receive only the QR scanner workflow. The resident mobile application is a separate future Expo project and must consume the contracts documented in the roadmap.

## Offline limitation

QR scanning requires a live API connection because TOTP verifier material remains server-side. The web client does not claim offline authorization and does not store verifier secrets. Network failures are shown to the guard and must be retried; `clientEventId` makes successful retried writes idempotent. A dedicated durable offline queue belongs in the deferred mobile or installed-client scope.
