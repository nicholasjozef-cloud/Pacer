# Pacer Marathon Training App

## Overview

Pacer is a marathon training companion application designed to help runners track workouts, nutrition, and progress towards a sub-3 hour marathon goal. The app features a data-driven dashboard with training plan management, calendar-based workout logging, nutrition tracking, and Strava integration for syncing activities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration for Replit environment
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React useState for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with dark-first theme featuring cyan accents (Material Design with Linear-inspired data visualization)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: REST endpoints prefixed with `/api`
- **Development**: tsx for TypeScript execution, Vite dev server for hot module replacement

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all database table definitions
- **External Database**: Supabase for authentication and data persistence
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod

### Authentication
- **Provider**: Supabase Auth with email/password authentication
- **Client Integration**: @supabase/supabase-js configured via environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- **Session Management**: Handled by Supabase client-side SDK

### Key Design Patterns
- **Services Layer**: Database operations abstracted into service modules (`client/src/lib/services.ts`) for centralized Supabase calls
- **Shared Types**: Common types and schemas in `shared/` directory accessible by both client and server
- **Component Structure**: Feature components (Dashboard, CalendarView, Workouts, Settings) with reusable UI primitives

### Data Models
- **user_settings**: User preferences including body weight, target time, race date, training plan configuration
- **day_details**: Daily workout and nutrition logs (workout type, miles, pace, macros, notes)
- **strava_connections**: OAuth tokens and athlete data for Strava integration

## External Dependencies

### Database & Authentication
- **Supabase**: PostgreSQL database hosting and authentication service
- **Drizzle**: ORM for type-safe database queries (requires DATABASE_URL environment variable)

### Third-Party Integrations
- **Strava API**: Activity syncing (OAuth-based connection stored in strava_connections table)

### UI/Frontend Libraries
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **Lucide React**: Icon library
- **date-fns**: Date manipulation utilities
- **react-day-picker**: Calendar component
- **embla-carousel-react**: Carousel functionality
- **recharts**: Charting library for data visualization

### Build & Development
- **Vite**: Frontend bundling with React plugin
- **esbuild**: Server-side bundling for production
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type checking across client and server