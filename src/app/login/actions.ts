
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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath('/', 'layout');
  // DO NOT redirect here. Middleware will handle it.
  // redirect('/');
  return { success: true };
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

  const { email, password, full_name } = parseResult.data;

  const {
    data: { user },
    error,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
        data: {
            full_name: full_name,
            // Default avatar can be set here if needed
            avatar_url: '',
        }
    }
  });

  if (error) {
     return { success: false, error: error.message };
  }
  
  if (user) {
    // The trigger will now handle profile creation.
    // The user's full_name is passed in the options.data object above,
    // which the `handle_new_user` function can access via `new.raw_user_meta_data`.
  }
  
  revalidatePath('/', 'layout');
  redirect('/profile');
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

export async function logout() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  await supabase.auth.signOut();
  
  revalidatePath('/', 'layout');
  redirect('/login');
}
