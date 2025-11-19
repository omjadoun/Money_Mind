// Test script to verify auth initialization
import { supabase } from './src/integrations/supabase/client.js';

async function testAuth() {
  console.log('Testing auth initialization...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('Session:', session);
    console.log('Error:', error);
    
    if (session) {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      console.log('AAL Data:', aalData);
    }
  } catch (error) {
    console.error('Auth test failed:', error);
  }
}

testAuth();
