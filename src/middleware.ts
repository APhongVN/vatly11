import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options })
            response = NextResponse.next({
              request: { headers: request.headers },
            })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options })
            response = NextResponse.next({
              request: { headers: request.headers },
            })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    // Xử lý lỗi auth (ví dụ: Failed to fetch) mà không làm sập web
    if (error) {
      console.error('Auth error in middleware:', error.message)
      // Nếu đang vào trang giáo viên mà lỗi -> đá về login
      if (request.nextUrl.pathname.startsWith('/giao-vien')) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      // Các trang công khai khác vẫn cho phép truy cập
      return response
    }

    if (request.nextUrl.pathname.startsWith('/giao-vien') && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return response
  } catch (error) {
    // Bắt các lỗi mạng không mong muốn
    console.error('Unexpected error in middleware:', error)
    if (request.nextUrl.pathname.startsWith('/giao-vien')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }
}

export const config = {
  matcher: ['/giao-vien/:path*'],
}