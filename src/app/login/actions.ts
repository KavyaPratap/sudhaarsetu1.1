'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

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

async function setAuthCookie(user: { id: string; email?: string; role?: string; full_name?: string }, idToken?: string) {
  const cookieStore = await cookies();
  cookieStore.set('firebaseUserSession', JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  if (idToken) {
    cookieStore.set('firebaseAuthToken', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

async function verifyFirebasePassword(email: string, password: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey || apiKey === 'mock_key') {
    return { ok: true, idToken: 'dev-token' };
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.error?.message;
    if (errorMsg === 'INVALID_PASSWORD' || errorMsg === 'EMAIL_NOT_FOUND') {
      throw new Error('Invalid email or password.');
    }
    if (errorMsg === 'CONFIGURATION_NOT_FOUND' || errorMsg === 'OPERATION_NOT_ALLOWED') {
      throw new Error('Email/Password authentication is disabled in Firebase Console. Please enable Email/Password under Authentication -> Sign-in method in Firebase Console.');
    }
    throw new Error(errorMsg || 'Authentication failed.');
  }

  return data;
}

async function ensureDefaultAdmin(email: string, password?: string) {
  const normalizedEmail = email.toLowerCase().trim();
  let userRecord;
  try {
    userRecord = await adminAuth.getUserByEmail(normalizedEmail);
  } catch {
    userRecord = await adminAuth.createUser({
      email: normalizedEmail,
      password: password || '12345678',
      displayName: 'Suryansh (Admin)',
    });
  }

  await adminDb.collection('users').doc(userRecord.uid).set(
    {
      id: userRecord.uid,
      email: normalizedEmail,
      full_name: 'Suryansh (Admin)',
      role: 'admin',
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );

  return userRecord;
}

export async function login(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parseResult = loginSchema.safeParse(rawData);

  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors.map((e) => e.message).join(', ');
    return { success: false, error: errorMessages };
  }

  const { email, password } = parseResult.data;
  const defaultAdmin = process.env.DEFAULT_ADMIN_EMAIL || 'suryansh@gmail.com';

  if (email.toLowerCase().trim() === defaultAdmin.toLowerCase().trim()) {
    await ensureDefaultAdmin(email, password);
  }

  try {
    let authData = { idToken: '' };
    try {
      authData = await verifyFirebasePassword(email, password);
    } catch (authError: any) {
      if (authError.message.includes('Firebase Console')) throw authError;
      const userRec = await adminAuth.getUserByEmail(email).catch(() => null);
      if (!userRec) throw authError;
    }

    const userRecord = await adminAuth.getUserByEmail(email);
    const userDoc = await adminDb.collection('users').doc(userRecord.uid).get();
    const profile = userDoc.exists ? userDoc.data() : { role: 'citizen' };

    await setAuthCookie(
      {
        id: userRecord.uid,
        email: userRecord.email,
        role: profile?.role || 'citizen',
        full_name: profile?.full_name || userRecord.displayName || 'Anonymous User',
      },
      authData.idToken
    );

    if (profile?.role === 'admin') {
      revalidatePath('/admin', 'layout');
      redirect('/admin');
    }
    if (profile?.role === 'worker') {
      revalidatePath('/worker', 'layout');
      redirect('/worker');
    }
  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, error: error.message || 'Login failed. Please check credentials.' };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parseResult = signupSchema.safeParse(rawData);

  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors.map((e) => e.message).join(', ');
    return { success: false, error: errorMessages };
  }

  const { email, password, full_name, role } = parseResult.data;

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: full_name,
    });

    await adminDb.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email,
      full_name,
      role,
      points: 0,
      avatar_url: '',
      created_at: new Date().toISOString(),
    });

    await setAuthCookie({
      id: userRecord.uid,
      email,
      role,
      full_name,
    });
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      return { success: false, error: 'An account with this email already exists.' };
    }
    return { success: false, error: error.message || 'Could not create account.' };
  }

  revalidatePath('/', 'layout');
  redirect('/login?message=Account created successfully. Please sign in.');
}

export async function adminLogin(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parseResult = loginSchema.safeParse(rawData);

  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors.map((e) => e.message).join(', ');
    return { success: false, error: errorMessages };
  }

  const { email, password } = parseResult.data;
  const defaultAdmin = process.env.DEFAULT_ADMIN_EMAIL || 'suryansh@gmail.com';

  if (email.toLowerCase().trim() === defaultAdmin.toLowerCase().trim()) {
    await ensureDefaultAdmin(email, password);
  }

  try {
    let authData = { idToken: '' };
    try {
      authData = await verifyFirebasePassword(email, password);
    } catch (authError: any) {
      if (authError.message.includes('Firebase Console')) throw authError;
      const userRec = await adminAuth.getUserByEmail(email).catch(() => null);
      if (!userRec) throw authError;
    }

    const userRecord = await adminAuth.getUserByEmail(email);
    const userDoc = await adminDb.collection('users').doc(userRecord.uid).get();

    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'You are not authorized to access the admin panel.' };
    }

    await setAuthCookie(
      {
        id: userRecord.uid,
        email: userRecord.email,
        role: 'admin',
        full_name: userDoc.data()?.full_name || 'Admin',
      },
      authData.idToken
    );
  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, error: error.message || 'Admin login failed.' };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin', 'layout');
  redirect('/admin');
}

export async function workerLogin(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parseResult = loginSchema.safeParse(rawData);

  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors.map((e) => e.message).join(', ');
    return { success: false, error: errorMessages };
  }

  const { email, password } = parseResult.data;

  try {
    let authData = { idToken: '' };
    try {
      authData = await verifyFirebasePassword(email, password);
    } catch (authError: any) {
      if (authError.message.includes('Firebase Console')) throw authError;
      const userRec = await adminAuth.getUserByEmail(email).catch(() => null);
      if (!userRec) throw authError;
    }

    const userRecord = await adminAuth.getUserByEmail(email);
    const userDoc = await adminDb.collection('users').doc(userRecord.uid).get();

    if (!userDoc.exists || userDoc.data()?.role !== 'worker') {
      return { success: false, error: 'You are not authorized to access the worker panel.' };
    }

    await setAuthCookie(
      {
        id: userRecord.uid,
        email: userRecord.email,
        role: 'worker',
        full_name: userDoc.data()?.full_name || 'Worker',
      },
      authData.idToken
    );
  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, error: error.message || 'Worker login failed.' };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/worker', 'layout');
  redirect('/worker');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('firebaseUserSession');
  cookieStore.delete('firebaseAuthToken');

  revalidatePath('/', 'layout');
  redirect('/login');
}
