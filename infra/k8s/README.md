# Kubernetes Manifests (Production)

Not needed for local development — use `../docker-compose.yml` instead.

Add here once you're ready to deploy to a government-approved cloud
(NIC/MeghRaj empanelled provider or equivalent):

- `postgres-statefulset.yaml`
- `redis-deployment.yaml`
- `api-deployment.yaml` + `api-service.yaml`
- `ai-service-deployment.yaml`
- `dashboard-deployment.yaml`
- `ingress.yaml` (TLS termination, routing)

Copilot prompt starter once you get here:
"Generate Kubernetes manifests for a NestJS API, a FastAPI service, a
Postgres StatefulSet, and a Redis deployment, with an Ingress routing
/api to the NestJS service and /ai to the FastAPI service."
