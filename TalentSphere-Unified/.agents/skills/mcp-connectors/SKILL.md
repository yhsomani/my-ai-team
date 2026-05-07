---
description: Custom skill for connecting Supabase, SQL, and Git MCP servers.
---
# MCP Connectors Skill
Connects the **TalentSphere** project to SQL, Git, and external APIs using MCP servers.

## Instructions
1. Use the `supabase-mcp-server` for all SQL migrations and database queries.
2. Automatically check the health of configured MCP servers before starting database tasks.
3. Integrate cross-service knowledge from multiple MCP sources.

## Constraints
- Focus only on the requested MCP connections.
- Ensure all sensitive keys for MCP servers are kept in `.env` and not hardcoded.
- Never execute a destructive SQL command via an MCP server without a verbal "GO" from the user.
