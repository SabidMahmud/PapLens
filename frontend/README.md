# PapLens Web Client

Modern Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS v4) user interface for **PapLens: Interpretable Cervical Cytology Classification using Attention-Based Multiple Instance Learning (AB-MIL)**.

Designed for seamless deployment on **Vercel** with a clean, responsive dark-mode dashboard.

> **Dataset Attribution:**  
> Demo of a model trained on the PapSmear-BD dataset (2,253 conventional Pap-smear FOV images). This app does not distribute the dataset.

> **Clinical Disclaimer:**  
> **Research demo only. Not for clinical or diagnostic use.**

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
Set `NEXT_PUBLIC_API_URL` to your backend URL:
- Local development: `http://localhost:7860`
- Hugging Face Spaces: `https://<your-username>-paplens.hf.space`
- Kubernetes / Self-hosted: `https://api.yourdomain.com`

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## Testing and Building

```bash
# Run unit tests (Vitest)
npm test

# Run TypeScript checks and production build
npm run build

# Start production server
npm start
```

---

## Architecture Highlights

- **Direct-to-Backend Uploads**: Client-side uploads communicate directly with the FastAPI backend via `fetch` (`lib/api.ts`). They are intentionally **not** proxied through Next.js serverless routes (`/api/*`), preventing Vercel's 4.5 MB serverless body size limitation on high-resolution ($4000 \times 3000$ px) cytology images.
- **Server Health Polling**: `useBackendStatus` hook pings `GET /health` with exponential backoff, detecting when a free-tier Hugging Face Space is sleeping and rendering a friendly wake-up banner with an active progress indicator.
- **Dual Model Tasks**: Supports seamless switching between **2-Class Clinical Triage** (Normal vs Abnormal) and **3-Class Severity Grading** (Normal vs Low-Grade vs High-Grade).
- **Interactive Spatial Explainability**: Side-by-side comparison mode, real-time opacity blending slider, JET colormap scale reference, and bounding box highlights for the Top-5 diagnostic cellular clusters identified by the Attention-MIL module.
