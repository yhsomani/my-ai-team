---
description: Custom skill for OWASP scanning, secret detection, and vulnerability audit.
---
# Security Auditor Skill
Activates when a security scan or vulnerability audit is requested for the **TalentSphere** project.

## Instructions
1. Monitor for OWASP Top 10 vulnerabilities like SQL Injection, XSS, and broken access control.
2. Scan service files and `.env` for hardcoded secrets, API keys, or credentials.
3. Check for open ports and service endpoints in `docker-compose.yml` and `infra`.
4. Suggest security headers and best practices for Java and React/TypeScript.

## Constraints
- Focus only on the requested security scan.
- Prioritize high-risk vulnerabilities over others.
