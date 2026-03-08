import { supabase } from './supabase'
import { cookies } from 'next/headers'

export type User = {
  id: string
  email: string
  created_at: string
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return {
    id: user.id,
    email: user.email || '',
    created_at: user.created_at,
  }
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return null
  }

  return session
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

// Server-side function to get session from cookies
export async function getServerSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('sb-access-token')

  if (!sessionCookie) {
    return null
  }

  return sessionCookie.value
}
