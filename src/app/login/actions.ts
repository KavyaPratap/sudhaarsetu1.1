
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const signupSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  full_name: z.string().min(2, { message: 'Please enter your full name.' }),
  role: z.enum(['citizen', 'worker']).default('citizen'),
});

type ActionResponse = {
  success: boolean;
  error?: string | null;
} | null;


export async function login(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const rawData = Object.fromEntries(formData.entries());
  const parseResult = loginSchema.safeParse(rawData);

  if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map(e => e.message).join(', ');
      return { success: false, error: errorMessages };
  }

  const { email, password } = parseResult.data;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (authData.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .single();
        
        if (profile?.role === 'admin') {
            revalidatePath('/admin', 'layout');
            redirect('/admin');
        }
        if (profile?.role === 'worker') {
            revalidatePath('/worker', 'layout');
            redirect('/worker');
        }
  }
  
  // Default redirect for citizens
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const rawData = Object.fromEntries(formData.entries());
  const parseResult = signupSchema.safeParse(rawData);

   if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map(e => e.message).join(', ');
      return { success: false, error: errorMessages };
  }

  const { email, password, full_name, role } = parseResult.data;

  const {
    data: { user },
    error,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
        data: {
            full_name: full_name,
            role: role,
            avatar_url: '',
        }
    }
  });

  if (error) {
     return { success: false, error: error.message };
  }
  
  // The trigger will handle profile creation, and the user will need to verify their email.
  // Redirecting to a page that tells them to check their email might be a good idea.
  // For now, redirecting to login.
  revalidatePath('/', 'layout');
  redirect('/login?message=Check email to continue sign in process');
}


export async function adminLogin(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawData = Object.fromEntries(formData.entries());
    const parseResult = loginSchema.safeParse(rawData);

    if (!parseResult.success) {
        const errorMessages = parseResult.error.errors.map(e => e.message).join(', ');
        return { success: false, error: errorMessages };
    }

    const { email, password } = parseResult.data;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError) {
        return { success: false, error: authError.message };
    }

    if (authData.user) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) {
             await supabase.auth.signOut(); // Log them out
             return { success: false, error: "Could not verify admin role. Your profile might be missing." };
        }

        if (profile.role !== 'admin') {
            await supabase.auth.signOut(); // Log them out
            return { success: false, error: "You are not authorized to access the admin panel." };
        }
    }
    
    revalidatePath('/', 'layout');
    revalidatePath('/admin', 'layout');
    redirect('/admin');
}

export async function workerLogin(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawData = Object.fromEntries(formData.entries());
    const parseResult = loginSchema.safeParse(rawData);

    if (!parseResult.success) {
        const errorMessages = parseResult.error.errors.map(e => e.message).join(', ');
        return { success: false, error: errorMessages };
    }

    const { email, password } = parseResult.data;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError) {
        return { success: false, error: authError.message };
    }

    if (authData.user) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) {
             await supabase.auth.signOut(); // Log them out
             return { success: false, error: "Could not verify worker role. Your profile might be missing." };
        }

        if (profile.role !== 'worker') {
            await supabase.auth.signOut(); // Log them out
            return { success: false, error: "You are not authorized to access the worker panel." };
        }
    }
    
    revalidatePath('/', 'layout');
    revalidatePath('/worker', 'layout');
    redirect('/worker');
}

export async function logout() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  await supabase.auth.signOut();
  
  revalidatePath('/', 'layout');
  redirect('/login');
}
