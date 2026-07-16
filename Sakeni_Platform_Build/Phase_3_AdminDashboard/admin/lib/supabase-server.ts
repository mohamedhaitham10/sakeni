import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseServerEnv } from './env'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseServerEnv()
  const production = process.env.NODE_ENV === 'production'

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value,
              ...options,
              sameSite: options.sameSite ?? 'lax',
              secure: production ? true : options.secure,
              httpOnly: options.httpOnly ?? true,
            })
          } catch {
            // Error handling for setting cookies in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value: '',
              ...options,
              sameSite: options.sameSite ?? 'lax',
              secure: production ? true : options.secure,
              httpOnly: options.httpOnly ?? true,
            })
          } catch {
            // Error handling for removing cookies in Server Components
          }
        },
      },
    }
  )
}
