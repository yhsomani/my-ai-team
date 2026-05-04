# TalentSphere - Unified Platform

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works)

### Setup Steps

1. **Clone & Install**
```bash
cd /workspace/TalentSphere-Unified/apps/frontend
npm install
```

2. **Configure Supabase**
   - Create `.env` file in `apps/frontend/`
   - Add your Supabase credentials (see `SUPABASE_SETUP_INSTRUCTIONS.md`)

3. **Initialize Database**
   - Run `supabase-schema.sql` in Supabase SQL Editor
   - Run `seed-data.sql` for test data (optional)

4. **Start Development**
```bash
npm run dev
```

## 📚 Documentation

### Core Documentation
- **SSOT.md** - Single Source of Truth (Architecture, Status, Roadmap)
- **SUPABASE_SETUP_INSTRUCTIONS.md** - Detailed Supabase setup steps
- **SUPABASE_MIGRATION_COMPLETE.md** - Migration summary and architecture changes
- **SEED_DATA_GUIDE.md** - Comprehensive guide to test data seeding

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
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **State**: Redux Toolkit, React Query
- **Deployment**: Ready for Vercel/Netlify

## 📦 Project Structure

```
TalentSphere-Unified/
├── apps/frontend/          # React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # Supabase data layer
│   │   ├── lib/            # Utilities & Supabase client
│   │   └── types/          # TypeScript interfaces
│   └── .env                # Environment variables
├── supabase-schema.sql     # Database schema
├── seed-data.sql           # Test data
└── docs/                   # Additional documentation
```

## 🧪 Testing

Test users (after running seed-data.sql):
- `alice.dev@talentsphere.test` / `password123` (Developer)
- `bob.recruiter@talentsphere.test` / `password123` (Recruiter)
- `carol.student@talentsphere.test` / `password123` (Student)
- `david.power@talentsphere.test` / `password123` (Power User)
- `eve.admin@talentsphere.test` / `password123` (Admin)

## 📄 License

MIT
