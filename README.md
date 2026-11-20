# BroodWatch

BroodWatch is a poultry farm management prototype for organizing flocks, recording daily activity, reviewing environmental observations, and finding practical poultry guidance. It uses the existing forest-green and sage visual system across the public site, account flows, onboarding, and protected farm workspace.

## Stack

- Next.js App Router 16 with JavaScript and JSX
- React 19
- Tailwind CSS 4 and the existing component styles
- Supabase Auth through `@supabase/ssr`
- Recharts for dashboard visualizations
- Lucide React icons
- pnpm

## Run locally

Use Node.js 20.9 or newer and pnpm. Install dependencies, then start the development server:

```sh
pnpm install
pnpm dev
```

Useful project scripts:

```sh
pnpm run format       # Format source and configuration files
pnpm run format:check # Check formatting without changing files
pnpm build            # Build the Next.js application
pnpm start            # Start the production build
```

## Supabase Auth configuration

The Supabase integration is used for email-and-password sign-up, login, password reset, sign-out, session refresh, and the email callback. Provide these variables through the project environment; do not commit their values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` for the v0 preview redirect proxy

Email confirmation is enabled by the Supabase project. A new account follows the confirmation link before entering onboarding. Authenticated routes call `auth.getUser()` on the server; the root `proxy.js` refreshes sessions and cookies. The protected navigation reads the administrator flag from server-controlled `app_metadata.role`, not user-editable metadata.

## Routes

| Route                                            | Purpose                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `/`                                              | Public marketing homepage                                               |
| `/about`                                         | Product overview                                                        |
| `/contact`                                       | Contact form preview                                                    |
| `/privacy`                                       | Draft privacy policy                                                    |
| `/terms`                                         | Draft terms of use                                                      |
| `/auth/login`                                    | Supabase email/password login                                           |
| `/auth/sign-up`                                  | Account creation                                                        |
| `/auth/sign-up-success` and `/auth/verify-email` | Email confirmation instructions                                         |
| `/auth/forgot-password`                          | Request a password reset email                                          |
| `/auth/reset-password`                           | Set a new password from the callback session                            |
| `/auth/error`                                    | Authentication error state                                              |
| `/auth/callback`                                 | Exchanges the Supabase callback code for a session                      |
| `/onboarding`                                    | Protected farm setup wizard                                             |
| `/dashboard`                                     | Protected farm workspace; the existing dashboard components remain here |

## Project structure

```text
app/
  (marketing)/       Public homepage and information pages
  (auth)/            Login, sign-up, recovery, and callback routes
  (onboarding)/      Protected setup route
  (app)/dashboard/   Protected application entry point
components/
  app/               Application shell, header, sidebar, and brand
  auth/              Auth forms, notices, session profile context, and sign-out
  administration/    Device, user, and evaluation screens
  advisory/          Knowledge library and assistant screens
  business/          Feed, egg production, finance, and reports
  dashboard/         Dashboard screen
  data/              Clearly labeled sample data used in the prototype
  farms/             Farm and flock management
  marketing/         Public site and contact form
  monitoring/        Environment, alerts, trends, and recommendations
  onboarding/        Multi-step farmer and farm setup wizard
  operations/        Daily records, movements, inventory, health, and vaccination
  shared/            Reusable screen primitives
  ui/                Shared UI components
lib/supabase/        Browser, server, and session-refresh clients
proxy.js             Next.js session refresh proxy
```

## Data and prototype behavior

Supabase Auth is connected, but no farm-management database tables or policies were added. Dashboard metrics and operational records are sample data. The onboarding wizard stores its progress only in component state and explicitly tells users that farm details are not persisted. The contact form is a local preview interaction and does not send or store messages. Privacy and terms pages are drafts and should be reviewed before a production launch.

There is currently no automated test script. The formatting check is available via `pnpm run format:check`; route and responsive behavior should also be checked in the running Next.js preview.
