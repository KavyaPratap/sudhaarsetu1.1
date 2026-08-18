import * as React from 'react';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import { adminDb } from '@/lib/firebase/admin';
import { redirect } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import ProfileFormClient from './profile-form-client';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  let profile: UserProfile = {
    id: user.id,
    email: user.email || '',
    full_name: user.full_name || 'User',
    role: (user.role as any) || 'citizen',
    points: 0,
    avatar_url: '',
  };

  try {
    const userDoc = await adminDb.collection('users').doc(user.id).get();
    if (userDoc.exists) {
      profile = {
        ...profile,
        ...(userDoc.data() as UserProfile),
      };
    }
  } catch (e) {
    console.error('Failed to fetch user profile document from Firestore:', e);
  }

  return <ProfileFormClient initialProfile={profile} />;
}
