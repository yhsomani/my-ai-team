# 🚀 TalentSphere Supabase Setup Instructions

## ✅ Your Supabase Project is Ready!

**Project URL**: `https://tvulrziizvakwzxfvdwv.supabase.co`
**Project ID**: `tvulrziizvakwzxfvdwv`

---

## 🔑 Step 1: Get Your API Keys

1. Go to your Supabase Dashboard: https://app.supabase.com/project/tvulrziizvakwzxfvdwv
2. Navigate to **Project Settings** → **API**
3. Copy the following values:
   - **Project URL**: `https://tvulrziizvakwzxfvdwv.supabase.co` (already known)
   - **anon/public key**: Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key** (secret): For server-side operations only

---

## 📝 Step 2: Update Environment Variables

### Frontend (.env file)

Edit `/workspace/TalentSphere-Unified/apps/frontend/.env`:

```bash
# Replace the placeholder ANON_KEY with your actual key from Supabase dashboard
VITE_SUPABASE_URL=https://tvulrziizvakwzxfvdwv.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ACTUAL_ANON_KEY_HERE

# Storage Buckets (optional)
VITE_SUPABASE_STORAGE_BUCKET_AVATARS=avatars
VITE_SUPABASE_STORAGE_BUCKET_RESUMES=resumes
VITE_SUPABASE_STORAGE_BUCKET_LOGOS=company-logos

# App Configuration
VITE_APP_NAME=TalentSphere
VITE_APP_URL=http://localhost:5173
```

### Root (.env file)

Edit `/workspace/TalentSphere-Unified/.env`:

```bash
# Supabase Configuration
SUPABASE_URL=https://tvulrziizvakwzxfvdwv.supabase.co
SUPABASE_ANON_KEY=YOUR_ACTUAL_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# Database Connection (for migrations)
DATABASE_URL=postgresql://postgres:[YOUR_DB_PASSWORD]@db.tvulrziizvakwzxfvdwv.supabase.co:5432/postgres
```

⚠️ **IMPORTANT**: 
- The database password you provided (`TalentSphere-Unified`) appears in the connection string
- Replace `[YOUR_DB_PASSWORD]` with your actual database password if different
- Never commit `.env` files to Git (they're in .gitignore)

---

## 🗄️ Step 3: Execute Database Schema

### Option A: Via Supabase Dashboard (Recommended)

1. Open SQL Editor: https://app.supabase.com/project/tvulrziizvakwzxfvdwv/sql
2. Click **New Query**
3. Copy the entire contents of `/workspace/TalentSphere-Unified/supabase-schema.sql`
4. Paste into the editor
5. Click **Run** (or press Ctrl+Enter)

This will create:
- ✅ 30+ tables with proper relationships
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Triggers for automatic updates
- ✅ Seed data (badges, system settings)

### Option B: Via Command Line (If network allows)

```bash
cd /workspace/TalentSphere-Unified
PGPASSWORD='YOUR_DB_PASSWORD' psql -h db.tvulrziizvakwzxfvdwv.supabase.co \
  -U postgres -d postgres -f supabase-schema.sql
```

---

## 🔐 Step 4: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable providers:
   - ✅ **Email** (enabled by default)
   - ✅ **Google** (optional - requires OAuth credentials)
   - ✅ **GitHub** (optional - requires OAuth credentials)

3. Configure URLs (**Authentication** → **URL Configuration**):
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: 
     - `http://localhost:5173/auth/callback`
     - `http://localhost:5173/dashboard`

---

## 📦 Step 5: Create Storage Buckets

1. Go to **Storage** in Supabase Dashboard
2. Create three buckets:

### Bucket 1: `avatars`
- Name: `avatars`
- Privacy: **Public**
- File size limit: 5MB
- Allowed MIME types: `image/*`

### Bucket 2: `resumes`
- Name: `resumes`
- Privacy: **Private**
- File size limit: 10MB
- Allowed MIME types: `application/pdf`

### Bucket 3: `company-logos`
- Name: `company-logos`
- Privacy: **Public**
- File size limit: 5MB
- Allowed MIME types: `image/*`

### Set RLS Policies for Storage

For each bucket, add these policies:

**avatars** (Public read, owner write):
```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- Allow authenticated users to upload their own avatar
CREATE POLICY "User Upload" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**resumes** (Private, owner only):
```sql
-- Allow owner to upload and view
CREATE POLICY "Owner Access" ON storage.objects FOR ALL 
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**company-logos** (Public read, recruiter write):
```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
-- Allow authenticated recruiters to upload
CREATE POLICY "Recruiter Upload" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');
```

---

## 🧪 Step 6: Test the Connection

### Test via Browser Console

1. Start the frontend: `npm run dev`
2. Open browser DevTools (F12)
3. Run this in console:

```javascript
// Test Supabase connection
const { data, error } = await supabase.from('system_settings').select('*').limit(1);
console.log('Connection test:', data, error);
```

If you see data without errors, you're connected! ✅

### Test via API

```bash
curl -X GET "https://tvulrziizvakwzxfvdwv.supabase.co/rest/v1/system_settings?limit=1" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Expected response: `[]` (empty array if no seed data yet) or settings data

---

## 🚀 Step 7: Run the Application

```bash
cd /workspace/TalentSphere-Unified/apps/frontend
npm install
npm run dev
```

The application will start on: http://localhost:5173

---

## ✅ Verification Checklist

After setup, verify these features:

### Authentication
- [ ] User can register with email
- [ ] User can login
- [ ] User can logout
- [ ] Password reset works
- [ ] Session persists on refresh

### Database
- [ ] All tables created successfully
- [ ] RLS policies are active
- [ ] Foreign key constraints work
- [ ] Indexes are created

### Profile
- [ ] View profile page
- [ ] Edit profile information
- [ ] Add skills
- [ ] Add work experience
- [ ] Add education
- [ ] Upload avatar

### Jobs
- [ ] Browse job listings
- [ ] Search/filter jobs
- [ ] View job details
- [ ] Apply to jobs
- [ ] View application status

### Networking
- [ ] Send connection requests
- [ ] Accept/reject requests
- [ ] View connections list
- [ ] Create feed posts

### Messaging
- [ ] Start new conversation
- [ ] Send messages
- [ ] Receive messages
- [ ] Mark as read

### LMS
- [ ] Browse courses
- [ ] Enroll in course
- [ ] View lessons
- [ ] Track progress

### Gamification
- [ ] View leaderboard
- [ ] Earn badges
- [ ] Track XP points

### Payments
- [ ] View subscription plans
- [ ] Subscribe to plan
- [ ] View billing history

---

## 🔧 Troubleshooting

### Error: "Invalid API key"
- Double-check your ANON_KEY in `.env`
- Ensure no extra spaces or quotes
- Restart the dev server after changing `.env`

### Error: "relation does not exist"
- Run the schema SQL in Supabase SQL Editor
- Verify table names match exactly (case-sensitive)

### Error: "permission denied for table"
- Check RLS policies are correctly configured
- Ensure user is authenticated before accessing protected tables

### Error: "Network is unreachable" (Direct DB connection)
- Supabase may block direct connections from certain networks
- Use the REST API or GraphQL instead
- Enable connection pooling in Supabase settings

### Storage upload fails
- Verify bucket exists and has correct permissions
- Check file size and MIME type restrictions
- Ensure RLS policies allow the operation

---

## 📚 Resources

- **Supabase Docs**: https://supabase.com/docs
- **Your Dashboard**: https://app.supabase.com/project/tvulrziizvakwzxfvdwv
- **SQL Editor**: https://app.supabase.com/project/tvulrziizvakwzxfvdwv/sql
- **API Docs**: https://tvulrziizvakwzxfvdwv.supabase.co/rest/v1/

---

## 🎉 You're All Set!

Once you've completed these steps, TalentSphere will be fully powered by Supabase with:
- ✅ PostgreSQL database
- ✅ Authentication system
- ✅ File storage
- ✅ Real-time capabilities
- ✅ Row-level security

**Next Steps:**
1. Complete all verification tests
2. Customize branding and UI
3. Add sample data for testing
4. Deploy to production hosting

Happy coding! 🚀
