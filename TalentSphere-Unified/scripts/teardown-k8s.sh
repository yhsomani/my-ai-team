#!/bin/bash
set -e

NAMESPACE=${1:-default}

echo "=== Tearing Down TalentSphere from Kubernetes ==="
echo "Namespace: $NAMESPACE"

# Delete in reverse order
echo "Deleting Ingress..."
kubectl delete -f infra/k8s/ingress.yaml -n "$NAMESPACE" --ignore-not-found

echo "Deleting HPA..."
kubectl delete -f infra/k8s/hpa.yaml -n "$NAMESPACE" --ignore-not-found

echo "Deleting PDB..."
kubectl delete -f infra/k8s/pdb.yaml -n "$NAMESPACE" --ignore-not-found

echo "Deleting Network Policies..."
kubectl delete -f infra/k8s/network-policy.yaml -n "$NAMESPACE" --ignore-not-found

echo "Deleting Backend Deployment..."
kubectl delete -f infra/k8s/backend-deployment.yaml -n "$NAMESPACE" --ignore-not-found

echo "Deleting RBAC..."
kubectl delete -f infra/k8s/service-accounts.yaml -n "$NAMESPACE" --ignore-not-found

echo "Deleting ResourceQuota..."
kubectl delete -f infra/k8s/resource-quota.yaml -n "$NAMESPACE" --ignore-not-found

echo "Deleting ConfigMap..."
kubectl delete -f infra/k8s/configmap.yaml -n "$NAMESPACE" --ignore-not-found

echo "Deleting Secrets..."
kubectl delete -f infra/k8s/secret.yaml -n "$NAMESPACE" --ignore-not-found

# Optionally delete namespace
if [ "$NAMESPACE" != "default" ]; then
  read -p "Delete namespace $NAMESPACE? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    kubectl delete namespace "$NAMESPACE"
  fi
fi

echo ""
echo "=== Teardown Complete ==="
