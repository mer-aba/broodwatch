
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const protectedRoutes = [
  '/dashboard',
  '/onboarding',
  '/farms',
  '/houses',
  '/pens',
  '/flocks',
  '/batches',
  '/daily-records',
  '/weight-monitoring',
  '/environment',
  '/alerts',
  '/recommendations',
  '/assistant',
  '/inventory',
  '/reports',
  '/settings',
]

function matchesRoute(pathname, route) {
  return (
    pathname === route ||
    pathname.startsWith(`${route}/`)
  )
}

export async function updateSession(request) {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase Auth is not configured.')
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({ request })

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(name, value, options)
            }
          )
        },
      },
    }
  )

  // Verify authentication and refresh cookies when needed.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const requiresAuth = protectedRoutes.some((route) =>
    matchesRoute(pathname, route)
  )

  if (requiresAuth && (error || !user)) {
    const url = request.nextUrl.clone()

    url.pathname = '/auth/login'
    url.searchParams.set(
      'next',
      pathname + request.nextUrl.search
    )

    const redirectResponse = NextResponse.redirect(url)

    // Preserve refreshed/deleted auth cookies.
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })

    return redirectResponse
  }

  return response
}
