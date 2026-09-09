# Local Supabase Setup Guide (15 Minutes)

> Documentation status: Current local development and Supabase setup guide.

## Quick Start

This guide will get your TalentSphere frontend running locally with a real PostgreSQL database in under 15 minutes.

## Option A: Using Docker Compose (Recommended)

### Step 1: Create Environment Files

**Root `.env` file:**
```bash
cd /workspace/TalentSphere-Unified
cp .env.example .env
```

Edit `.env` with these values for local development:
```env
# Local PostgreSQL (via Docker)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=localdev123
POSTGRES_HOST=postgres

# MongoDB
MONGO_USER=admin
MONGO_PASSWORD=change_this_password

# RabbitMQ
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=change_this_password

# Redis
REDIS_HOST=redis

# CORS
CORS_ORIGIN=http://localhost:5173

# Node Environment
NODE_ENV=development

# AWS S3 (optional - can use mock)
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
S3_BUCKET=test-bucket
```

**Frontend `.env` file:**
```bash
cd apps/frontend
cp .env.example .env.local
```

Edit `.env.local`:
```env
# For direct Supabase connection (if using Supabase cloud)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Storage Buckets
VITE_SUPABASE_STORAGE_BUCKET_AVATARS=avatars
VITE_SUPABASE_STORAGE_BUCKET_RESUMES=resumes
VITE_SUPABASE_STORAGE_BUCKET_LOGOS=company-logos

# App Configuration
VITE_APP_NAME=TalentSphere
VITE_APP_URL=http://localhost:5173

# API Gateway (for local backend services)
VITE_API_URL=http://localhost:8080
```

### Step 2: Initialize Database Schema

The schema is already in `supabase-schema.sql`. We'll apply it when PostgreSQL starts.

Create init script:
```bash
mkdir -p docker/init-db
cp supabase-schema.sql docker/init-db.sql
```

### Step 3: Start Infrastructure Services

Start only the database and essential services (not all 19 microservices):

```bash
# Start PostgreSQL only
docker-compose up -d postgres

# Wait for it to be ready (about 30 seconds)
docker-compose ps postgres
```

You should see:
```
NAME           STATUS
ts-postgres    Up (healthy)
```

### Step 4: Apply Database Schema

```bash
# Get the Postgres container name
CONTAINER_ID=$(docker ps --filter "name=ts-postgres" --format "{{.ID}}")

# Copy schema into container
docker cp supabase-schema.sql $CONTAINER_ID:/tmp/schema.sql

# Apply schema
docker exec -e PGPASSWORD=localdev123 ts-postgres psql -U postgres -d talentsphere -f /tmp/schema.sql
```

### Step 5: Seed Initial Data (Optional)

```bash
docker cp seed-data.sql $CONTAINER_ID:/tmp/seed.sql
docker exec -e PGPASSWORD=localdev123 ts-postgres psql -U postgres -d talentsphere -f /tmp/seed.sql
```

### Step 6: Start Frontend Only (Mock Mode)

For preview without backend services, we can run the frontend with mock data:

```bash
cd apps/frontend
npm install
npm run dev
```

Visit: http://localhost:5173

### Step 7: Full Stack (Optional)

To run all backend services:

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

Wait 2-3 minutes for all 19 services to start.

## Option B: Using Supabase CLI (Cloud Alternative)

If you want to use Supabase cloud instead of local PostgreSQL:

### Step 1: Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
curl -fsSL https://supabase.com/install.sh | bash

# Windows (PowerShell)
powershell -Command "iwr -useb https://supabase.com/install.ps1 | iex"
```

### Step 2: Login to Supabase

```bash
supabase login
```

This opens a browser for authentication.

### Step 3: Link Your Project

```bash
cd /workspace/TalentSphere-Unified
supabase link --project-ref YOUR_PROJECT_REF
```

Get your project ref from https://app.supabase.com

### Step 4: Push Schema

```bash
supabase db push
```

### Step 5: Get Credentials

From Supabase Dashboard:
1. Go to Settings → API
2. Copy `URL` (project URL)
3. Copy `anon public` key

Update `apps/frontend/.env.local`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 6: Start Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

## Verification

### Check PostgreSQL is Running

```bash
docker exec -e PGPASSWORD=localdev123 ts-postgres psql -U postgres -d talentsphere -c "\dt"
```

Should list all 49 tables.

### Check RLS Policies

```bash
docker exec -e PGPASSWORD=localdev123 ts-postgres psql -U postgres -d talentsphere -c "SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LIMIT 10;"
```

### Test Frontend Connection

1. Open http://localhost:5173
2. Try to register a new account
3. Check if user appears in database:

```bash
docker exec -e PGPASSWORD=localdev123 ts-postgres psql -U postgres -d talentsphere -c "SELECT id, email, role FROM auth_users LIMIT 5;"
```

## Troubleshooting

### Port Already in Use

If port 5432 or 5173 is already in use:

```bash
# Find what's using the port
lsof -i :5432
lsof -i :5173

# Stop the process or change port in docker-compose.yml
```

### Database Not Starting

Check logs:
```bash
docker-compose logs postgres
```

Common issues:
- Volume permissions: `chmod 777 /var/lib/postgresql/data`
- Port conflict: Change external port in docker-compose.yml

### Schema Apply Fails

Ensure PostgreSQL is healthy:
```bash
docker-compose ps postgres
```

Wait until status shows `(healthy)`.

### Frontend Can't Connect to Backend

Check API gateway:
```bash
docker-compose logs gateway
```

Verify nginx config:
```bash
cat docker/nginx/nginx.conf
```

## Architecture Note

**Important**: This project uses a **hybrid approach**:

1. **Direct Supabase Connection**: Frontend connects directly to Supabase for:
   - Authentication
   - Realtime updates
   - Row-level security enforced queries
   - File storage

2. **Backend Services**: 19 Spring Boot microservices for:
   - Complex business logic
   - External integrations
   - Background jobs
   - AI processing

For **local preview**, you can run:
- ✅ Frontend + Local PostgreSQL (this guide)
- ✅ Frontend + Supabase Cloud (Option B)
- ❌ Frontend alone (needs database)

For **full functionality**, you need:
- Frontend + PostgreSQL + All 19 microservices

## Next Steps

After setup:
1. Run frontend tests: `cd apps/frontend && npm test`
2. Run E2E tests: `cd apps/frontend && npx playwright test`
3. Explore features at http://localhost:5173

## Quick Commands Reference

```bash
# Start everything
docker-compose up -d

# Start only database
docker-compose up -d postgres

# View logs
docker-compose logs -f postgres
docker-compose logs -f frontend

# Stop everything
docker-compose down

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d postgres
# Re-apply schema

# Check service health
docker-compose ps

# Access database shell
docker exec -it ts-postgres psql -U postgres -d talentsphere
```

---

**Estimated Time**: 10-15 minutes
**Difficulty**: Beginner-friendly
**Requirements**: Docker Desktop or Docker Engine 20+
