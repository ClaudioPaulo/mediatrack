import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente Supabase para uso em Server Components / Route Handlers.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            );
          } catch {
            // chamado a partir de um Server Component sem permissão de escrita — ignorável,
            // o middleware trata do refresh de sessão.
          }
        },
      },
    }
  );
}
