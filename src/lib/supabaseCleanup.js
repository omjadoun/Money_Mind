// Supabase storage cleanup utility to fix "Request Header Fields Too Large" errors

const PROJECT_REF = 'wqjmhspderdpgqbeyxit';

/**
 * Clear all Supabase-related localStorage items to fix header size issues
 */
export const clearSupabaseStorage = () => {
  console.log('🧹 Clearing Supabase storage to fix header issues...');
  
  // Remove all known Supabase storage keys
  const keysToRemove = [
    `sb-${PROJECT_REF}-auth-token`,
    `sb-${PROJECT_REF}-auth-refresh-token`,
    `sb-${PROJECT_REF}-auth-expires-at`,
    `sb-${PROJECT_REF}-auth-user`,
    `supabase.auth.token`,
    `supabase.auth.refreshToken`,
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Also clear any other Supabase-related items
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') || key.startsWith('supabase.')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ Supabase storage cleared');
};

/**
 * Check for and clear oversized localStorage items
 */
export const clearOversizedStorage = () => {
  console.log('🔍 Checking for oversized localStorage items...');
  
  Object.keys(localStorage).forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value && value.length > 8000) { // 8KB threshold
        console.log(`🗑️ Removing oversized item: ${key} (${value.length} chars)`);
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Error checking localStorage item:', key, error);
      localStorage.removeItem(key); // Remove problematic items
    }
  });
  
  console.log('✅ Oversized storage cleanup completed');
};

/**
 * Comprehensive cleanup function
 */
export const performSupabaseCleanup = () => {
  clearSupabaseStorage();
  clearOversizedStorage();
  
  // Also clear sessionStorage if needed
  try {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sb-') || key.startsWith('supabase.')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Error clearing sessionStorage:', error);
  }
};
