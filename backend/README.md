---
title: PapLens Backend API
sdk: docker
app_port: 7860
pinned: false
---

# PapLens Backend API

Production inference server for **PapLens: Interpretable Cervical Cytology Classification using Attention-Based Multiple Instance Learning (AB-MIL)** with a ResNet-50 feature extractor.

Designed for containerized CPU deployment on **Hugging Face Spaces** (Docker SDK, port 7860) and Kubernetes / k3s clusters.

> **Dataset Attribution:**  
> Demo of a model trained on the PapSmear-BD dataset (2,253 conventional Pap-smear FOV images). This app does not distribute the dataset.

> **Clinical Disclaimer:**  
> **Research demo only. Not for clinical or diagnostic use.**

---

## Quickstart: Local Docker Run

```bash
# 1. Build Docker image (~669 MB)
docker build -t paplens-backend .

# 2. Run container
docker run -p 7860:7860 paplens-backend
```

Verify health:
```bash
curl http://localhost:7860/health
```

---

## Environment Configuration

The backend is configured via environment variables (with robust defaults):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed CORS origins. Never use `*` in production. |
| `MAX_UPLOAD_MB` | `50` | Maximum image file size in MiB; uploads are read in bounded chunks. |
| `MAX_LONG_SIDE` | `4000` | Maximum pixels on the image's longest side. |
| `MAX_SHORT_SIDE` | `3000` | Maximum pixels on the image's shortest side. |
| `MAX_IMAGE_PIXELS` | `12000000` | Maximum decoded image area. |
| `MAX_CONCURRENT_INFERENCES` | `1` | Maximum active inference pipelines per server process. |
| `MAX_QUEUED_INFERENCES` | `2` | Maximum requests waiting for an inference slot. |
| `INFERENCE_QUEUE_TIMEOUT_SECONDS` | `30` | Maximum time a queued request waits for a slot. |
| `PORT` | `7860` | Server listen port. |
| `WEIGHTS_DIR` | `./weights` | Directory containing local model weights. |
| `HF_REPO_ID` | `""` | Optional Hugging Face Hub repo ID for hybrid fallback weight downloading. |
| `HF_TOKEN` | `""` | Optional Hugging Face Hub token for downloading from private model repositories. |
| `TORCH_THREADS` | `4` | Number of CPU intra-op threads for PyTorch inference. |

---

## Deployment to Hugging Face Spaces

The Hugging Face Space functions as the automatic failsafe backend for PapLens.

### Step-by-Step Guide:
1. **Create Space:**
   - Go to [huggingface.co/new-space](https://huggingface.co/new-space).
   - Space name: `paplens-backend` (or `paplens`).
   - SDK: **Docker**.
   - Hardware: **CPU Basic (Free)**.

2. **Push Repository:**
   ```bash
   cd backend
   git init
   git remote add space https://huggingface.co/spaces/<your-username>/paplens
   git add .
   git commit -m "Deploy PapLens backend"
   git push space main
   ```

3. **Configure Environment Variables:**
   - In Hugging Face Space Settings -> **Variables and secrets**:
     - Variable: `ALLOWED_ORIGINS`
     - Value: `https://<your-vercel-domain>.vercel.app,http://localhost:3000`
     - Variable (optional): `HF_REPO_ID`
     - Secret (optional): `HF_TOKEN`

4. **Connect Frontend:**
   - Your Space public URL is `https://<your-username>-paplens.hf.space`.
   - Set this URL as `NEXT_PUBLIC_API_URL_FALLBACK` in your Vercel deployment settings.

---

## API Endpoints

- `GET /`: API welcome banner and documentation link.
- `GET /health`: Readiness check; returns HTTP 503 until all models are loaded.
- `POST /predict`: Slide bag inference. Accepts multipart form data (`file`) with optional `model_type` query parameter (`triage` or `severity`).
- `GET /docs`: Interactive Swagger UI documentation.

API errors consistently use `{"error": "<code>", "detail": "<message>"}`.

---

## Subsystem Documentation

- [Root Project README](../README.md): System architecture, empirical benchmarks, and research methodology.
- [Frontend Documentation](../frontend/README.md): Next.js user interface, client failover resolver, and Vercel hosting.
- [Deployment Guide](../deploy/README.md): Dual-deployment instructions for k3s GitOps (Flux CD v2) and Hugging Face Spaces.
