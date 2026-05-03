# TalentSphere Supabase Migration Guide

## Overview

This project has been fully migrated to use **Supabase** as the sole backend and database provider. All previous backend services, API calls, and database connections have been replaced with direct Supabase queries.

---

## PHASE 1 — SETUP ✅

### Supabase Client Integration

The Supabase client is configured in `/apps/frontend/src/lib/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
```

### Package Dependencies

Supabase JS client is already installed:
```json
{
  "@supabase/supabase-js": "^2.103.0"
}
```

---

## PHASE 2 — DATABASE MIGRATION ✅

### Schema Location

The complete PostgreSQL schema is located at:
```
/workspace/TalentSphere-Unified/supabase-schema.sql
```

### Tables Created

| Table | Description |
|-------|-------------|
| `profiles` | Extended user auth data (linked to auth.users) |
| `user_profiles` | Detailed user profile information |
| `skills` | User skills with proficiency levels |
| `experiences` | Work experience history |
| `educations` | Educational background |
| `certifications` | Professional certifications |
| `languages` | Language proficiencies |
| `projects` | Personal projects portfolio |
| `companies` | Company/employer records |
| `jobs` | Job postings |
| `job_applications` | Job application tracking |
| `connections` | Professional networking connections |
| `conversations` | Messaging conversations |
| `conversation_participants` | Conversation membership |
| `messages` | Chat messages |
| `courses` | LMS course catalog |
| `lessons` | Course lessons |
| `enrollments` | Course enrollments |
| `lesson_progress` | Lesson completion tracking |
| `challenges` | Coding challenges |
| `challenge_submissions` | Challenge submissions |
| `leaderboard` | Gamification leaderboard |
| `badges` | Achievement badges |
| `user_badges` | User badge earnings |
| `xp_transactions` | XP point transactions |
| `notifications` | User notifications |
| `payments` | Payment transactions |
| `system_settings` | Platform configuration |
| `audit_log` | System audit trail |

### Setup Instructions

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Fill in your project details

2. **Run the Schema**
   - Navigate to **SQL Editor** in your Supabase dashboard
   - Copy the entire contents of `supabase-schema.sql`
   - Paste and run the script

3. **Configure Authentication**
   - Go to **Authentication** → **Providers**
   - Enable Email provider
   - Configure email templates if needed

4. **Set up Storage (Optional)**
   - Go to **Storage**
   - Create buckets for:
     - `avatars` - User profile pictures
     - `resumes` - Resume PDFs
     - `company-logos` - Company branding
     - `course-materials` - LMS content

---

## PHASE 3 — API & DATA FLOW UPDATE ✅

### Migrated Services

All services have been converted from REST API calls to Supabase queries:

| Service | Status | Location |
|---------|--------|----------|
| AuthService | ✅ Migrated | `/src/services/authService.ts` |
| ProfileService | ✅ Migrated | `/src/services/profileService.ts` |
| JobService | ✅ Migrated | `/src/services/jobService.ts` |
| CompanyService | ✅ Migrated | `/src/services/companyService.ts` |

### Removed Dependencies

- ❌ Removed: All `apiClient` axios calls to backend
- ❌ Removed: Backend Spring Boot service dependencies
- ✅ Using: Direct Supabase client queries

### Error Handling Pattern

All services follow this pattern:
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', id);

if (error) throw error;
return data;
```

---

## PHASE 4 — UI INTEGRATION ✅

### Connected Components

All UI components now connect directly to Supabase:

- **Auth Pages**: Login, Register, Password Reset
- **Profile Pages**: View/Edit profile, Skills, Experience, Education
- **Jobs Pages**: Browse, Search, Apply, Track Applications
- **Company Pages**: Company profiles, Job postings
- **Dashboard**: Real-time stats from database

### State Management

Components handle all required states:
- **Loading**: Show skeletons/spinners during queries
- **Success**: Display fetched data
- **Error**: Show error messages/toasts
- **Empty**: Display empty states when no data

---

## PHASE 5 — TESTING & VALIDATION

### Manual Testing Checklist

#### Authentication Flow
- [ ] User registration with email/password
- [ ] User login
- [ ] User logout
- [ ] Password reset
- [ ] Session persistence

#### Profile Management
- [ ] View own profile
- [ ] Edit profile information
- [ ] Add/remove skills
- [ ] Add work experience
- [ ] Add education
- [ ] Upload avatar (if storage configured)

#### Jobs
- [ ] Browse job listings
- [ ] Search jobs by location/title
- [ ] View job details
- [ ] Apply to jobs
- [ ] View application status
- [ ] Withdraw applications

#### Companies
- [ ] View company list
- [ ] View company details
- [ ] Create company (recruiters)
- [ ] Post jobs (recruiters)

---

## PHASE 6 — CONFIGURATION OUTPUT 🔧

### Environment Variables

Create a `.env` file in `/apps/frontend/`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For file uploads
VITE_SUPABASE_STORAGE_BUCKET_AVATARS=avatars
VITE_SUPABASE_STORAGE_BUCKET_RESUMES=resumes
VITE_SUPABASE_STORAGE_BUCKET_LOGOS=company-logos
```

### How to Get Your Credentials

1. **Log in to Supabase Dashboard**: https://supabase.com/dashboard

2. **Select Your Project**

3. **Navigate to Settings**
   - Click on **Project Settings** (gear icon in sidebar)
   - Select **API** from the settings menu

4. **Copy Your Credentials**
   - **Project URL**: Found under "Project URL" section
     - Example: `https://abcdefghijk.supabase.co`
   - **Anon/Public Key**: Found under "Project API keys" section
     - This is safe to use in browser code (RLS protects your data)

5. **Paste into .env file**

⚠️ **IMPORTANT**: 
- Never commit your `.env` file to version control
- The `.env` file should be in `.gitignore`
- Use environment variables in production deployments

---

## Row Level Security (RLS)

The schema includes comprehensive RLS policies:

### Default Policies Applied

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Everyone | - | Owner only | - |
| user_profiles | Everyone | Owner | Owner only | Owner only |
| skills | Everyone | Profile owner | Profile owner | Profile owner |
| jobs | Published only | Recruiters | Poster only | Poster only |
| job_applications | Owner only | Owner | Owner only | Owner only |
| companies | Everyone | Users | Owner only | Owner only |
| messages | Participants | Sender | - | Sender |
| courses | Published | Instructors | Instructor | Instructor |
| enrollments | Owner only | Owner | Owner only | - |

### Testing RLS

Test RLS policies using the Supabase SQL Editor:

```sql
-- Test as anonymous user
SET request.jwt.claims.sub = '00000000-0000-0000-0000-000000000000';

-- Test as authenticated user
SET request.jwt.claims.sub = 'your-user-uuid-here';
```

---

## Migration Summary

### Before (Spring Boot Backend)
```
Frontend → Axios → API Gateway → Microservices → PostgreSQL
```

### After (Supabase Only)
```
Frontend → Supabase Client → Supabase Backend → PostgreSQL
```

### Benefits

✅ **Single Source of Truth**: Supabase is the only backend
✅ **Real-time Ready**: Built-in subscriptions for live updates
✅ **Built-in Auth**: Complete authentication system
✅ **Row Level Security**: Database-level access control
✅ **Auto-generated APIs**: Instant REST and GraphQL endpoints
✅ **File Storage**: Integrated object storage
✅ **Edge Functions**: Serverless functions when needed

---

## Troubleshooting

### Common Issues

#### 1. "Invalid API key"
- Verify you're using the **anon/public** key, not the service role key
- Check for extra spaces in the .env file

#### 2. "Permission denied" errors
- Ensure RLS policies are correctly configured
- Verify the user is authenticated before making requests
- Check that the user owns the resource they're trying to access

#### 3. Data not appearing
- Verify the schema was created successfully
- Check that data is being inserted with correct foreign keys
- Ensure SELECT policies allow reading the data

#### 4. Authentication issues
- Confirm email confirmation is set up (or disabled for testing)
- Check browser console for auth state changes
- Verify the redirect URLs in Supabase auth settings

---

## Next Steps

1. **Set up your Supabase project** following the instructions above
2. **Add your credentials** to the `.env` file
3. **Run the schema** in the Supabase SQL Editor
4. **Test the application** locally with `npm run dev`
5. **Deploy** to your hosting platform with environment variables

---

## Support

For Supabase-specific issues:
- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub: https://github.com/supabase/supabase

For application-specific issues:
- Check the existing issue tracker
- Review the migration notes in this guide
