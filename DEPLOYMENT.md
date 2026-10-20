# PapLens Deployment Guide

Complete production deployment procedure for PapLens. The system runs a FastAPI inference
backend on two independent targets — a private k3s cluster (primary) and Hugging Face Spaces
(failsafe) — and a Next.js frontend on Vercel that resolves the active backend at runtime via
client-side health probing with automatic failover.

> [!IMPORTANT]
> Deploy in the exact order described in this document. Reversing Steps 5 and 6, in particular,
> causes CORS errors because the Vercel domain is not yet known when the backend is first
> configured.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1 — Build and Push the Backend Container Image](#3-step-1--build-and-push-the-backend-container-image)
4. [Step 2 — Provision Kubernetes Secrets](#4-step-2--provision-kubernetes-secrets)
5. [Step 3 — Deploy to k3s via Flux CD](#5-step-3--deploy-to-k3s-via-flux-cd)
6. [Step 4 — Configure Cloudflare Tunnel Ingress](#6-step-4--configure-cloudflare-tunnel-ingress)
7. [Step 5 — Deploy the Hugging Face Spaces Failsafe](#7-step-5--deploy-the-hugging-face-spaces-failsafe)
8. [Step 6 — Configure ALLOWED_ORIGINS on Both Backends](#8-step-6--configure-allowed_origins-on-both-backends)
9. [Step 7 — Deploy the Frontend to Vercel](#9-step-7--deploy-the-frontend-to-vercel)
10. [Step 8 — Verify End-to-End and Test Failover](#10-step-8--verify-end-to-end-and-test-failover)
11. [Environment Variable Reference](#11-environment-variable-reference)
12. [Kubernetes Manifest Reference](#12-kubernetes-manifest-reference)
13. [Ongoing Operations](#13-ongoing-operations)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Architecture Overview

```
Browser (Vercel)
  |
  |-- probe PRIMARY /health (timeout: 4 s) -------> k3s cluster
  |        ok: use primary                            |
  |        fail: probe FALLBACK /health               +-- Cloudflare Tunnel (HTTPS)
  |                                                   +-- Deployment: paplens-backend
  +-- fallback ---------------------------------> Hugging Face Spaces
                                                    |
                                                    +-- Docker SDK (CPU Basic, free)
                                                    +-- same backend/Dockerfile

Both backends:
  - FastAPI (Uvicorn, 1 worker, port 7860)
  - ResNet-50 feature extractor + Gated AB-MIL
  - Weights downloaded on startup from sabidmahmud/paplens-weights (Hugging Face Hub)
  - No model weights committed to git
```

Failover logic (implemented in `frontend/src/lib/api.ts`):

- On each session start, the frontend probes `PRIMARY/health` with a 4-second timeout.
- On success, all traffic routes to the primary k3s cluster.
- On timeout or non-2xx, the frontend probes `FALLBACK/health` with an 8-second timeout and
  routes to Hugging Face Spaces for the rest of the session.
- If a `/predict` call fails mid-session (5xx or network error), one automatic retry is issued
  on the alternate backend. 4xx validation errors are not retried.
- The resolved backend is cached in `sessionStorage`; opening a new tab or window triggers a
  fresh probe.

---

## 2. Prerequisites

### Local Tools

| Tool | Minimum Version | Purpose |
| :--- | :--- | :--- |
| Docker | 24.x | Build and push backend image |
| kubectl | 1.28 | Interact with k3s cluster |
| Flux CLI (`flux`) | 2.x | Bootstrap and reconcile Flux CD |
| Node.js | 20 LTS | Frontend build verification |
| Vercel CLI (`vercel`) | 37.x | Optional; Vercel web UI is sufficient |

Install the Flux CLI:

```bash
curl -s https://fluxcd.io/install.sh | sudo bash
flux --version
```

### Accounts and Access

- **GitHub**: Repository `SabidMahmud/PapLens` with `packages: write` permission for GHCR.
- **Hugging Face**: Account `sabidmahmud`. Two repositories required:
  - Model weights: `sabidmahmud/paplens-weights` (private or public)
  - Space: `sabidmahmud/paplens` (Docker SDK)
- **Cloudflare**: Account with an active Zero Trust tunnel configured for your k3s host.
- **Vercel**: Account connected to the GitHub repository.

### Secrets to Prepare Before Starting

Collect these values before beginning. You will need them in Steps 2, 5, and 7.

| Secret | Where Used | How to Obtain |
| :--- | :--- | :--- |
| `HF_TOKEN` | k3s secret, HF Space secret | Hugging Face → Settings → Access Tokens (read scope) |
| Cloudflare Tunnel token | k3s secret or daemon config | Cloudflare Zero Trust → Tunnels → your tunnel |
| `GHCR_TOKEN` | Docker login | GitHub → Settings → Developer settings → PAT (packages:write) |

---

## 3. Step 1 — Build and Push the Backend Container Image

The backend image is built from `backend/Dockerfile`. It runs as non-root `appuser` (UID 1000),
installs CPU-only PyTorch, and downloads model weights from Hugging Face Hub at startup.
**No weights are baked into the image.**

### Option A: Automated via GitHub Actions (Recommended)

Push any change to `backend/` on the `main` branch. The workflow at
`.github/workflows/backend-image.yml` triggers automatically:

1. Logs in to GitHub Container Registry using `GITHUB_TOKEN` (no PAT required).
2. Builds `backend/Dockerfile` with BuildKit layer caching.
3. Pushes two tags:
   - `ghcr.io/sabidmahmud/paplens-backend:latest`
   - `ghcr.io/sabidmahmud/paplens-backend:sha-<short-sha>`

After the workflow completes, copy the `sha-<short-sha>` tag from the Actions run log. You will
need it in Step 3.3.

### Option B: Manual Build and Push

```bash
# Authenticate to GHCR
echo "$GHCR_TOKEN" | docker login ghcr.io -u sabidmahmud --password-stdin

# Capture the current short SHA
GIT_SHA=$(git rev-parse --short HEAD)

# Build
docker build \
  -t ghcr.io/sabidmahmud/paplens-backend:latest \
  -t ghcr.io/sabidmahmud/paplens-backend:sha-${GIT_SHA} \
  backend/

# Push both tags
docker push ghcr.io/sabidmahmud/paplens-backend:latest
docker push ghcr.io/sabidmahmud/paplens-backend:sha-${GIT_SHA}

echo "Image tag for kustomize: sha-${GIT_SHA}"
```

### Verify the Image is Available

```bash
# Inspect the manifest without pulling (requires skopeo or docker manifest)
docker manifest inspect ghcr.io/sabidmahmud/paplens-backend:latest
```

> [!NOTE]
> GHCR packages default to private visibility. If the k3s cluster cannot pull from a private
> registry, either set the package to public (GHCR → Package Settings → Change visibility) or
> create a Kubernetes `imagePullSecret` and reference it in `deploy/k8s/base/deployment.yaml`.

---

## 4. Step 2 — Provision Kubernetes Secrets

Secrets are not managed by Flux or committed to git. Create them directly on the cluster before
applying any manifests.

### 2.1 Ensure the Namespace Exists

```bash
kubectl create namespace paplens --dry-run=client -o yaml | kubectl apply -f -
```

### 2.2 Create the HF Token Secret

The `HF_TOKEN` secret allows the backend to download weights from the private
`sabidmahmud/paplens-weights` repository at pod startup.

```bash
kubectl -n paplens create secret generic paplens-secrets \
  --from-literal=HF_TOKEN="<YOUR_HUGGINGFACE_READ_TOKEN>"
```

Verify:

```bash
kubectl -n paplens get secret paplens-secrets -o jsonpath='{.data.HF_TOKEN}' | base64 -d
```

### 2.3 Create the Cloudflare Tunnel Secret (if using Option B in-namespace cloudflared)

If you are running a dedicated `cloudflared` pod inside the `paplens` namespace (see Step 4 /
Option B), create this secret:

```bash
kubectl -n paplens create secret generic cloudflare-tunnel-token \
  --from-literal=token="<YOUR_CLOUDFLARE_TUNNEL_TOKEN>"
```

If you are adding an ingress rule to an existing tunnel daemon running at the host or cluster
level (Step 4 / Option A), skip this step.

> [!CAUTION]
> Never commit these secrets to the git repository. The manifests in `deploy/k8s/base/` reference
> them by name only (`secretKeyRef`). The file `deploy/k8s/base/secret-reference.yaml` is
> intentionally excluded from the Kustomize base to prevent accidental commits of placeholder
> values.

---

## 5. Step 3 — Deploy to k3s via Flux CD

### 3.1 Verify Cluster Access

```bash
kubectl cluster-info
kubectl get nodes
```

### 3.2 Bootstrap Flux CD (First Time Only)

If Flux CD v2 is not yet installed on the cluster:

```bash
# Pre-flight checks
flux check --pre

# Bootstrap against the main branch
# Flux will create a deploy key on the repository and install itself in flux-system namespace
flux bootstrap github \
  --owner=SabidMahmud \
  --repository=PapLens \
  --branch=main \
  --path=./deploy/flux \
  --personal

# Confirm Flux is healthy
flux check
```

Flux will now watch the `deploy/flux/` directory on `main` and apply whatever it finds there.

### 3.3 Pin the Production Image Tag

Before applying or merging to `main`, update the image tag in the production overlay to the
exact SHA built in Step 1:

Edit `deploy/k8s/overlays/prod/kustomization.yaml`:

```yaml
images:
  - name: ghcr.io/sabidmahmud/paplens-backend
    newTag: sha-<COMMIT_SHORT_SHA>   # e.g. sha-bb0f341
```

Commit and push this change to `main`. Flux will detect it within 5 minutes (the default
`GitRepository` sync interval) and trigger a rolling update.

### 3.4 Apply Flux GitOps Manifests (If Flux Is Already Running)

If Flux is already bootstrapped from a previous run, apply or update the source and
kustomization manually and trigger an immediate reconcile:

```bash
kubectl apply -f deploy/flux/gitrepository.yaml
kubectl apply -f deploy/flux/kustomization.yaml

# Force immediate reconciliation without waiting for the 5-minute interval
flux reconcile kustomization paplens-prod --with-source
```

### 3.5 Monitor Rollout

```bash
# Watch Flux reconciliation events
flux get kustomizations --watch

# Watch the Deployment rollout
kubectl rollout status deployment/paplens-backend -n paplens --timeout=3m

# Inspect all paplens resources
kubectl get all -n paplens

# Check pod logs
kubectl logs -n paplens deployment/paplens-backend --follow
```

Expected log lines during successful startup:

```
[paplens-backend] Initializing inference models on cpu...
[paplens-backend] Downloading weights from sabidmahmud/paplens-weights ...
[paplens-backend] Models successfully loaded and ready for inference.
INFO:     Application startup complete.
```

### 3.6 Apply Directly via Kustomize (Without Flux)

If you prefer to apply manifests imperatively rather than via GitOps:

```bash
kustomize build deploy/k8s/overlays/prod | kubectl apply -f -
```

---

## 6. Step 4 — Configure Cloudflare Tunnel Ingress

The k3s backend Service is `ClusterIP` type on port 7860. It is not exposed via a standard
Ingress or LoadBalancer. Traffic reaches it exclusively through a Cloudflare Tunnel, which
provides HTTPS termination and DDoS protection without opening inbound firewall ports on the
host.

### Option A: Add a Rule to an Existing Tunnel (Recommended)

If you already have a `cloudflared` daemon running on the k3s host or inside another namespace,
add a new hostname rule to its `config.yml`:

```yaml
# /etc/cloudflared/config.yml (on the host) or mounted ConfigMap in cluster
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: api-paplens.yourdomain.com
    service: http://paplens-backend.paplens.svc.cluster.local:7860
  # ... your other rules ...
  - service: http_status:404   # required catch-all
```

Reload the tunnel daemon:

```bash
# If running as a systemd service
sudo systemctl restart cloudflared

# If running as a Kubernetes Deployment, restart it
kubectl rollout restart deployment/cloudflared -n <namespace>
```

In the Cloudflare Zero Trust dashboard, add a **Public Hostname** record:

- Subdomain: `api-paplens`
- Domain: `yourdomain.com`
- Service type: `HTTP`
- URL: `paplens-backend.paplens.svc.cluster.local:7860`

### Option B: Deploy a Dedicated cloudflared Pod in the paplens Namespace

If you prefer an isolated tunnel sidecar per application:

1. Ensure the `cloudflare-tunnel-token` secret was created in Step 2.3.
2. Uncomment the cloudflared `Deployment` block in `deploy/k8s/base/cloudflare-tunnel.yaml`.
3. Apply:

```bash
kubectl apply -f deploy/k8s/base/cloudflare-tunnel.yaml
kubectl rollout status deployment/cloudflared-paplens -n paplens
```

### Verify Tunnel Connectivity

```bash
curl -i https://api-paplens.yourdomain.com/health
```

Expected response (HTTP 200):

```json
{"status":"ok","models_loaded":true,"available_models":["triage","severity"],"device":"cpu","torch_threads":4,"version":"1.0.0"}
```

> [!NOTE]
> The first request after a cold pod start may take 20–30 seconds while weights download from
> Hugging Face Hub (~193 MB). Subsequent requests within the same pod lifetime use in-memory
> cached weights and respond in approximately 4–6 seconds.

---

## 7. Step 5 — Deploy the Hugging Face Spaces Failsafe

The failsafe backend uses the identical `backend/Dockerfile` and codebase. It runs on
Hugging Face's free CPU Basic hardware tier.

### 5.1 Create the Space

1. Go to [huggingface.co/new-space](https://huggingface.co/new-space).
2. Set:
   - **Owner**: `sabidmahmud`
   - **Space name**: `paplens`
   - **SDK**: Docker
   - **Hardware**: CPU Basic (free)
   - **Visibility**: Public (required for unauthenticated browser access) or Private with a Space
     token configured in the frontend.

### 5.2 Configure Space Secrets and Variables

In the Space **Settings → Variables and secrets** panel, add:

| Key | Value | Type |
| :--- | :--- | :--- |
| `HF_REPO_ID` | `sabidmahmud/paplens-weights` | Variable |
| `HF_TOKEN` | `<YOUR_HUGGINGFACE_READ_TOKEN>` | Secret |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Variable (temporary; updated in Step 6) |

### 5.3 Push Backend Code to the Space Repository

The Space pulls from its own git repository at `https://huggingface.co/spaces/sabidmahmud/paplens`.
Push only the `backend/` directory content (not the full monorepo):

```bash
cd backend

# Add the Space as a remote (one-time)
git remote add hf-space https://huggingface.co/spaces/sabidmahmud/paplens

# Push the backend content
# Note: the Space expects its Dockerfile at the repo root, not backend/
# Since you are pushing from within the backend/ directory, Dockerfile is at root
git push hf-space HEAD:main
```

If the Space repository already has a different history, use `--force`:

```bash
git push hf-space HEAD:main --force
```

### 5.4 Monitor Space Build

Watch the build logs from the Space page:
`https://huggingface.co/spaces/sabidmahmud/paplens`

Build time is typically 3–5 minutes (pip install + Docker layer caching on second build).

### 5.5 Verify Space Health

```bash
curl -i https://sabidmahmud-paplens.hf.space/health
```

Expected response: same JSON as Step 4 verification above.

> [!NOTE]
> A Hugging Face Space on CPU Basic spins down after approximately 30 minutes of inactivity. On
> the first request after a sleep period, the Space wakes up and may take 60–120 seconds to
> respond. The frontend resolver uses an 8-second timeout on the fallback health probe. If the
> Space is sleeping, the probe will timeout and the UI will show "System offline" until the user
> retries. The Space wakes in the background and becomes available after its startup completes.

---

## 8. Step 6 — Configure ALLOWED_ORIGINS on Both Backends

The backend enforces strict CORS. Browsers will reject cross-origin requests unless the Vercel
origin is explicitly listed in `ALLOWED_ORIGINS` on both backends. This step must be done before
deploying the frontend, or after the Vercel deployment URL is known.

### 8.1 Determine Your Vercel URL

If you have already deployed to Vercel, the URL will be of the form:
- Production alias: `https://paplens.vercel.app`
- Preview deployment: `https://paplens-<hash>-sabidmahmud.vercel.app`

If deploying for the first time, you can deploy to Vercel first (Step 7), note the URL, and then
return to this step.

### 8.2 Update ALLOWED_ORIGINS on k3s

Edit `deploy/k8s/base/configmap.yaml`:

```yaml
data:
  ALLOWED_ORIGINS: "https://paplens.vercel.app,http://localhost:3000,http://127.0.0.1:3000"
```

Commit and push to `main`. Flux will pick up the change and restart the Deployment automatically.

To apply immediately without waiting for Flux sync:

```bash
kubectl apply -f deploy/k8s/base/configmap.yaml
kubectl rollout restart deployment/paplens-backend -n paplens
kubectl rollout status deployment/paplens-backend -n paplens
```

Verify CORS headers:

```bash
curl -i -H "Origin: https://paplens.vercel.app" \
  https://api-paplens.yourdomain.com/health
```

The response should include `Access-Control-Allow-Origin: https://paplens.vercel.app`.

### 8.3 Update ALLOWED_ORIGINS on Hugging Face Space

In the Space **Settings → Variables and secrets** panel, update:

| Key | Value |
| :--- | :--- |
| `ALLOWED_ORIGINS` | `https://paplens.vercel.app,http://localhost:3000` |

Saving a variable triggers an automatic Space restart.

---

## 9. Step 7 — Deploy the Frontend to Vercel

### 9.1 Connect the Repository

1. Log in to [vercel.com](https://vercel.com) and click **Add New Project**.
2. Import `SabidMahmud/PapLens` from GitHub.
3. Set **Root Directory** to `frontend`.
4. Framework preset: **Next.js** (auto-detected).

### 9.2 Set Environment Variables

In the Vercel project **Settings → Environment Variables**, add:

| Variable | Value | Environments |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL_PRIMARY` | `https://api-paplens.yourdomain.com` | Production, Preview |
| `NEXT_PUBLIC_API_URL_FALLBACK` | `https://sabidmahmud-paplens.hf.space` | Production, Preview |

> [!IMPORTANT]
> `NEXT_PUBLIC_` variables are inlined into the client bundle at build time. If you change these
> values in the Vercel dashboard, you must redeploy (trigger a new build) for the changes to take
> effect in the browser. Simply saving them does not update an already-built deployment.

### 9.3 Deploy

Click **Deploy**. The build runs `next build` (approximately 30–60 seconds on Vercel's build
machines).

### 9.4 Configure Automatic Deployments

By default, Vercel deploys on every push to `main`. For this project, a push to `main` should
only trigger a Vercel rebuild if frontend files changed. To avoid spurious rebuilds, add an
**Ignored Build Step** in Vercel project settings:

```bash
git diff HEAD~1 --name-only | grep -q '^frontend/'
```

This returns exit code 0 (build proceeds) only if files under `frontend/` changed.

---

## 10. Step 8 — Verify End-to-End and Test Failover

### 10.1 Smoke Test the Full Pipeline

Open the deployed Vercel URL (e.g. `https://paplens.vercel.app`) in a browser.

Expected behavior:
- The header status badge shows **System ready · k3s** (green dot).
- Click any of the five sample images (NILM, ASC-US, LSIL, HSIL, SCC).
- Select a protocol (Triage or Severity Grading).
- Click **Run analysis**.
- The evidence report appears with predicted class, confidence scores, inference time, and the
  interactive attention heatmap viewer.

Verify inference from the terminal:

```bash
# Triage model
curl -s -X POST \
  -F "file=@frontend/public/samples/sample_nilm.jpg" \
  "https://api-paplens.yourdomain.com/predict?model_type=triage" \
  | jq '{predicted_class, confidence, inference_time_ms, num_patches}'

# Severity model
curl -s -X POST \
  -F "file=@frontend/public/samples/sample_hsil.jpg" \
  "https://api-paplens.yourdomain.com/predict?model_type=severity" \
  | jq '{predicted_class, confidence, inference_time_ms, num_patches}'
```

### 10.2 Test Automated Client-Side Failover

1. **Scale the k3s primary backend to 0 replicas:**

   ```bash
   kubectl scale deployment/paplens-backend --replicas=0 -n paplens
   ```

2. Open a new browser tab (to clear the session cache) or open an incognito window and navigate
   to `https://paplens.vercel.app`.

3. The header status badge will briefly show **Connecting** while the primary probe times out
   (up to 4 seconds), then update to **Fallback online · Hugging Face**.

4. Submit a sample image. Inference completes via Hugging Face Spaces.

5. **Restore the primary backend:**

   ```bash
   kubectl scale deployment/paplens-backend --replicas=1 -n paplens
   kubectl rollout status deployment/paplens-backend -n paplens
   ```

6. Open a fresh tab. The frontend should route back to the k3s cluster automatically.

---

## 11. Environment Variable Reference

### Backend (both k3s and Hugging Face Space)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated list of allowed CORS origins. Must include the Vercel domain in production. |
| `HF_REPO_ID` | _(empty)_ | Hugging Face Hub repository ID for weight downloads, e.g. `sabidmahmud/paplens-weights`. |
| `HF_TOKEN` | _(empty)_ | Hugging Face read access token. Required only if the weights repository is private. |
| `DEVICE` | `cpu` | PyTorch compute device. Only `cpu` is supported in the current deployment. |
| `TORCH_THREADS` | `4` | `torch.set_num_threads()` value. Reduce if the host has fewer physical cores. |
| `MAX_UPLOAD_MB` | `50` | Maximum accepted image file size in MiB. |
| `MAX_LONG_SIDE` | `4000` | Maximum pixels on the image's longest side. |
| `MAX_SHORT_SIDE` | `3000` | Maximum pixels on the image's shortest side. |
| `MAX_IMAGE_PIXELS` | `12000000` | Maximum decoded image area. |
| `MAX_CONCURRENT_INFERENCES` | `1` | Maximum active inference pipelines per process. |
| `MAX_QUEUED_INFERENCES` | `2` | Maximum requests waiting for inference. |
| `INFERENCE_QUEUE_TIMEOUT_SECONDS` | `30` | Maximum queue wait before returning HTTP 503. |
| `PORT` | `7860` | Uvicorn listen port. Must match the Kubernetes Service `targetPort` and Hugging Face Space `app_port`. |

### Frontend (Vercel / `.env.local`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL_PRIMARY` | `http://localhost:7860` | Primary backend base URL. Probed first on each new browser session. |
| `NEXT_PUBLIC_API_URL_FALLBACK` | `https://sabidmahmud-paplens.hf.space` | Fallback backend base URL. Used when the primary is unreachable. |

---

## 12. Kubernetes Manifest Reference

All manifests live under `deploy/k8s/`. The overlay pattern (Kustomize base + prod overlay)
allows a single base to support multiple environments.

```
deploy/
  k8s/
    base/
      kustomization.yaml          -- resource list (excludes secret-reference.yaml)
      namespace.yaml              -- Namespace: paplens
      configmap.yaml              -- ConfigMap: paplens-config (non-secret env vars)
      deployment.yaml             -- Deployment: paplens-backend (non-root, read-only FS)
      service.yaml                -- Service: paplens-backend (ClusterIP, port 7860)
      cloudflare-tunnel.yaml      -- Reference comments + optional cloudflared Deployment
      secret-reference.yaml       -- Documentation only; NOT included in kustomization.yaml
    overlays/
      prod/
        kustomization.yaml        -- Pins the image tag; adds environment=production label
  flux/
    gitrepository.yaml            -- GitRepository: watches SabidMahmud/PapLens main branch
    kustomization.yaml            -- Kustomization: syncs deploy/k8s/overlays/prod every 10m
```

### Resource Limits (deploy/k8s/base/deployment.yaml)

| Resource | Request | Limit |
| :--- | :--- | :--- |
| CPU | 1000m (1 core) | 2000m (2 cores) |
| Memory | 1 Gi | 2 Gi |

Adjust these values in `deploy/k8s/base/deployment.yaml` to match your node capacity.

### Security Context

The Deployment runs with:
- `runAsNonRoot: true` / `runAsUser: 1000` (matches `appuser` in Dockerfile)
- `readOnlyRootFilesystem: true`
- `allowPrivilegeEscalation: false`
- All Linux capabilities dropped

Three `emptyDir` volumes are mounted for `/tmp`, `/app/weights`, and `/home/appuser/.cache`
to satisfy the read-only filesystem requirement while allowing runtime writes.

---

## 13. Ongoing Operations

### Rolling Out a New Backend Version

1. Merge changes to `backend/` into `main`.
2. GitHub Actions builds and pushes `ghcr.io/sabidmahmud/paplens-backend:sha-<new-sha>`.
3. Update `deploy/k8s/overlays/prod/kustomization.yaml` with the new `sha-<new-sha>` tag.
4. Commit and push the kustomization change to `main`.
5. Flux detects the change within 5 minutes and performs a rolling update.
6. Monitor: `kubectl rollout status deployment/paplens-backend -n paplens`

### Forcing an Immediate Flux Sync

```bash
flux reconcile kustomization paplens-prod --with-source
```

### Checking Flux Status

```bash
flux get all -n flux-system
flux events --watch
```

### Viewing Backend Logs

```bash
# Stream live logs
kubectl logs -n paplens deployment/paplens-backend --follow

# Last 200 lines
kubectl logs -n paplens deployment/paplens-backend --tail=200
```

### Checking Pod Resource Usage

```bash
kubectl top pod -n paplens
```

### Updating Frontend Environment Variables

In the Vercel dashboard, update the variable values and then redeploy:

```bash
vercel --prod
```

or trigger a redeployment from the Vercel project dashboard.

---

## 14. Troubleshooting

### Backend pod stays in `Pending` or `ImagePullBackOff`

```bash
kubectl describe pod -n paplens -l app.kubernetes.io/name=paplens-backend
```

- **ImagePullBackOff**: The GHCR package is private. Either set the package public, or create
  a Kubernetes `imagePullSecret`:

  ```bash
  kubectl -n paplens create secret docker-registry ghcr-pull-secret \
    --docker-server=ghcr.io \
    --docker-username=sabidmahmud \
    --docker-password=<GHCR_TOKEN>
  ```

  Then add `imagePullSecrets: [{name: ghcr-pull-secret}]` to the pod spec in
  `deploy/k8s/base/deployment.yaml`.

### Weights fail to download at pod startup (`OSError`, `401`)

- Confirm `HF_TOKEN` is set correctly: `kubectl -n paplens get secret paplens-secrets -o yaml`
- Confirm `HF_REPO_ID` in the ConfigMap matches the actual Hub repository name.
- If the repo was made public, remove `HF_TOKEN` from the secret; the download will proceed
  unauthenticated.

### CORS errors in the browser console

`Access-Control-Allow-Origin` header is missing or does not match the frontend origin.

- Check `ALLOWED_ORIGINS` in the ConfigMap:
  `kubectl -n paplens get configmap paplens-config -o yaml`
- Ensure the exact Vercel domain (with `https://` and no trailing slash) is listed.
- After updating the ConfigMap, restart the pod:
  `kubectl rollout restart deployment/paplens-backend -n paplens`

### Frontend shows `System offline` on initial load

- The primary backend health probe failed and the fallback also failed.
- Check that the Cloudflare Tunnel is routing traffic: `curl https://api-paplens.yourdomain.com/health`
- Check that the HF Space is awake: `curl https://sabidmahmud-paplens.hf.space/health`
- Click **Retry** in the header status badge to trigger a fresh probe.

### Hugging Face Space returns `503 Service Unavailable`

The Space is cold-starting after a sleep period. Wait 60–120 seconds and retry. If the Space
never becomes healthy, check the Space build logs at:
`https://huggingface.co/spaces/sabidmahmud/paplens`

### Flux reports `ReconciliationFailed`

```bash
flux get kustomizations
flux events --for Kustomization/paplens-prod
```

Common causes:
- The image tag in the overlay does not exist in GHCR.
- A required secret (`paplens-secrets`) has not been created in the `paplens` namespace.
- A manifest YAML syntax error — validate locally with `kustomize build deploy/k8s/overlays/prod`.
