import { supabase } from './supabase';

/**
 * Extracts the storage path from a Supabase public URL.
 * Assumes the URL format: .../storage/v1/object/public/[bucket]/[path]
 */
export const getStoragePathFromUrl = (url: string, bucketName: string) => {
  try {
    const urlObj = new URL(url);
    // Decode the pathname to handle encoded spaces or special characters
    const pathname = decodeURIComponent(urlObj.pathname);
    
    // Standard Supabase storage URL patterns:
    // 1. .../storage/v1/object/public/[bucket]/[path]
    // 2. .../storage/v1/object/authenticated/[bucket]/[path]
    
    const searchPatterns = [
      `/public/${bucketName}/`,
      `/authenticated/${bucketName}/`,
      `/object/${bucketName}/`,
      `/${bucketName}/`
    ];
    
    for (const pattern of searchPatterns) {
      const index = pathname.indexOf(pattern);
      if (index !== -1) {
        // Extract everything after the bucket name part
        let path = pathname.substring(index + pattern.length);
        // Remove any leading slashes and trailing query params (if URL parsing didn't catch them)
        path = path.replace(/^\/+/, '').split('?')[0];
        if (path) return path;
      }
    }
    
    // Fallback: If URL format is completely different, try to find the bucket segment
    const parts = pathname.split('/');
    const bucketIndex = parts.indexOf(bucketName);
    if (bucketIndex !== -1 && bucketIndex < parts.length - 1) {
      return parts.slice(bucketIndex + 1).join('/').split('?')[0];
    }
    
    return null;
  } catch (e) {
    console.error('Failed to parse storage URL:', url, e);
    return null;
  }
};

/**
 * Deletes files from a Supabase storage bucket given their public URLs.
 */
export const deleteFilesFromUrls = async (urls: (string | null | undefined)[], bucketName: string) => {
  const paths = urls
    .filter((url): url is string => !!url)
    .map(url => getStoragePathFromUrl(url, bucketName))
    .filter((path): path is string => !!path);

  if (paths.length === 0) return { data: [], error: null };

  console.log(`Attempting to delete ${paths.length} files from ${bucketName}:`, paths);
  const { data, error } = await supabase.storage.from(bucketName).remove(paths);
  
  if (error) {
    console.error(`Error deleting files from ${bucketName}:`, error);
  } else {
    console.log(`Successfully deleted files from ${bucketName}:`, data);
  }
  
  return { data, error };
};
