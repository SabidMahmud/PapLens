# PapLens Deployment Guide

Dual-deployment production guide for PapLens: primary hosting on k3s via GitOps (Flux CD v2) with Cloudflare Tunnel ingress, paired with an automated fallback on Hugging Face Spaces (Docker SDK), and frontend client-side failover on Vercel.

---

## Deployment Sequence

Deploy components in the following strict order to prevent cross-origin resource sharing (CORS) rejections and service interruptions:

1. **Build and publish the backend container image to GHCR**
2. **Deploy the primary backend to k3s via Flux CD**
3. **Verify external HTTPS `/health` on the primary backend**
4. **Deploy the failsafe backend to Hugging Face Spaces**
5. **Set `ALLOWED_ORIGINS` on BOTH backends to include the Vercel URL**
6. **Deploy the Next.js frontend to Vercel**
7. **Test automated client-side failover by scaling the k3s Deployment to 0 replicas**

---

## Step 1: Build Image and Push to GHCR

The backend image is built from `backend/Dockerfile` using CPU-optimized PyTorch and runs as non-root user `appuser` (UID 1000).

You can trigger the automated GitHub Actions workflow (`.github/workflows/backend-image.yml`) by pushing to `main` with changes under `backend/`, or build and push manually:

```bash
# Log in to GitHub Container Registry
echo "$GHCR_TOKEN" | docker login ghcr.io -u <GITHUB_USERNAME> --password-stdin

# Build the production image
docker build -t ghcr.io/<GITHUB_USERNAME>/paplens-backend:latest \
             -t ghcr.io/<GITHUB_USERNAME>/paplens-backend:<GIT_COMMIT_SHA> \
             backend/

# Push tags to GHCR
docker push ghcr.io/<GITHUB_USERNAME>/paplens-backend:latest
docker push ghcr.io/<GITHUB_USERNAME>/paplens-backend:<GIT_COMMIT_SHA>
```

Update `deploy/k8s/overlays/prod/kustomization.yaml` with the newly published image tag:

```yaml
images:
  - name: ghcr.io/sabidmahmud/paplens-backend
    newTag: <GIT_COMMIT_SHA>
```

---

## Step 2: Deploy to k3s via Flux CD

### 2.1 Cluster Prerequisites

Ensure your k3s cluster is running and your kubeconfig is active:

```bash
kubectl cluster-info
```

### 2.2 Configure Kubernetes Secrets

The manifests reference two external secrets in namespace `paplens`:
- `cloudflare-tunnel-credentials`: contains `credentials.json` for Cloudflare Tunnel.
- `hf-token-secret`: contains the Hugging Face Hub access token for weight downloads.

Create them on the cluster:

```bash
# Create namespace
kubectl create namespace paplens --dry-run=client -o yaml | kubectl apply -f -

# Create Cloudflare Tunnel secret from credentials file
kubectl -n paplens create secret generic cloudflare-tunnel-credentials \
  --from-file=credentials.json=/path/to/credentials.json

# Create Hugging Face token secret
kubectl -n paplens create secret generic hf-token-secret \
  --from-literal=HF_TOKEN="<YOUR_HUGGINGFACE_TOKEN>"
```

### 2.3 Bootstrap Flux CD (If Not Already Bootstrapped)

If Flux CD v2 is not yet installed on your cluster:

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Check prerequisites
flux check --pre

# Bootstrap Flux against this repository
flux bootstrap github \
  --owner=<GITHUB_USERNAME> \
  --repository=PapLens \
  --branch=main \
  --path=./deploy/flux \
  --personal
```

### 2.4 Apply Flux GitOps Manifests

If Flux CD is already running, apply the GitRepository and Kustomization manifests:

```bash
kubectl apply -f deploy/flux/gitrepository.yaml
kubectl apply -f deploy/flux/kustomization.yaml

# Reconcile immediately
flux reconcile kustomization paplens --with-source
```

Alternatively, to inspect and apply directly via Kustomize:

```bash
kustomize build deploy/k8s/overlays/prod | kubectl apply -f -
```

---

## Step 3: Verify External HTTPS `/health`

Verify that the Cloudflare Tunnel routes traffic securely to the backend without exposing any inbound ports on your host:

```bash
# Replace with your configured tunnel public hostname
curl -i https://api-paplens.yourdomain.com/health
```

Expected response:
```http
HTTP/2 200
content-type: application/json

{"status":"ok","models_loaded":true,"available_models":["triage","severity"],"device":"cpu","torch_threads":4,"version":"1.0.0"}
```

Confirm that the response is served over HTTPS and that SSL/TLS certificates terminate properly.

---

## Step 4: Deploy Hugging Face Space (Failsafe Backend)

The Hugging Face Space uses the exact same `backend/Dockerfile` and codebase.

1. Create a new Space at [huggingface.co/new-space](https://huggingface.co/new-space):
   - Space Name: `paplens`
   - SDK: **Docker**
   - Hardware: **CPU Basic (Free)**
2. Add Space Secrets / Environment Variables in **Settings > Variables and secrets**:
   - `ALLOWED_ORIGINS`: Temporary value `http://localhost:3000` (will be updated with Vercel URL in Step 5).
   - `HF_REPO_ID`: Model weights repository ID on Hugging Face Hub (e.g. `<username>/paplens-weights`).
   - `HF_TOKEN`: Hugging Face Hub read token (if the weights repository is private).
3. Push the backend code to the Space repository:
   ```bash
   cd backend
   git remote add space https://huggingface.co/spaces/<HUGGINGFACE_USERNAME>/paplens
   git push space main
   ```
4. Verify the Space health once build succeeds:
   ```bash
   curl -i https://<HUGGINGFACE_USERNAME>-paplens.hf.space/health
   ```

---

## Step 5: Configure `ALLOWED_ORIGINS` on Both Backends

To allow the browser to make cross-origin requests directly from Vercel to both backends, update `ALLOWED_ORIGINS` on both environments with your production Vercel domain (e.g. `https://paplens.vercel.app`).

### On k3s:
Update `deploy/k8s/base/configmap.yaml`:
```yaml
data:
  ALLOWED_ORIGINS: "https://paplens.vercel.app,http://localhost:3000"
```
Commit and push, or apply:
```bash
kubectl apply -f deploy/k8s/base/configmap.yaml
kubectl rollout restart deployment/paplens-backend -n paplens
```

### On Hugging Face Space:
In Space **Settings > Variables and secrets**:
- Variable `ALLOWED_ORIGINS` = `https://paplens.vercel.app,http://localhost:3000`

---

## Step 6: Deploy Frontend to Vercel

1. Import the repository into Vercel and set the **Root Directory** to `frontend`.
2. Configure environment variables in the Vercel project settings:
   ```env
   NEXT_PUBLIC_API_URL_PRIMARY=https://api-paplens.yourdomain.com
   NEXT_PUBLIC_API_URL_FALLBACK=https://<HUGGINGFACE_USERNAME>-paplens.hf.space
   ```
3. Deploy. The Next.js App Router will compile static assets and communicate with the backends directly from the user's browser, bypassing Next.js API routes and Vercel payload limits.

---

## Step 7: Test Automated Client-Side Failover

The frontend client resolver in `frontend/src/lib/api.ts` implements automated failover:
- Probes `/health` on `PRIMARY` with a short 4-second timeout.
- If `PRIMARY` is unreachable or times out, immediately routes requests to `FALLBACK` with waking backoff.
- If a `/predict` inference call on the active target returns a network error or 5xx, retries once on the alternate backend.

### Verification Procedure:

1. **Verify Primary Operation:**  
   Open the deployed frontend in your browser. Verify the status indicator displays:  
   `Model Server Ready` and `Served by: k3s cluster`.  
   Submit a test slide and confirm inference completes on the primary backend.

2. **Simulate Primary Outage:**  
   Scale the k3s backend Deployment to 0 replicas:
   ```bash
   kubectl scale deployment/paplens-backend --replicas=0 -n paplens
   ```

3. **Verify Failover:**  
   Refresh the frontend browser page or perform a new inference.  
   - The status indicator updates to: `Served by: Hugging Face Spaces (fallback)`.  
   - Submit an image; the prediction completes successfully on the Hugging Face Space.

4. **Restore Primary Service:**  
   Scale the k3s Deployment back to 1 replica:
   ```bash
   kubectl scale deployment/paplens-backend --replicas=1 -n paplens
   kubectl rollout status deployment/paplens-backend -n paplens
   ```
   Reset session storage or open an incognito window: the frontend automatically connects back to the primary k3s cluster.
