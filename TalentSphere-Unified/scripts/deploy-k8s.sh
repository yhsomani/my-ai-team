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

# Apply manifests
echo "Applying ConfigMap..."
kubectl apply -f infra/k8s/configmap.yaml -n "$NAMESPACE"

echo "Applying Secrets..."
kubectl apply -f infra/k8s/secret.yaml -n "$NAMESPACE"

echo "Applying RBAC..."
kubectl apply -f infra/k8s/service-accounts.yaml -n "$NAMESPACE"

echo "Applying ResourceQuota..."
kubectl apply -f infra/k8s/resource-quota.yaml -n "$NAMESPACE"

echo "Applying Backend Deployment..."
kubectl apply -f infra/k8s/backend-deployment.yaml -n "$NAMESPACE"

echo "Applying Ingress..."
kubectl apply -f infra/k8s/ingress.yaml -n "$NAMESPACE"

echo "Applying HPA..."
kubectl apply -f infra/k8s/hpa.yaml -n "$NAMESPACE"

echo "Applying PDB..."
kubectl apply -f infra/k8s/pdb.yaml -n "$NAMESPACE"

echo "Applying Network Policies..."
kubectl apply -f infra/k8s/network-policy.yaml -n "$NAMESPACE"

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
