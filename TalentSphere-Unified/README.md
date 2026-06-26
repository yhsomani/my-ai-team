# TalentSphere - Unified Platform

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm
- Supabase account (free tier works)

### Setup Steps

1. **Clone & Install**
```bash
cd TalentSphere-Unified
npm install
```

2. **Configure Supabase**
   - Create `.env` file in `apps/frontend/`
   - Add your Supabase credentials:
     ```env
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```

3. **Initialize Database**
   - Run `supabase-schema.sql` in Supabase SQL Editor
   - Run `seed-data.sql` for test data (optional)

4. **Start Development**
```bash
npm run dev
```

## 📚 Documentation

### Current Planning Documentation
- **docs/ARCHITECTURE_STATUS_INDEX.md** - Current architecture status, document precedence, and open architecture decisions.
- **docs/COMPREHENSIVE_PRODUCT_UX_TECHNICAL_ANALYSIS_2026-06-26.md** - Product, UX, workflow, automation, technical roadmap, and implementation backlog.
- **docs/FEATURES_AND_DASHBOARDS.md** - Current feature inventory, routes, workflows, data sources, role access, and UI behavior.
- **docs/API_CONTRACT_MISMATCH_REPORT.md** - Generated frontend/backend/gateway/security route inventory.
- **docs/PRODUCT_UX_AUTOMATION_AUDIT.md** - Running UX audit and implementation history.
- **SEED_DATA_GUIDE.md** - Test data seeding guide.

### Historical Documentation
- **SSOT.md** - Historical consolidated architecture reference. It contains stale completion claims; check `docs/ARCHITECTURE_STATUS_INDEX.md` first.
- **docs/ARCHITECTURE_AUDIT.md**, **docs/SERVICE_MIGRATION.md**, **docs/ARCHITECTURE_MIGRATION.md**, **docs/ARCHITECTURE_PROPOSAL.md**, and **docs/unified-rebuild-roadmap.md** - Historical risk assessments, migration trackers, proposals, or alternative roadmaps.

### Database
- **supabase-schema.sql** (34KB) - Complete database schema with RLS policies
- **seed-data.sql** (35KB) - Comprehensive test data for E2E testing

## ✨ Features

- 🔐 **Authentication** - Supabase Auth with email & OAuth
- 👤 **Profiles** - Complete talent profiles with skills, experience, portfolio
- 💼 **Jobs** - Job board with applications tracking
- 🤝 **Networking** - Connections, feed posts, comments, likes
- 💬 **Messaging** - Real-time conversations
- 🎓 **LMS** - Courses, lessons, progress tracking
- 🏆 **Gamification** - Badges, XP, leaderboard
- 💳 **Payments** - Subscription management
- 📊 **Admin Dashboard** - Platform oversight

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Backend/data**: Supabase for many product workflows, plus Spring service modules and API Gateway for backend-owned or fallback paths
- **State**: Redux Toolkit, React Query
- **Testing**: Vitest, Playwright
- **Deployment**: Ready for Vercel/Netlify

## 📦 Project Structure

```
TalentSphere-Unified/
├── apps/frontend/          # React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # Supabase data layer
│   │   ├── store/          # Redux Toolkit setup
│   │   ├── lib/            # Utilities & Supabase client
│   │   └── types/          # TypeScript interfaces
│   └── .env                # Environment variables
├── supabase-schema.sql     # Database schema
├── seed-data.sql           # Test data
└── docs/ARCHITECTURE_STATUS_INDEX.md # Current architecture status entry point
```

## 🧪 Testing

To run the unit test suite via Vitest:
```bash
cd TalentSphere-Unified
npm run test:unit
```

Test users (after running seed-data.sql):
- `alice.dev@talentsphere.test` / `password123` (Developer)
- `bob.recruiter@talentsphere.test` / `password123` (Recruiter)
- `carol.student@talentsphere.test` / `password123` (Student)
- `david.power@talentsphere.test` / `password123` (Power User)
- `eve.admin@talentsphere.test` / `password123` (Admin)

## 📄 License

MIT
