# Note Taking Application

## Project Structure

The project follows a modern Next.js application structure with a clear separation of concerns:

- **`/app`**: Contains the Next.js application routes and API endpoints
  - **`/(auth)`**: Authentication-related routes (login page)
  - **`/(public)`**: Public-facing routes (public note viewing)
  - **`/api`**: Backend API endpoints organized by resource (notes, users, auth)
  - **`page.tsx`**: Main application page (dashboard)
  - **`layout.tsx`**: Root layout component
  - **`providers.tsx`**: React context providers

- **`/components`**: Reusable React components
  - **`/ui`**: UI primitives from Shadcn UI library
  - Other components like `note-card.tsx`, `notes-grid.tsx`, etc.

- **`/hooks`**: Custom React hooks
  - `useNote.ts`: Note management logic
  - `useNoteDialog.ts`: Dialog state management
  - `usePublicComments.ts`: Comments functionality

- **`/lib`**: Utility functions and core services
  - `auth.ts`: Authentication configuration
  - `db.ts`: Database client setup
  - `session.ts`: Session management
  - `utils.ts`: General utility functions

- **`/prisma`**: Database schema and migrations
  - `schema.prisma`: Database schema definition
  - `seed.js`: Seed data for development

- **`/public`**: Static assets

- **`/service`**: Service layer for API interactions
  - `notes.ts`: Note-related API calls
  - `comments.ts`: Comment-related API calls
  - `users.ts`: User-related API calls

- **`/types`**: TypeScript type definitions

## Cara Mengkloning dan Menjalankan Aplikasi

### Prasyarat

- Node.js (versi 18 atau lebih baru)
- npm atau yarn
- PostgreSQL (versi 14 atau lebih baru)

### Langkah-langkah Instalasi

1. **Kloning repositori**

   ```bash
   git clone https://github.com/username/note-taking-app.git
   cd note-taking-app
   ```

2. **Instal dependensi**

   ```bash
   npm install
   # atau
   yarn install
   ```

3. **Konfigurasi database**

   Buat file `.env` di root proyek dengan konten berikut:

   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/note_taking_db"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

   Ganti `username`, `password`, dan nama database sesuai dengan konfigurasi PostgreSQL Anda.

4. **Jalankan migrasi database**

   ```bash
   npm run migrate
   # atau
   yarn migrate
   ```

5. **Isi database dengan data awal (opsional)**

   ```bash
   npm run seed
   # atau
   yarn seed
   ```

   Ini akan membuat beberapa pengguna demo dengan password `password123`:
   - Email: abdul@gmail.com (user utama)
   - Email: siti@gmail.com, budi@gmail.com, dll.

### Menjalankan Aplikasi

1. **Mode pengembangan**

   ```bash
   npm run dev
   # atau
   yarn dev
   ```

   Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000)

2. **Mode produksi**

   ```bash
   npm run build
   npm run start
   # atau
   yarn build
   yarn start
   ```

### Mengakses Aplikasi

1. Buka browser dan kunjungi [http://localhost:3000](http://localhost:3000)
2. Login menggunakan salah satu akun demo (jika menggunakan data seed)
   - Email: abdul@gmail.com
   - Password: password123

## Database Structure & Design Rationale

### Database Schema
![Database Schema](./public/erd.png)

The application uses PostgreSQL with Prisma ORM. The database schema includes:

### Models

1. **User**
   - Core user information (id, email, name, passwordHash, image)
   - Relationships: notes (owner), comments (author), collaborations

2. **Note**
   - Core note data (id, title, content, color)
   - Ownership and visibility (ownerId, isPublic)
   - Relationships: owner, collaborators, publicLink, comments

3. **NoteCollaborator**
   - Junction table for note sharing (noteId, userId, role)
   - Enables team collaboration with different permission levels

4. **NotePublicLink**
   - Public sharing mechanism (noteId, slug)
   - Enables public access to notes via friendly URLs

5. **Comment**
   - Discussion functionality (id, noteId, authorId, body)
   - Supports both private and public commenting

### Design Rationale

- **Relational Structure**: Chosen to maintain data integrity and enforce relationships between entities
- **Role-Based Access**: NoteRole enum (owner, editor, viewer) enables granular permission control
- **Flexible Sharing Model**: Supports three sharing modes:
  - Private: Only the owner can access
  - Team: Specific collaborators with defined roles
  - Public: Anyone with the link can view
- **Optimized Queries**: Strategic indexes on frequently queried fields (ownerId, isPublic)
- **Timestamps**: Automatic tracking of creation and update times for all entities

## Application Flow Process

1. **Authentication Flow**
   - User logs in via the login form using credentials
   - NextAuth.js handles authentication and session management
   - After successful login, user is redirected to the dashboard

2. **Dashboard (Home Page)**
   - Server-side fetches user's notes (owned and shared)
   - Client-side renders notes grid with infinite scrolling
   - User can create, edit, delete, and share notes

3. **Note Management**
   - Creating a note: Opens dialog, submits to API, updates UI
   - Editing a note: Opens dialog with existing data, submits changes
   - Deleting a note: Confirmation dialog, API call, UI update

4. **Sharing Process**
   - Owner can change sharing mode (private/team/public)
   - Team sharing: Search users, assign role, send invitation
   - Public sharing: Generate public link, copy to clipboard

5. **Public Note Viewing**
   - Anyone can access public notes via `/p/[slug]` route
   - Public notes display content and comments
   - Authenticated users can add comments

6. **Comment System**
   - Comments are fetched and displayed in reverse chronological order
   - Authenticated users can add comments to notes they can view
   - Real-time updates when adding new comments

## Usage of SSR, CSR, and SSG

### Server-Side Rendering (SSR)

- **Dashboard Page**: Uses SSR to fetch initial notes data
  - Benefits: Secure data fetching, SEO, faster initial load
  - Implementation: `getServerSession` in page.tsx to authenticate and fetch data

- **API Routes**: Server-side logic for data operations
  - Benefits: Secure data access, validation, database operations
  - Implementation: API handlers in `/app/api/` directory

### Client-Side Rendering (CSR)

- **Note Interactions**: Edit, delete, share operations
  - Benefits: Responsive UI, immediate feedback, reduced server load
  - Implementation: React hooks (useNote, useNoteDialog) and service layer

- **Infinite Scrolling**: Loading additional notes as user scrolls
  - Benefits: Better performance, loads data as needed
  - Implementation: IntersectionObserver in notes-grid.tsx

- **Comments**: Adding and displaying comments
  - Benefits: Dynamic updates without page refresh
  - Implementation: usePublicComments hook and service layer

### Static Site Generation (SSG) with ISR

- **Public Note Pages**: Uses Incremental Static Regeneration
  - Benefits: Fast page loads, reduced database queries, still relatively fresh content
  - Implementation: `export const revalidate = 60;` in public note page

## Libraries / Plugins Used

### Core Framework
- **Next.js (v15.4.6)**: React framework for SSR, CSR, and SSG
  - Chosen for its hybrid rendering capabilities and built-in API routes

### Authentication
- **NextAuth.js (v4.24.11)**: Authentication solution for Next.js
  - Provides secure, flexible authentication with minimal setup
- **bcrypt (v6.0.0)**: Password hashing library
  - Industry-standard secure password storage

### Database
- **Prisma (v6.13.0)**: Modern ORM for TypeScript
  - Type-safe database access, migrations, and schema management
- **PostgreSQL (via pg v8.16.3)**: Relational database
  - Robust, reliable database with excellent support for complex queries

### UI Components
- **Radix UI**: Unstyled, accessible component primitives
  - Provides accessible, composable UI components
- **Shadcn UI**: Component collection built on Radix
  - High-quality, customizable components with minimal overhead
- **Tailwind CSS (v4)**: Utility-first CSS framework
  - Rapid UI development with consistent design system
- **Lucide React (v0.539.0)**: Icon library
  - Consistent, customizable SVG icons

### Utilities
- **Zod (v4.0.17)**: TypeScript-first schema validation
  - Runtime validation for form inputs and API payloads
- **date-fns (v4.1.0)**: Date manipulation library
  - Comprehensive date formatting and manipulation
- **nanoid (v5.1.5)**: ID generation
  - Secure, URL-friendly unique ID generation for public links
- **clsx/tailwind-merge**: Utility for conditional class names
  - Simplifies dynamic styling with Tailwind

### Development Tools
- **TypeScript (v5)**: Typed JavaScript
  - Enhanced developer experience, fewer runtime errors
- **ESLint (v9)**: Code linting
  - Enforces code quality and consistency
- **Turbopack**: Fast bundler for development
  - Improves development experience with faster refresh times
        