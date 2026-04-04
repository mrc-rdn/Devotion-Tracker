# AGENTS.md — Devotion Tracker System

> **Purpose**: Production-ready AI assistant rules for the Devotion Tracker System
> **Architecture**: Modern Fullstack JAMStack / BaaS (React + Supabase + Tailwind CSS)
> **Roles**: member, leader, admin

---

## 1. Project Overview

The **Devotion Tracker System** is a web application that enables users to track daily devotion journal submissions through a calendar-based interface with role-based dashboards.

### Architecture
- **Frontend**: React SPA (Vite) with Tailwind CSS
- **Backend**: Supabase (BaaS) — PostgreSQL, Auth, Storage, Realtime
- **State Management**: React Context + custom hooks
- **Realtime**: Supabase Realtime subscriptions for messaging
- **Scale**: Small-to-medium (church groups, organizations)

### Key Constraints
- **Server-time integrity**: All devotion dates use Supabase server timestamp; client time is never trusted
- **Data isolation**: Strict RLS policies prevent cross-group data leakage
- **Role-based access**: member → own data only; leader → group data; admin → full access

---

## 2. Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool & dev server |
| Tailwind CSS | 3.x | Styling |
| @supabase/supabase-js | 2.x | Supabase client |
| React Router DOM | 6.x | Routing |
| React Hook Form | 7.x | Form management |
| Zod | 3.x | Schema validation |
| date-fns | 2.x or 3.x | Date utilities |
| Jest | 29.x | Unit testing |
| @testing-library/react | 14.x | Component testing |

### Runtime
- Node.js >= 18.0.0
- npm >= 9.0.0

---

## 3. Setup Commands

```bash
# Clone & install
git clone <repo-url>
cd devotion-tracker
npm install

# Environment setup
cp .env.example .env
# Fill in:
# VITE_SUPABASE_URL=your-project-url
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase setup (run in Supabase SQL Editor)
# Execute schema.sql provided in /supabase/ directory

# Start dev server
npm run dev
# → http://localhost:5173
```

### Environment Variables
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Dummy Accounts (for testing)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@devotion.test | Test1234! |
| Leader | leader@devotion.test | Test1234! |
| Member | member@devotion.test | Test1234! |

---

## 4. Build Commands

```bash
# Fast type-check & lint (file-scoped)
npm run lint              # ~5s

# Full production build
npm run build             # ~15-30s
# Output: dist/

# Preview production build
npm run preview

# Run tests
npm test                  # all tests
npm test -- --coverage    # with coverage
npm test -- path/to/file  # single file
```

---

## 5. Code Style

### Language Rules
- **JavaScript** (no TypeScript in this phase)
- Use ES modules (`import`/`export`), never CommonJS
- Strict mode enabled in `vite.config.js`

### Naming Conventions
| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `DevotionCalendar.jsx` |
| Hooks | camelCase, prefix `use` | `useDevotions.js` |
| Utilities | camelCase | `formatDate.js` |
| Constants | UPPER_SNAKE_CASE | `ROLES.js` |
| Files | Match component name | `MemberDashboard.jsx` |

### React Rules
```javascript
// ✅ DO: Functional components with hooks
export function DevotionCalendar({ month, year }) {
  const { devotions } = useDevotions();
  // ...
}

// ❌ DON'T: Class components
// ❌ DON'T: Default exports (use named exports)
// ❌ DON'T: Inline styles (use Tailwind classes)
```

### Tailwind Rules
- Use Tailwind utility classes exclusively
- Avoid `@apply` unless a pattern repeats 3+ times
- Mobile-first responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Use semantic color tokens from `tailwind.config.js`

### Import Order
```javascript
// 1. External libraries
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// 2. Internal modules (aliases: @/ = src/)
import { useDevotions } from '@/hooks/useDevotions';
import { formatDate } from '@/utils/formatDate';

// 3. Components
import { CalendarGrid } from '@/components/CalendarGrid';
```

---

## 6. Project Structure

```
devotion-tracker/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/              # Images, icons, fonts
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Base UI (Button, Input, Modal)
│   │   ├── calendar/        # Calendar-related components
│   │   ├── auth/            # Login, Signup forms
│   │   └── chat/            # Messaging components
│   ├── contexts/            # React Context providers
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   ├── hooks/               # Custom hooks
│   │   ├── useDevotions.js
│   │   ├── useMessages.js
│   │   └── useServerTime.js
│   ├── layouts/             # Page layouts
│   │   ├── AuthLayout.jsx
│   │   ├── DashboardLayout.jsx
│   │   └── AdminLayout.jsx
│   ├── lib/                 # Library configurations
│   │   └── supabase.js
│   ├── pages/               # Route-level components
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── MemberDashboard.jsx
│   │   ├── LeaderDashboard.jsx
│   │   └── AdminDashboard.jsx
│   ├── routes/              # Route definitions
│   │   └── index.jsx
│   ├── services/            # API/Supabase service functions
│   │   ├── auth.service.js
│   │   ├── devotions.service.js
│   │   └── messages.service.js
│   ├── utils/               # Pure utility functions
│   │   ├── validation.js
│   │   └── formatDate.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css            # Tailwind directives
├── supabase/
│   └── schema.sql           # Full database schema + RLS
├── .env.example
├── .eslintrc.cjs
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── AGENTS.md                # ← You are here
```

### Architecture Patterns
- **Pages**: Route-level components, own data fetching
- **Services**: Thin Supabase wrappers (CRUD functions)
- **Hooks**: State logic, reusable across pages
- **Components**: Pure UI, receive data via props

---

## 7. Testing

### Framework
- Jest + React Testing Library
- Configured via `jest.config.js`

### Commands
```bash
npm test                    # watch mode
npm test -- --coverage      # generate coverage report
```

### Coverage Requirements
- **Statements**: ≥ 70%
- **Branches**: ≥ 60%
- **Functions**: ≥ 70%

### Test Patterns
```javascript
// ✅ DO: Test user behavior, not implementation
test('submits devotion and shows success message', async () => {
  render(<DevotionUpload />);
  await userEvent.upload(fileInput, testFile);
  await userEvent.click(submitButton);
  expect(await screen.findByText('Devotion saved!')).toBeInTheDocument();
});

// ✅ DO: Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null, data: {} }),
      select: jest.fn().mockResolvedValue({ error: null, data: [] }),
    })),
  },
}));

// ❌ DON'T: Test internal state
// ❌ DON'T: Skip error path testing
```

---

## 8. Security

### Authentication
- Supabase Auth (email/password)
- Sessions managed via Supabase; do not implement custom auth
- Auto-redirect after login based on user role

### Input Validation
- Client-side: Zod schemas in `src/utils/validation.js`
- Server-side: Supabase table constraints + RLS policies
- Never trust client-provided dates for devotions

### Secrets Management
```javascript
// ✅ DO: Use environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// ❌ DON'T: Hardcode secrets
// ❌ DON'T: Commit .env files
```

### RLS Enforcement
All tables **MUST** have RLS policies. No exceptions.

```sql
-- Example: devotions table RLS
CREATE POLICY "Users can view own devotions"
  ON devotions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Leaders can view group devotions"
  ON devotions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'leader'
        AND profiles.group_id = devotions.group_id
    )
  );
```

### Critical Rules
1. **Never bypass RLS** in application code
2. **Always validate role** before rendering role-specific UI
3. **Server-time only**: Use `NOW()` or Supabase RPC for devotion_date
4. **No client-side date manipulation** for devotion submissions

---

## 9. Git Workflow

### Branch Naming
```
feature/<description>     # feature/member-dashboard
fix/<description>         # fix/login-redirect
refactor/<description>    # refactor/devotions-service
docs/<description>        # docs/setup-instructions
```

### Commit Message Format
```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: auth, dashboard, devotions, messaging, ui, db

Examples:
feat(auth): add signup form with role selection
fix(devotions): use server timestamp for devotion_date
docs(readme): update setup instructions
```

### PR Requirements
- All tests passing
- Lint checks clean (`npm run lint`)
- At least 1 reviewer approval
- Squash merge to main

### Protected Branches
- `main` — production-ready, never push directly

---

## 10. Safety & Permissions

### AI Can Modify Without Asking
- UI component styling (Tailwind classes)
- Adding utility functions
- Writing tests for existing code
- Refactoring within a single file
- Fixing typos, formatting, comments

### AI MUST Ask Before Modifying
- **Database schema** (tables, columns, RLS policies)
- **Authentication logic** (login, signup, session handling)
- **Environment variables** or `.env` structure
- **API endpoints** or service layer signatures
- **Routing configuration**
- **Deleting any file**
- **Changing project dependencies** (package.json)
- **Security-related code**

### Boundaries for Automated Code
- Never generate code that bypasses RLS
- Never hardcode credentials or secrets
- Never remove validation or error handling
- Never introduce client-side time for devotion_date
- Always preserve existing functionality when refactoring

---

## 11. Performance

### Optimization Guidelines
1. **Lazy loading**: Route-level code splitting with `React.lazy()`
2. **Image handling**: Compress uploads before Supabase Storage (max 2MB)
3. **Queries**: Select only needed columns; avoid `SELECT *`
4. **Realtime**: Unsubscribe on component unmount
5. **Memoization**: Use `useMemo`/`useCallback` for expensive computations
6. **Pagination**: Leaderboards and message lists must paginate (max 50 items)

### Specific Targets
- Initial load: < 3s on 3G
- Time to interactive: < 5s
- Lighthouse performance score: ≥ 80
- Bundle size: < 500KB gzipped

### Patterns
```javascript
// ✅ DO: Lazy load routes
const MemberDashboard = React.lazy(() => import('@/pages/MemberDashboard'));

// ✅ DO: Cleanup realtime subscriptions
useEffect(() => {
  const subscription = supabase.channel('messages').on(...).subscribe();
  return () => supabase.removeChannel(subscription);
}, []);

// ❌ DON'T: Fetch all messages at once
// ❌ DON'T: Load all dashboard data in parallel on mount
```

---

## 12. When Stuck

### Before Asking
1. Check Supabase logs for database errors
2. Check browser console for client errors
3. Review this AGENTS.md for relevant rules
4. Search existing code for similar patterns

### When to Ask Questions
- **Unclear requirements**: If feature scope is ambiguous
- **Conflicting constraints**: e.g., performance vs. feature completeness
- **Security decisions**: Always escalate to human review
- **Schema changes**: Before adding/modifying tables or RLS policies
- **Breaking changes**: Anything that affects existing functionality

### Debugging Approach
```
1. Reproduce the issue consistently
2. Check error messages (browser console, Supabase logs)
3. Isolate the failing component/service
4. Verify Supabase connection and credentials
5. Test RLS policies directly in Supabase SQL editor
6. Add console.log strategically (remove after debugging)
```

### Assumptions to Avoid
- Don't assume client time is accurate
- Don assume RLS is enabled without verifying
- Don't assume user roles are validated on every request
- Don't assume group_id is set for all users

---

## Quick Reference

### Role Routing
| Role | After Login |
|------|------------|
| member | `/member/dashboard` |
| leader | `/leader/dashboard` |
| admin | `/admin/dashboard` |

### Key Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User info, role, group assignment |
| `devotions` | Devotion submissions with server timestamp |
| `messages` | Real-time chat messages |
| `groups` | Group definitions for leaders/members |

### Supabase Client Usage
```javascript
import { supabase } from '@/lib/supabase';

// Always handle errors
const { data, error } = await supabase.from('devotions').select('*');
if (error) {
  console.error('Failed to fetch devotions:', error.message);
  return;
}
```

---

> **Last Updated**: 2026-04-03
> **Maintained By**: Development team
> **Review Cadence**: Update with each major feature addition
