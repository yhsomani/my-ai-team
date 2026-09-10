#!/bin/bash
set -e

NAMESPACE=${1:-default}
IMAGE_TAG=${2:-latest}
REGISTRY=${3:-ghcr.io}

echo "=== Deploying TalentSphere to Kubernetes ==="
echo "Namespace: $NAMESPACE"
echo "Image Tag: $IMAGE_TAG"

# Create namespace if it doesn't exist
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Apply Kustomize manifests
echo "Applying Kustomize resources (infrastructure, microservices, cronjobs)..."
kubectl apply -k infra/k8s/overlays/prod -n "$NAMESPACE"

# Wait for deployment
echo "Waiting for backend deployment..."
kubectl rollout status deployment/talentsphere-backend -n "$NAMESPACE" --timeout=300s

# Show status
echo ""
echo "=== Deployment Status ==="
kubectl get pods -n "$NAMESPACE"
kubectl get svc -n "$NAMESPACE"
kubectl get ingress -n "$NAMESPACE"

echo ""
echo "=== Backend Logs ==="
kubectl logs -l app=talentsphere-backend -n "$NAMESPACE" --tail=20

echo ""
echo "=== Deployment Complete ==="
echo "Access the application at: http://talentsphere.local"
