# TalentSphere - Unified Platform

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works)
- Java 21+ (for backend services)
- Maven 3.9+ (for building services)

### ⚠️ Current Status

**Status:** 🟡 IN PROGRESS (Infrastructure Recovery Phase)

The platform is currently undergoing infrastructure recovery. See [SSOT.md](./SSOT.md#appendix-g-current-issues--todo-tracker) for detailed issue tracking and remediation plans.

**Known Issues:**
- Supabase connection configuration needs updating
- Docker environment setup required for backend services
- LMS service architectural alignment in progress

### Setup Steps

1. **Clone & Install**
```bash
cd /workspace/TalentSphere-Unified/apps/frontend
npm install
```

2. **Configure Supabase**
   - Create `.env` file in `apps/frontend/`
   - Add your Supabase credentials (see `SUPABASE_SETUP_INSTRUCTIONS.md`)
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Initialize Database**
   - Run `supabase-schema.sql` in Supabase SQL Editor
   - Run `seed-data.sql` for test data (optional)

4. **Start Development**
```bash
npm run dev
```

## 📚 Documentation

### Core Documentation
- **[SSOT.md](./SSOT.md)** - Single Source of Truth (Architecture, Status, Roadmap, Issues)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview
- **[AUDIT_REPORT.md](./AUDIT_REPORT.md)** - Latest system audit findings
- **[ISSUES.md](./ISSUES.md)** - Issue tracker with resolution status
- **[SUPABASE_SETUP_INSTRUCTIONS.md](./SUPABASE_SETUP_INSTRUCTIONS.md)** - Detailed Supabase setup steps

### Database
- **[supabase-schema.sql](./supabase-schema.sql)** - Complete database schema with RLS policies
- **[seed-data.sql](./seed-data.sql)** - Comprehensive test data for E2E testing
- **[SEED_DATA_GUIDE.md](./SEED_DATA_GUIDE.md)** - Guide to test data seeding

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
- 🤖 **AI Assistant** - Career guidance and resume analysis

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19, TypeScript
- **Build Tool**: Vite 8.x
- **Styling**: Tailwind CSS 4.x, Shadcn UI
- **State Management**: Redux Toolkit, React Query
- **Routing**: React Router 6.23+
- **Animations**: Framer Motion 11.18+

### Backend
- **Runtime**: Java 25
- **Framework**: Spring Boot 3.5.0, Spring Cloud
- **Architecture**: 19 Microservices with per-service databases
- **Messaging**: RabbitMQ 3.13 (Event-driven, Outbox Pattern)
- **Security**: JWT, JWKS, RBAC, Rate Limiting

### Data Stores
- **Primary**: PostgreSQL 16 (via Supabase)
- **Document**: MongoDB 8.2.7
- **Cache**: Redis 7
- **Search**: Elasticsearch 8.15

### Infrastructure
- **Containerization**: Docker, Kubernetes
- **API Gateway**: Nginx, Spring Cloud Gateway
- **Observability**: OpenTelemetry, Prometheus, Grafana
- **CI/CD**: GitHub Actions

## 📦 Project Structure

```
TalentSphere-Unified/
├── apps/
│   └── frontend/           # React application
│       ├── src/
│       │   ├── components/ # Reusable UI components
│       │   ├── pages/      # Page components
│       │   ├── services/   # API service layer
│       │   ├── store/      # Redux state management
│       │   ├── lib/        # Utilities & clients
│       │   └── types/      # TypeScript interfaces
│       └── .env            # Environment variables
├── services/               # Backend microservices (19)
│   ├── auth-service/
│   ├── user-service/
│   ├── job-service/
│   ├── lms-service/
│   └── ...
├── infra/                  # Infrastructure configs
│   ├── docker/             # Docker Compose files
│   └── k8s/                # Kubernetes manifests
├── docs/                   # Additional documentation
├── SSOT.md                 # Single Source of Truth
└── README.md               # This file
```

## 🧪 Testing

### Test Users (after running seed-data.sql)

| Email | Role | Password |
|-------|------|----------|
| `alice.dev@talentsphere.test` | Developer | `password123` |
| `bob.recruiter@talentsphere.test` | Recruiter | `password123` |
| `carol.student@talentsphere.test` | Student | `password123` |
| `david.power@talentsphere.test` | Power User | `password123` |
| `eve.admin@talentsphere.test` | Admin | `password123` |

### Running Tests

```bash
# Frontend tests
cd apps/frontend
npm run test

# Backend tests
./mvnw test
```

## 🚢 Deployment

See [SSOT.md - Appendix F: Deployment Guide](./SSOT.md#appendix-f-deployment-guide) for detailed deployment instructions.

## 📄 License

MIT

---

**For complete system documentation, see [SSOT.md](./SSOT.md)**
