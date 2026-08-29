#!/bin/bash
set -e

NAMESPACE=${1:-default}

echo "=== Tearing Down TalentSphere from Kubernetes ==="
echo "Namespace: $NAMESPACE"

# Delete Kustomize resources
echo "Deleting Kustomize resources..."
kubectl delete -k infra/k8s/overlays/prod -n "$NAMESPACE" --ignore-not-found

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
