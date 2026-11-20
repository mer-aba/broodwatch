
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeNextPath(value) {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return '/dashboard'
  }

  return value
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/error', origin)
    )
  }

  const supabase = await createClient()

  const { error } =
    await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Supabase callback error:', error.message)

    return NextResponse.redirect(
      new URL('/auth/error', origin)
    )
  }

  return NextResponse.redirect(new URL(next, origin))
}
