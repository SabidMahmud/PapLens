# PapLens Web Client

Modern Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS v4) user interface for **PapLens: Interpretable Cervical Cytology Classification using Attention-Based Multiple Instance Learning (AB-MIL)**.

Designed for seamless deployment on **Vercel** with a responsive cytology evidence workspace.

> **Dataset Attribution:**  
> Demo of a model trained on the PapSmear-BD dataset (2,253 conventional Pap-smear FOV images). This app does not distribute the dataset.

> **Clinical Disclaimer:**  
> **PapLens is an experimental research demo for testing purposes only. Its
> outputs may be incorrect and have not been validated for clinical accuracy.
> Do not use it for diagnosis, screening, triage, treatment, patient management,
> or any other clinical decision.**

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure backend endpoints in `.env.local`:
```env
# Primary backend (local development or k3s cluster over HTTPS)
NEXT_PUBLIC_API_URL_PRIMARY=http://localhost:7860

# Fallback backend (Hugging Face Spaces)
NEXT_PUBLIC_API_URL_FALLBACK=https://sabidmahmud-paplens.hf.space
```

When opening the development frontend from another device on the local network,
set the Raspberry Pi address as both the backend host and an allowed Next.js
development origin:

```env
NEXT_PUBLIC_API_URL_PRIMARY=http://10.100.0.110:7860
NEXT_ALLOWED_DEV_ORIGINS=10.100.0.110
```

Use the actual Raspberry Pi IP address or hostname. The backend must also include
the frontend origin, such as `http://10.100.0.110:3000`, in `ALLOWED_ORIGINS`.

### 3. Run Development Server
```bash
npm run dev -- --hostname 0.0.0.0
```
Open `http://<raspberry-pi-ip>:3000` from another device on the network.

---

## Testing and Building

```bash
# Run component, workflow, validation, and failover tests
npm test

# Run ESLint checks
npm run lint

# Run TypeScript checks and production build
npm run build

# Start production server
npm start
```

For complete dual-deployment instructions and backend configuration, refer to the root [Project README](../README.md) and [Deployment Guide](../deploy/README.md).

---

## Architecture Highlights

- **Direct-to-Backend Uploads**: Client-side uploads communicate directly with the FastAPI backend via the stable `lib/api.ts` facade. They are intentionally **not** proxied through Next.js serverless routes (`/api/*`), preventing Vercel's serverless body-size limit from blocking high-resolution ($4000 \times 3000$ px) cytology images.
- **Server Health Polling**: `useBackendStatus` hook pings `GET /health` with exponential backoff, detecting when a free-tier Hugging Face Space is sleeping and rendering a friendly wake-up banner with an active progress indicator.
- **Dual Model Tasks**: Supports seamless switching between **2-Class Clinical Triage** (Normal vs Abnormal) and **3-Class Severity Grading** (Normal vs Low-Grade vs High-Grade).
- **Interactive Spatial Explainability**: Side-by-side comparison mode, real-time opacity blending slider, JET colormap scale reference, and bounding box highlights for the Top-5 diagnostic cellular clusters identified by the Attention-MIL module.

### Source boundaries

```text
src/
├── app/         Next.js routes, metadata, and global styles
├── components/  Focused presentation and feature composition
├── config/      Immutable protocol, sample, status, and visual metadata
├── domain/      Framework-independent analysis and backend types
├── hooks/       Client workflow and UI state orchestration
├── services/    Network requests, failover, sample loading, and API errors
└── lib/         Stable public facades and small pure utilities
```

Dependencies flow toward `domain` and `config`. Components do not perform API
requests or image-export work directly; hooks coordinate those operations through
services. The existing `lib/api.ts` and `lib/types.ts` import paths remain as
compatibility facades for callers and tests.
