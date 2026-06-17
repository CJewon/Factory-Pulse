# Factory Pulse

Factory Pulse is a planned smart factory equipment monitoring dashboard built around Next.js App Router and Supabase.

The project focuses on applying different rendering strategies by page purpose and data freshness:

- SSG for stable public pages
- ISR for periodically refreshed factory and report pages
- Dynamic Rendering for freshness-sensitive dashboards and machine detail pages
- CSR for filter, search, settings, and comparison workflows
- Streaming/Suspense for slower dashboard sections
- Server Actions for mutations such as alarm resolution, dashboard preferences, and maintenance tasks
- Polling first, with Supabase Realtime as an extension for live alarm demos

## Planned Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres, Auth, RLS, and limited Realtime
- TanStack Query
- Zustand
- React Hook Form
- Zod

## Current Status

This repository is in the planning/setup stage. The application scaffold, `package.json`, Supabase migrations, and runnable scripts have not been added yet.

The next major step is to scaffold the Next.js App Router project and then implement the MVP routes from the product and architecture plan.
