---
title: PapLens Backend API
emoji: 🔬
colorFrom: blue
colorTo: indigo
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
| `MAX_UPLOAD_MB` | `10` | Maximum allowable image upload size in megabytes. |
| `PORT` | `7860` | Server listen port. |
| `WEIGHTS_PATH` | `./weights` | Directory containing local model weights. |
| `HF_REPO_ID` | `""` | Optional Hugging Face Hub repo ID for hybrid fallback weight downloading. |
| `TORCH_NUM_THREADS` | `4` | Number of CPU intra-op threads for PyTorch inference. |

---

## Deployment to Hugging Face Spaces

### Step-by-Step Guide:
1. **Create Space:**
   - Go to [huggingface.co/new-space](https://huggingface.co/new-space).
   - Space name: `paplens-backend` (or `paplens`).
   - SDK: **Docker**.
   - Hardware: **CPU (Free)**.

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

4. **Connect Frontend:**
   - Your Space public URL is `https://<your-username>-paplens.hf.space`.
   - Set this URL as `NEXT_PUBLIC_API_URL` in your Vercel deployment settings.

---

## API Endpoints

- `GET /`: API welcome banner and documentation link.
- `GET /health`: Server health check, uptime, and model load status.
- `POST /predict`: Slide bag inference. Accepts multipart form data (`file`) with optional `model_type` query parameter (`triage` or `severity`).
- `GET /docs`: Interactive Swagger UI documentation.
