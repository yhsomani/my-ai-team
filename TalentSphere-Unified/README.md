# TalentSphere - Unified Platform

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (required)
- Supabase account (free tier works)

### Setup Steps

1. **Clone & Install**
```bash
cd TalentSphere-Unified/apps/frontend
pnpm install
```

2. **Configure Supabase**
   - Create `.env` file in `apps/frontend/`
   - Add your Supabase credentials (see `SUPABASE_SETUP_INSTRUCTIONS.md` or `SSOT.md`):
     ```env
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```

3. **Initialize Database**
   - Run `supabase-schema.sql` in Supabase SQL Editor
   - Run `seed-data.sql` for test data (optional)

4. **Start Development**
```bash
pnpm run dev
```

## 📚 Documentation

### Core Documentation
- **SSOT.md** - Single Source of Truth (Architecture, Status, Roadmap). This contains *all* consolidated documentation.
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
└── SSOT.md                 # Master Architecture Document
```

## 🧪 Testing

To run the unit test suite via Vitest:
```bash
cd TalentSphere-Unified/apps/frontend
pnpm run test:unit
```

Test users (after running seed-data.sql):
- `alice.dev@talentsphere.test` / `password123` (Developer)
- `bob.recruiter@talentsphere.test` / `password123` (Recruiter)
- `carol.student@talentsphere.test` / `password123` (Student)
- `david.power@talentsphere.test` / `password123` (Power User)
- `eve.admin@talentsphere.test` / `password123` (Admin)

## 📄 License

MIT
