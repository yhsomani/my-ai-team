---
description: Custom skill for automatically generating Dockerfiles and infrastructure configs.
---
# Agent Containerizer Skill
Automatically generates Dockerfiles and container configurations for the **TalentSphere** microservices.

## Instructions
1. Monitor the `docker/` and `infra` directories for configuration changes.
2. Automatically generate a Dockerfile for any new microservice using standard templates.
3. Coordinate with `docker-compose.yml` to ensure new services are correctly added to the stack.
4. Review and optimize container configurations for development and production environments.

## Constraints
- Focus only on the requested containerization tasks.
- Prioritize standard templates over custom ones for consistency.
