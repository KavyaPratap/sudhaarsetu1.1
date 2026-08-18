'use server';

import { revalidatePath } from 'next/cache';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server-auth';

type ActionResponse =
  | { success: true; updatedProfile: { avatar_url?: string } }
  | { success: false; error: string }
  | null;

export async function updateProfile(prevState: any, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to update your profile.' };
  }

  const fullName = formData.get('full_name') as string;
  const contactNumber = formData.get('contact_number') as string;
  const address = formData.get('address') as string;
  const avatarFile = formData.get('avatar') as File | null;

  let avatarUrl: string | undefined = undefined;

  // Handle avatar upload
  if (avatarFile && avatarFile.size > 0) {
    try {
      const bucket = adminStorage.bucket();
      const fileName = `avatars/${user.id}-${Date.now()}`;
      const fileBuffer = Buffer.from(await avatarFile.arrayBuffer());
      const fileRef = bucket.file(fileName);

      await fileRef.save(fileBuffer, {
        contentType: avatarFile.type || 'image/jpeg',
        metadata: { firebaseStorageDownloadTokens: Date.now().toString() },
      });

      avatarUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
    } catch (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return { success: false, error: 'Could not upload avatar image.' };
    }
  }

  const profileData: Record<string, any> = {
    full_name: fullName,
    contact_number: contactNumber,
    address: address,
    updated_at: new Date().toISOString(),
  };

  if (avatarUrl) {
    profileData.avatar_url = avatarUrl;
  }

  try {
    await adminDb.collection('users').doc(user.id).set(profileData, { merge: true });
  } catch (updateError) {
    console.error('Profile Update Error:', updateError);
    return { success: false, error: 'Failed to update profile.' };
  }

  revalidatePath('/profile');
  revalidatePath('/', 'layout');

  return { success: true, updatedProfile: { avatar_url: avatarUrl } };
}
