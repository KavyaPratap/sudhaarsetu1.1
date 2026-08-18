import * as React from 'react';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import { adminDb } from '@/lib/firebase/admin';
import { redirect } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import NotificationsClient from './notifications-client';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
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
    console.error('Failed to fetch user profile in notifications:', e);
  }

  let notifications: any[] = [];
  try {
    const snapshot = await adminDb
      .collection('notifications')
      .where('user_id', '==', user.id)
      .get();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      notifications.push({
        ...data,
        id: docSnap.id,
      });
    });

    notifications.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  } catch (e) {
    console.error('Failed to fetch notifications in page:', e);
  }

  return <NotificationsClient initialNotifications={notifications} profile={profile} />;
}
