# Quick Preview Guide (5 Minutes)

> Documentation status: Current quick preview and mock server setup guide.

## Fastest Way to See TalentSphere Running

This guide gets the frontend preview running in under 5 minutes **without requiring Supabase, Docker, or backend services**.

---

## Option 1: Mock Server + Frontend (RECOMMENDED - No Setup)

### Step 1: Install Dependencies (if not already done)

```bash
cd /workspace/TalentSphere-Unified/apps/frontend
npm install
```

### Step 2: Start Mock Server and Frontend Together

```bash
npm run dev:mock
```

This starts:
- **Mock API server** on http://localhost:3001
- **Frontend dev server** on http://localhost:3000

### Step 3: Open Your Browser

Visit: **http://localhost:3000**

### Demo Credentials

Use these to login:
- **Email:** `demo@talentsphere.dev`
- **Password:** `demo123`

Or register a new account (works instantly with mock data).

---

## What You Can Test

With the mock server, you can explore:

✅ **Authentication**
- Register new account
- Login/logout
- Session persistence

✅ **Dashboard**
- View stats
- Role-based content (Talent/Recruiter)

✅ **Job Marketplace**
- Browse jobs
- Search & filter
- View job details
- Apply to jobs (creates mock applications)

✅ **Learning (LMS)**
- Browse courses
- View course details
- Enroll (mock)

✅ **Skill Challenges**
- View challenges
- Submit solutions (mock evaluation)
- See results

✅ **Networking**
- View connections
- Send connection requests

✅ **Messaging**
- View conversations
- Send messages

✅ **Notifications**
- View notifications
- Mark as read

✅ **Profile**
- View/edit profile
- Update skills

❌ **What Doesn't Work**
- Real database persistence (resets on restart)
- File uploads (avatars, resumes)
- Real-time updates (websockets)
- External AI services
- Payment processing (demo mode anyway)

---

## Option 2: Frontend Only (Read-Only Mode)

If you just want to see the UI without any API:

### Step 1: Create Minimal .env.local

```bash
cd /workspace/TalentSphere-Unified/apps/frontend
cat > .env.local << EOF
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-key
VITE_APP_NAME=TalentSphere
VITE_APP_URL=http://localhost:3000
EOF
```

### Step 2: Start Frontend

```bash
npm run dev
```

### Step 3: Visit http://localhost:3000

The app will use **local mock data fallbacks** for everything.

---

## Option 3: Full Stack with Local PostgreSQL

For complete functionality including real database:

👉 See **LOCAL_SETUP_GUIDE.md** in the root directory.

Estimated time: 15 minutes

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process (replace PID with actual number)
kill -9 <PID>

# Or change port in package.json dev script
```

### Port 3001 Already in Use

```bash
# Change mock server port
export MOCK_PORT=3002
npm run mock-server
```

### npm install Fails

```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm install
```

### Mock Server Not Starting

```bash
# Check Node.js version (need 18+)
node --version

# Make script executable
chmod +x scripts/mock-server.js

# Run directly to see errors
node scripts/mock-server.js
```

### Frontend Shows "Failed to Fetch"

The mock server might not be running. Start it:

```bash
npm run mock-server
```

Then refresh the browser.

---

## Architecture Note

**This is a development preview only.**

The mock server provides:
- In-memory data (lost on restart)
- Simplified business logic
- No security enforcement
- No external integrations

For production or serious testing, use:
- **Option A:** Local Supabase (LOCAL_SETUP_GUIDE.md)
- **Option B:** Supabase Cloud
- **Option C:** Full Docker Compose stack

---

## Quick Commands Reference

```bash
# Start mock server only
npm run mock-server

# Start frontend only
npm run dev

# Start both together
npm run dev:mock

# Run unit tests
npm run test:unit

# Run E2E tests (requires Playwright browsers)
npm run test:e2e

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Next Steps After Preview

1. **Explore the UI**: Click around, test different features
2. **Check Tests**: `npm run test:unit` to verify components
3. **Read Code**: Explore `src/pages/` for feature implementations
4. **Full Setup**: Follow LOCAL_SETUP_GUIDE.md for complete stack

---

**Estimated Time:** 3-5 minutes  
**Difficulty:** Beginner  
**Requirements:** Node.js 18+, npm/pnpm

**No Docker, No Database, No Supabase Account Required!**
