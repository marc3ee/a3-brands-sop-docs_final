# A3 Brands SOP Documentation Portal

An internal web application for the A3 Brands development team to read, manage, and maintain Standard Operating Procedures (SOPs) for building Model Landing Pages (MLPs) and City Pages for automotive dealerships.

---

## Features

- **Browse & Search SOPs** — full-text search across titles, descriptions, and tags; filter by category
- **Rich Content** — each SOP step supports formatted text, screenshots, code examples, warnings, and substeps via a WYSIWYG editor (TipTap)
- **Admin Dashboard** — create, edit, and delete SOPs with a collapsible step builder
- **Role-Based Access** — admin users can manage content; regular users have read-only access
- **Persistent Storage** — all data stored in Supabase (PostgreSQL)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| Rich Text | TipTap (ProseMirror) |
| Code Highlighting | Lowlight |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Root redirect (login or /sops)
│   ├── login/                    # Login page
│   ├── sops/
│   │   ├── page.tsx              # SOP listing with search & category filter
│   │   ├── [id]/page.tsx         # SOP detail view (by slug)
│   │   └── layout.tsx            # Auth guard + sidebar layout
│   ├── admin/
│   │   ├── page.tsx              # Admin dashboard (SOP table)
│   │   ├── edit/[id]/page.tsx    # Create / edit SOP form
│   │   └── layout.tsx            # Admin-only guard
│   ├── api/
│   │   ├── sops/route.ts         # GET all, POST new SOP
│   │   ├── sops/[id]/route.ts    # PUT update, DELETE SOP
│   │   └── categories/route.ts   # GET all, POST new category
│   ├── globals.css               # Tailwind + CSS theme variables
│   └── layout.tsx                # Root layout with context providers
├── components/
│   ├── Logo.tsx                  # A3 Brands SVG logo
│   ├── Sidebar.tsx               # Navigation sidebar
│   └── RichTextEditor.tsx        # TipTap WYSIWYG editor
├── contexts/
│   ├── AuthContext.tsx           # Auth state (login, logout, role)
│   └── SOPContext.tsx            # SOP + category data and CRUD
├── lib/
│   ├── supabase.ts               # Browser Supabase client (anon key)
│   └── supabase-server.ts        # Server Supabase client (service role key)
├── types/
│   └── database.ts               # TypeScript interfaces for DB types
├── data/
│   └── sops.ts                   # Default SOP seed content
├── scripts/
│   └── seed.ts                   # Database seed script
└── middleware.ts                 # Auth session refresh on each request
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/jerichopogi/a3-brands-sop-docs.git
cd a3-brands-sop-docs
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> The service role key is used **server-side only** (API routes) and is never exposed to the browser.

### 4. Set up the database

Run the schema in your Supabase SQL editor (`supabase/schema.sql`), then seed the initial data:

```bash
npm run seed
```

This creates the demo accounts and inserts the default categories and SOPs.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@a3brands.com | admin123 |
| Developer | dev@a3brands.com | dev123 |

Admins can create, edit, and delete SOPs. Developers have read-only access.

---

## Database Schema

### `categories`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | TEXT | Unique category name |
| `sort_order` | INT | Display order |

### `sops`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `slug` | TEXT | URL-friendly identifier (unique) |
| `title` | TEXT | SOP title |
| `category_id` | UUID | FK to categories |
| `description` | TEXT | Short summary |
| `version` | TEXT | Version string (e.g. `3.0`) |
| `tags` | TEXT[] | Searchable tags |
| `steps` | JSONB | Array of step objects |
| `last_updated` | DATE | Last edit date |

Each step in `steps` supports:

```ts
{
  title: string
  description: string
  substeps?: string[]
  notes?: string[]
  warning?: string
  codeExample?: string
  richContent?: string   // HTML from WYSIWYG editor
}
```

### `profiles`
Extends Supabase `auth.users`. Stores `display_name` and `role` (`admin` | `user`). Auto-created on signup via database trigger.

---

## API Routes

All API routes run server-side using the Supabase service role key, which bypasses Row Level Security (RLS) at the database level.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/sops` | Fetch all SOPs (with category name) |
| `POST` | `/api/sops` | Create a new SOP |
| `PUT` | `/api/sops/[id]` | Update an existing SOP |
| `DELETE` | `/api/sops/[id]` | Delete a SOP |
| `GET` | `/api/categories` | Fetch all categories |
| `POST` | `/api/categories` | Create a new category |

---

## Scripts

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run seed     # Seed the Supabase database
```

---

## Architecture Notes

**Server-side API routes for all DB mutations**
The Supabase service role key is kept strictly server-side. The browser client (anon key) is only used for auth session management via middleware. All data reads and writes go through `/api/*` routes.

**RLS is enabled on all tables**
Policies are defined in `supabase/schema.sql`. The API routes bypass RLS via the service role key, which is intentional for this internal-use app.

**Rich text is stored as HTML**
TipTap outputs HTML strings saved to the `richContent` field on each step. These are rendered directly in the SOP detail view.

**Slug-based routing**
SOPs are accessed via their slug (`/sops/introduction`) rather than their UUID, making URLs readable and shareable.
