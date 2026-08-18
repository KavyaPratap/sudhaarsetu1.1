import { cookies } from 'next/headers';
import { adminAuth, adminDb } from './admin';

export type ServerUser = {
  id: string;
  email?: string;
  role?: 'citizen' | 'admin' | 'worker';
  full_name?: string;
};

export async function getCurrentUser(): Promise<ServerUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('firebaseAuthToken')?.value;

    if (!token) {
      // Fallback check if user is stored in session cookie
      const sessionUserStr = cookieStore.get('firebaseUserSession')?.value;
      if (sessionUserStr) {
        try {
          const parsed = JSON.parse(sessionUserStr);
          if (parsed && parsed.id) return parsed;
        } catch {}
      }
      return null;
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    return {
      id: uid,
      email: decodedToken.email || userData?.email,
      role: userData?.role || 'citizen',
      full_name: userData?.full_name || decodedToken.name || 'Anonymous User',
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
