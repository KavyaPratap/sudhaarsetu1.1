
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

type ActionResponse = 
  | { success: true, updatedProfile: { avatar_url?: string } }
  | { success: false, error: string }
  | null;

export async function updateProfile(prevState: any, formData: FormData): Promise<ActionResponse> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    // Use a unique and predictable file path
    const filePath = `${user.id}/avatar`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true, // Overwrite existing avatar if any
      });
      
    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return { success: false, error: 'Could not upload avatar image. Check bucket permissions.' };
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    avatarUrl = urlData.publicUrl;
  }

  // Prepare data for update
  const profileData: { 
    full_name: string;
    contact_number: string;
    address: string;
    avatar_url?: string;
  } = {
    full_name: fullName,
    contact_number: contactNumber,
    address: address,
  };

  if (avatarUrl) {
    profileData.avatar_url = avatarUrl;
  }
  
  const { error: updateError } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', user.id);

  if (updateError) {
    console.error('Profile Update Error:', updateError);
    return { success: false, error: 'Failed to update profile.' };
  }
  

  revalidatePath('/profile');
  revalidatePath('/', 'layout'); // Revalidate layout to update header
  
  return { success: true, updatedProfile: { avatar_url: avatarUrl } };
}
