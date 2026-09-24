'use client';

// =====================================================================
// Auth Context & Session Management
// Handles Supabase Auth session & role-based identity
// =====================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole, Student } from '@/types/database';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { createClient } from '@/lib/supabase/client';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  studentProfile?: Student | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage or Supabase on mount
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      const provider = getAttendanceProvider();

      // Check saved local session first for seamless demo testing
      const savedSession = typeof window !== 'undefined' ? localStorage.getItem('dh_user_session') : null;
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession) as AuthUser;
          if (parsed.role === 'STUDENT') {
            const studentProfile = await provider.getStudentProfileById(parsed.studentProfile?.id || 'b1111111-1111-1111-1111-111111111111');
            setUser({ ...parsed, studentProfile });
          } else {
            setUser(parsed);
          }
          setIsLoading(false);
          return;
        } catch {
          // ignore corrupted JSON
        }
      }

      // Default demo initial state: Muhammed (Student) for instant preview if no session
      const defaultStudent = await provider.getStudentProfileById('b1111111-1111-1111-1111-111111111111');
      const defaultUser: AuthUser = {
        id: 's0000000-0000-0000-0000-000000000001',
        email: 'student@example.com',
        role: 'STUDENT',
        studentProfile: defaultStudent,
      };
      setUser(defaultUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('dh_user_session', JSON.stringify(defaultUser));
      }

      setIsLoading(false);
    }

    initAuth();
  }, []);

  const signIn = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.toLowerCase().trim();
    const provider = getAttendanceProvider();

    // Check if Supabase Auth is enabled
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url && !url.includes('demo') && password) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          // Check role from profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('auth_user_id', data.user.id)
            .single();

          const role = (profile?.role as UserRole) || 'STUDENT';
          let studentProfile: Student | null = null;
          if (role === 'STUDENT') {
            studentProfile = await provider.getStudentProfileByUserId(data.user.id);
          }

          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            role,
            studentProfile,
          };

          setUser(authUser);
          localStorage.setItem('dh_user_session', JSON.stringify(authUser));
          setIsLoading(false);
          return { success: true };
        }
      } catch (err) {
        console.warn('Supabase sign in failed, falling back to institutional demo accounts', err);
      }
    }

    // Institutional Demo Sign In
    if (cleanEmail === 'admin@example.com' || cleanEmail.includes('admin')) {
      const authUser: AuthUser = {
        id: 'a0000000-0000-0000-0000-000000000001',
        email: 'admin@example.com',
        role: 'ADMIN',
      };
      setUser(authUser);
      localStorage.setItem('dh_user_session', JSON.stringify(authUser));
      setIsLoading(false);
      return { success: true };
    }

    // Default to student (e.g. student@example.com or any student email)
    const student = await provider.getStudentProfileById('b1111111-1111-1111-1111-111111111111');
    const authUser: AuthUser = {
      id: 's0000000-0000-0000-0000-000000000001',
      email: cleanEmail.length > 0 ? cleanEmail : 'student@example.com',
      role: 'STUDENT',
      studentProfile: student,
    };
    setUser(authUser);
    localStorage.setItem('dh_user_session', JSON.stringify(authUser));
    setIsLoading(false);
    return { success: true };
  };

  const signOut = async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url && !url.includes('demo')) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }

    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dh_user_session');
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url && !url.includes('demo')) {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to update password' };
      }
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
