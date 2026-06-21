# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

俱乐部课时系统 (Club Course Management System) - A course scheduling and time tracking system for training clubs/institutions. Supports one-on-one and group teaching modes with lesson recording and multi-dimensional statistics.

## Tech Stack

- **Framework**: Nuxt 4 (Vue 3 + TypeScript)
- **UI Library**: Element Plus (with Chinese locale)
- **Icons**: @element-plus/icons-vue
- **State Management**: Pinia
- **ORM**: Prisma
- **Database**: SQLite (development) / PostgreSQL (production)
- **Language**: TypeScript

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (default port 3000)
npm run dev

# Start dev server on specific port
PORT=3333 npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Database operations
npx prisma migrate dev      # Run migrations (dev)
npx prisma migrate deploy   # Run migrations (prod)
npx prisma generate         # Generate Prisma client
npx prisma studio           # Open Prisma Studio (DB GUI)
```

## Architecture

### User Roles
- **Super Admin (super_admin)**: Full platform management
- **Club Admin (club_admin)**: Manage coaches, scheduling, billing per club
- **Coach/Teacher (coach)**: View schedule, record lessons, view statistics

Students do not use the system directly; their information is managed by coaches/admins.

### Key Features
- Multi-campus support (one club can have multiple campuses)
- Calendar-based scheduling (day/week/month views)
- Conflict detection (student, coach, venue)
- Lesson time tracking and statistics
- Financial settlement (per coach, per subject, per campus)

### Database Schema (Prisma)

Core tables in `prisma/schema.prisma`:
- `User` - System users with role-based access
- `Club` - Club organizations
- `Campus` - Multiple campuses per club
- `Subject` - Course subjects with pricing
- `Course` - Scheduled lessons
- `CourseStudent` - Many-to-many: courses ↔ students
- `Student` - Student information (not system users)
- `Lesson` - Actual lesson records
- `Settlement` / `SettlementItem` - Financial settlements

### Project Structure

```
├── app/
│   ├── pages/          # Nuxt page routes
│   ├── layouts/        # Layout components
│   ├── components/     # Vue components
│   ├── composables/    # Vue composables (useXxx)
│   ├── stores/         # Pinia stores
│   ├── plugins/        # Nuxt plugins
│   └── types/          # TypeScript type definitions
├── server/
│   └── api/            # Server API endpoints
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/     # Database migrations
├── public/             # Static assets
└── docs/
    └── requirements.md # Product requirements
```

## Key Files

- `nuxt.config.ts` - Nuxt configuration (Element Plus, imports)
- `prisma/schema.prisma` - Database schema definition
- `app/plugins/element-plus.ts` - Element Plus plugin with Chinese locale

## Language

Business documentation and comments should be in Chinese (中文). Code variables and technical terms can be in English.
