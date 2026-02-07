import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 🔓 Always allow login page
  if (pathname === '/login') {
    return response
  }

  // 🔒 Not logged in
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 🔑 Fetch role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 🧱 Role protection
  if (pathname.startsWith('/architect') && profile.role !== 'architect') {
    return NextResponse.redirect(new URL('/vendor', request.url))
  }

  if (pathname.startsWith('/vendor') && profile.role !== 'vendor') {
    return NextResponse.redirect(new URL('/architect', request.url))
  }

  return response
}

export const config = {
  matcher: ['/architect/:path*', '/vendor/:path*', '/login'],
}
