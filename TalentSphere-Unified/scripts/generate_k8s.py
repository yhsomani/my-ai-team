import os
import yaml

services = [
    {"name": "api-gateway", "port": 8080},
    {"name": "auth-service", "port": 8081},
    {"name": "user-service", "port": 8082},
    {"name": "profile-service", "port": 8083},
    {"name": "job-service", "port": 8084},
    {"name": "lms-service", "port": 8085},
    {"name": "application-service", "port": 8086},
    {"name": "challenge-service", "port": 8087},
    {"name": "company-service", "port": 8088},
    {"name": "notification-service", "port": 8089},
    {"name": "search-service", "port": 8091},
    {"name": "gamification-service", "port": 8092},
    {"name": "messaging-service", "port": 8094},
    {"name": "networking-service", "port": 8095},
    {"name": "ai-service", "port": 8096},
    {"name": "chat-service", "port": 8097},
    {"name": "payment-service", "port": 8098},
    {"name": "file-service", "port": 8100}
]

output_dir = "infra/k8s/base/services"
os.makedirs(output_dir, exist_ok=True)

for svc in services:
    name = svc["name"]
    port = svc["port"]
    
    deployment = {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {
            "name": name,
            "labels": {"app": name}
        },
        "spec": {
            "replicas": 1,
            "selector": {
                "matchLabels": {"app": name}
            },
            "template": {
                "metadata": {
                    "labels": {"app": name}
                },
                "spec": {
                    "containers": [{
                        "name": name,
                        "image": f"talentsphere/{name}:latest",
                        "imagePullPolicy": "IfNotPresent",
                        "ports": [{"containerPort": port}],
                        "envFrom": [{"configMapRef": {"name": "talentsphere-config"}}],
                        "resources": {
                            "requests": {"memory": "256Mi", "cpu": "100m"},
                            "limits": {"memory": "512Mi", "cpu": "500m"}
                        },
                        "readinessProbe": {
                            "httpGet": {
                                "path": "/actuator/health",
                                "port": port
                            },
                            "initialDelaySeconds": 15,
                            "periodSeconds": 10
                        },
                        "livenessProbe": {
                            "httpGet": {
                                "path": "/actuator/health",
                                "port": port
                            },
                            "initialDelaySeconds": 15,
                            "periodSeconds": 10
                        }
                    }]
                }
            }
        }
    }
    
    service = {
        "apiVersion": "v1",
        "kind": "Service",
        "metadata": {
            "name": name,
            "labels": {"app": name}
        },
        "spec": {
            "selector": {"app": name},
            "ports": [{"port": port, "targetPort": port}]
        }
    }
    
    with open(os.path.join(output_dir, f"{name}.yaml"), "w") as f:
        yaml.dump_all([deployment, service], f, default_flow_style=False, sort_keys=False)

print(f"Generated {len(services)} K8s manifests in {output_dir}")
