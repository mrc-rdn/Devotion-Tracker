# Devotion Tracker System

A web application for tracking daily devotion journal submissions with role-based dashboards, calendar views, and real-time messaging.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- A Supabase project ([Create one at supabase.com](https://supabase.com))

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Run the SQL to create all tables, RLS policies, and functions

### 3. Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket called `devotions`
3. Set it to **Public** (so images can be viewed)
4. Add the following storage policies in SQL Editor:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload devotions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'devotions'
    AND auth.role() = 'authenticated'
  );

-- Allow public read access
CREATE POLICY "Anyone can view devotion images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'devotions');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own devotion images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'devotions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 4. Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these values in your Supabase dashboard under **Project Settings > API**.

### 5. Enable Email Auth (Optional)

If you want email verification:
1. Go to **Authentication > Providers > Email** in Supabase
2. Enable "Confirm email" if desired
3. Configure SMTP settings if using custom emails

For testing without email verification, disable "Confirm email".

### 6. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`.

---

## 🧪 Test with Dummy Accounts

### Create Test Accounts

Sign up through the app or create them via Supabase Auth:

| Role | Email | Password | Group |
|------|-------|----------|-------|
| Admin | admin@devotion.test | Test1234! | None |
| Leader | leader@devotion.test | Test1234! | Morning Glory Group |
| Member | member@devotion.test | Test1234! | Morning Glory Group |

### Assign Groups After Signup

After creating accounts, run this SQL in Supabase to assign groups:

```sql
-- Assign leader and member to Morning Glory Group
UPDATE profiles 
SET group_id = 'a1111111-1111-1111-1111-111111111111'
WHERE email IN ('leader@devotion.test', 'member@devotion.test');

-- Set leader role (if not set during signup)
UPDATE profiles 
SET role = 'leader' 
WHERE email = 'leader@devotion.test';
```

---

## 📁 Project Structure

```
devotion-tracker/
├── public/                    # Static assets
├── src/
│   ├── components/
│   │   ├── calendar/          # Devotion calendar component
│   │   └── ui/                # Reusable UI components
│   ├── contexts/              # React Context (Auth)
│   ├── hooks/                 # Custom hooks (useDevotions, useMessages)
│   ├── layouts/               # Page layouts (Auth, Dashboard)
│   ├── lib/                   # Supabase client, constants
│   ├── pages/                 # Route-level components
│   ├── services/              # Supabase service functions
│   ├── utils/                 # Utilities (validation, formatting)
│   ├── App.jsx                # Router & protected routes
│   └── main.jsx               # Entry point
├── supabase/
│   └── schema.sql             # Database schema + RLS
├── .env.example
├── package.json
└── vite.config.js
```

---

## 🛠️ Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## 🗄️ Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `groups` | Group definitions for leaders/members |
| `profiles` | User profiles linked to Supabase Auth |
| `devotions` | Devotion submissions with server timestamp |
| `messages` | Real-time chat messages |
| `friend_requests` | Pending friend requests |
| `friendships` | Established friendships |

### Key Features

- **Row Level Security (RLS)** on all tables
- **Server-time enforcement** for devotion dates (no client manipulation)
- **Automatic profile creation** on user signup via trigger
- **RPC function** `submit_devotion()` ensures devotion_date always uses server time

---

## 🔒 Security

### Authentication
- Supabase Auth (email/password)
- Automatic session management
- Protected routes based on authentication state

### Authorization
- **RLS Policies**: Every table has row-level security
- **Role-based access**: member → own data, leader → group data, admin → all
- **Data isolation**: No cross-group data leakage

### Time Integrity
- **devotion_date** is set by the database server (`NOW() AT TIME ZONE 'UTC'`)
- **RPC function** `submit_devotion()` prevents client-side date manipulation
- Users cannot backdate or fake submission dates

---

## 🏗️ Architecture

### Frontend
- **React 18** with functional components and hooks
- **React Router 6** for routing with role-based protection
- **React Hook Form + Zod** for form validation
- **Tailwind CSS** for responsive styling

### Backend
- **Supabase** as BaaS (Backend as a Service)
- **PostgreSQL** database with RLS
- **Supabase Realtime** for live messaging
- **Supabase Storage** for devotion images

---

## 📱 Features

### Member
- Dashboard with devotion stats (weekly/monthly/yearly)
- Calendar view with green (submitted) / red (missing) indicators
- Upload devotion images with server-time enforcement
- Group leaderboard
- Real-time messaging with friends

### Leader
- Group member progress dashboard
- Filter by member and time period
- View all group devotions
- Engagement rate tracking
- Real-time messaging

### Admin
- System-wide statistics
- User management (roles, group assignments)
- Group creation and management
- Full data access across all groups

---

## 🔧 Troubleshooting

### "Missing Supabase credentials"
Make sure `.env` file exists with valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### "Relation does not exist"
Run the `supabase/schema.sql` file in your Supabase SQL Editor.

### "Email not confirmed"
Disable email confirmation in Supabase Auth settings for testing, or check your email for the confirmation link.

### RLS errors
Verify that you're logged in. RLS policies require an authenticated session.

### Storage upload fails
Ensure the `devotions` bucket exists and is set to Public with the correct policies.

---

## 📄 License

MIT
