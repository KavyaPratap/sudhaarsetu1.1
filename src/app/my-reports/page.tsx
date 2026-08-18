import * as React from 'react';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import { adminDb } from '@/lib/firebase/admin';
import { redirect } from 'next/navigation';
import type { Issue, UserProfile } from '@/lib/types';
import MyReportsClient from './my-reports-client';

export const dynamic = 'force-dynamic';

export default async function MyReportsPage() {
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
    console.error('Failed to fetch user profile in my-reports:', e);
  }

  let issues: Issue[] = [];
  try {
    const snapshot = await adminDb
      .collection('issues')
      .where('reportedBy', '==', user.id)
      .get();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      issues.push({
        ...data,
        id: docSnap.id,
        reportedAt: new Date(data.reportedAt || Date.now()),
        comments: [],
        ratings: [],
      } as unknown as Issue);
    });
  } catch (e) {
    console.error('Failed to fetch user issues in my-reports:', e);
  }

  return <MyReportsClient issues={issues} profile={profile} userId={user.id} />;
}