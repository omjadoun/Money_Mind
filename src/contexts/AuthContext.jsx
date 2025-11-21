import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../integrations/supabase/client'
import { performSupabaseCleanup } from '../lib/supabaseCleanup';
import { useToast } from '@/hooks/use-toast'

const AuthContext = createContext({})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const mfaPendingRef = useRef(false) // Track if MFA verification is pending

  useEffect(() => {
    // Set a safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth initialization taking too long, forcing loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second safety timeout

    // Clean up any existing large Supabase headers on initialization
    performSupabaseCleanup();

    // Get initial session - simplified to prevent hanging
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // For initial load, set user immediately to prevent hanging
        // MFA checks will happen in onAuthStateChange
        console.log('Session found, setting user:', session.user.email);
        setUser(session.user);
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    }).catch(error => {
      console.error('Error getting session:', error);
      setUser(null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email, 'MFA Pending:', mfaPendingRef.current);

        // Don't auto-set user if MFA verification is pending
        if (mfaPendingRef.current) {
          console.log('🔐 MFA pending - skipping auto user set');
          return;
        }

        // For SIGNED_IN events, set user immediately
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          toast({
            title: "Welcome back!",
            description: "You have successfully signed in.",
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          toast({
            title: "Signed out",
            description: "You have been signed out successfully.",
          });
        } else {
          // For other events, set user normally
          setUser(session?.user ?? null);
        }
        setLoading(false);
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
    }
  }, [toast])

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    })

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      return { error }
    }

    toast({
      title: "Success!",
      description: "Check your email for the confirmation link.",
    })

    return { data }
  }

  const signIn = async (email, password) => {
    console.log('🔐 Starting sign-in process...')
    console.log('📧 Email:', email)
    console.log('🌐 Supabase client initialized:', !!supabase)

    let data, error
    try {
      // Regular sign in
      console.log('📤 Calling signInWithPassword...')
      console.log('⏱️ Timestamp before call:', new Date().toISOString())

      const startTime = Date.now()
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`⏱️ Call completed in ${duration}ms`)
      console.log('📝 signInWithPassword result:', {
        hasSession: !!signInData?.session,
        error: signInError?.message,
        errorStatus: signInError?.status
      })

      data = signInData
      error = signInError
    } catch (signInError) {
      console.error('❌ Exception in signInWithPassword:', signInError)
      console.error('❌ Error details:', {
        message: signInError.message,
        stack: signInError.stack,
        name: signInError.name
      })
      error = signInError
      toast({
        title: "Error",
        description: signInError.message || "Failed to sign in. Please check your internet connection.",
        variant: "destructive",
      })
      return { error: signInError }
    }

    // If there's an error, return it (unless it's MFA-related)
    if (error) {
      // Check if error indicates MFA is required
      const isMFAError = error.message?.toLowerCase().includes('mfa') ||
        error.message?.toLowerCase().includes('multi-factor') ||
        error.message?.toLowerCase().includes('factor') ||
        error.status === 422

      if (!isMFAError) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
        return { error }
      }
      // If it's an MFA error, continue to check AAL below
    }

    // Always check Authenticator Assurance Level after sign-in
    // Even if signInWithPassword succeeded, we need to verify if MFA is required
    try {
      console.log('🔍 Checking AAL...')
      const aalResult = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      const aalData = aalResult.data
      const aalError = aalResult.error

      console.log('🔍 AAL check result:', { aalData, aalError: aalError?.message })

      if (aalError) {
        console.error('❌ Error getting AAL:', aalError)
        // If we can't get AAL and there's no session, return error
        if (!data?.session) {
          toast({
            title: "Error",
            description: aalError.message || "Unable to verify authentication level",
            variant: "destructive",
          })
          return { error: aalError }
        }
        // If we have a session but can't get AAL, we need to be careful
        // Don't automatically proceed - this could be a security issue
        console.warn('⚠️ Have session but AAL check failed - proceeding with caution')
        return { data }
      }

      if (aalData) {
        console.log(`📊 AAL Levels: current=${aalData.currentLevel}, next=${aalData.nextLevel}`)

        // Case 1: User already has AAL2 (MFA verified) - sign-in complete
        if (aalData.currentLevel === 'aal2') {
          console.log('✅ Already at AAL2 - sign-in complete')
          return { data }
        }

        // Case 2: No MFA enrolled (both levels are aal1) - check for Google MFA
        if (aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal1') {
          console.log('🔍 No Supabase MFA, checking for Google MFA...')

          // Check for Google MFA (stored in our custom database)
          try {
            const { BACKEND_BASE_URL } = await import('@/lib/backend');
            const userId = data?.session?.user?.id || data?.user?.id;

            if (userId) {
              const statusResponse = await fetch(`${BACKEND_BASE_URL}/api/google-mfa/status/${userId}`);

              if (statusResponse.ok) {
                const statusData = await statusResponse.json();

                if (statusData.enabled) {
                  console.log('✅ Google MFA is enabled, requesting verification...');

                  // Set MFA pending flag to prevent onAuthStateChange from interfering
                  mfaPendingRef.current = true;

                  // Don't sign out - keep the session but don't set user until verification
                  // Clear user state to prevent auto-navigation
                  setUser(null);
                  console.log('🔐 Cleared user state - will set after Google MFA verification');

                  return {
                    error: null,
                    requires2FA: true,
                    mfaMethod: 'google',
                    userId: userId // Store userId for verification
                  };
                } else {
                  console.log('✅ No Google MFA enabled - normal login');
                }
              }
            }
          } catch (googleError) {
            console.error('❌ Error checking Google MFA:', googleError);
            // Don't block sign-in if Google check fails
            // Restore user if we cleared it
            if (data?.session?.user) {
              setUser(data.session.user);
            }
          }

          console.log('✅ No MFA required - normal login')
          return { data }
        }

        // Case 3: MFA is required (aal1 -> aal2) - check for Google MFA
        if (aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
          console.log('🔐 MFA required - checking Google MFA...')

          try {
            const { BACKEND_BASE_URL } = await import('@/lib/backend');
            const userId = data?.session?.user?.id || data?.user?.id;

            if (userId) {
              const statusResponse = await fetch(`${BACKEND_BASE_URL}/api/google-mfa/status/${userId}`);

              if (statusResponse.ok) {
                const statusData = await statusResponse.json();

                if (statusData.enabled) {
                  console.log('✅ Google MFA is enabled, requesting verification...');

                  // Don't sign out - keep the session but don't set user until verification
                  // Clear user state to prevent auto-navigation
                  setUser(null);
                  console.log('🔐 Cleared user state - will set after Google MFA verification');

                  return {
                    error: null,
                    requires2FA: true,
                    mfaMethod: 'google',
                    userId: userId // Store userId for verification
                  };
                }
              }
            }
          } catch (googleError) {
            console.error('❌ Error checking Google MFA:', googleError);
            // Restore user and allow login (fail open) to fix the lockout,
            // but warn the user.
            if (data?.session?.user) {
              setUser(data.session.user);
            }
            toast({
              title: "Warning",
              description: "MFA failed (system error). Logging in for recovery.",
              variant: "destructive",
            });
          }

          // If we get here, MFA is required but no Google MFA found
          console.error('❌ MFA required but Google MFA is not configured');
          toast({
            title: "Error",
            description: "2FA is enabled but Google Authenticator is not configured",
            variant: "destructive",
          })
          return { error: new Error('MFA required but no factors found') }
        }
      }

      // Fallback: if we have a session but AAL check didn't work as expected
      // This should rarely happen, but log it
      if (data?.session) {
        console.warn('⚠️ Fallback: proceeding with session despite unclear AAL state')
        return { data }
      }

    } catch (mfaError) {
      console.error('❌ Error checking MFA requirement:', mfaError)
      // If check fails but we have a session, proceed (fallback for edge cases)
      if (data?.session) {
        console.warn('⚠️ Fallback: proceeding with session despite MFA check error')
        return { data }
      }
      // Otherwise return error
      toast({
        title: "Error",
        description: mfaError.message || "Unable to verify authentication",
        variant: "destructive",
      })
      return { error: mfaError }
    }

    // If we get here and there was an error, return it
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      return { error }
    }

    // Sign-in succeeded without MFA requirement
    console.log('✅ Sign-in succeeded without MFA')
    return { data }
  }

  // Verify 2FA during sign in
  const verify2FASignIn = async (factorId, challengeId, code, mfaMethod = 'google', userId = null) => {
    try {
      if (mfaMethod === 'google') {
        // Verify Google MFA via backend
        console.log('🔐 Verifying Google MFA code...');

        const { BACKEND_BASE_URL } = await import('@/lib/backend');

        // If userId is provided (from signIn result), use it; otherwise try to get from session
        let user_id = userId;
        if (!user_id) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
            throw new Error('User not authenticated. Please sign in again.');
          }
          user_id = currentUser.id;
        }

        const verifyResponse = await fetch(`${BACKEND_BASE_URL}/api/google-mfa/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user_id,
            token: code
          })
        });

        const verifyResult = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyResult.success) {
          toast({
            title: "Verification Failed",
            description: verifyResult.error || "Invalid verification code. Please try again.",
            variant: "destructive",
          })
          return { error: new Error(verifyResult.error || 'Verification failed') }
        }

        console.log('✅ Google MFA verified successfully');

        // Get the existing session (we kept it, just didn't set the user)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          console.error('Error getting session after Google verification:', sessionError)
          toast({
            title: "Error",
            description: "Verification successful but unable to establish session. Please sign in again.",
            variant: "destructive",
          })
          return { error: sessionError || new Error('No session') }
        }

        // Now set the user - session was kept, we just didn't set user until now
        mfaPendingRef.current = false; // Clear MFA pending flag
        setUser(session.user)
        toast({
          title: "Success",
          description: "Two-factor authentication verified successfully",
        })
        return { data: { session } }
      } else {
        // Only Google MFA is supported
        toast({
          title: "Error",
          description: "Only Google Authenticator MFA is supported.",
          variant: "destructive",
        })
        return { error: new Error('Unsupported MFA method') }
      }
    } catch (error) {
      console.error('Error in verify2FASignIn:', error)
      mfaPendingRef.current = false; // Clear MFA pending flag on error
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred during verification",
        variant: "destructive",
      })
      return { error }
    }
  }

  const signOut = async () => {
    mfaPendingRef.current = false; // Clear MFA pending flag
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }

    // ⭐ THE VITAL FIX: Use comprehensive cleanup to prevent 
    // the "431 Request Header Fields Too Large" error.
    performSupabaseCleanup();
  }

  // Refresh user data from Supabase (including metadata)
  const refreshUser = async () => {
    try {
      // Get the current user with fresh data
      const { data: { user: currentUser }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error refreshing user:', error)
        return
      }
      setUser(currentUser ?? null)
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUser,
    verify2FASignIn,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
