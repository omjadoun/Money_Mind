import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Shield } from 'lucide-react'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [mfaMethod, setMfaMethod] = useState('whatsapp') // Only 'whatsapp' is supported
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFAFactorId, setTwoFAFactorId] = useState('')
  const [twoFAChallengeId, setTwoFAChallengeId] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  
  const { user, signIn, signUp, verify2FASignIn } = useAuth()
  const navigate = useNavigate()
  
  useEffect(() => {
    // Only navigate if user exists AND 2FA is not required
    if (user && !requires2FA) {
      navigate('/')
    }
  }, [user, navigate, requires2FA])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password)
        if (error) {
          setError(error.message)
        }
      } else {
        if (requires2FA && twoFACode) {
          // Verify 2FA code and complete sign-in
          console.log('🔐 Verifying 2FA code...', { method: mfaMethod })
          // Get userId from signIn result if WhatsApp MFA (stored in state or from result)
          // For now, we'll let verify2FASignIn get it from session or we can pass it
          const { error: verifyError } = await verify2FASignIn(
            twoFAFactorId,
            twoFAChallengeId,
            twoFACode,
            mfaMethod,
            null // userId - will be retrieved from session in verify2FASignIn
          )
          if (verifyError) {
            setError(verifyError.message || 'Invalid verification code')
            setTwoFACode('')
            setLoading(false)
          } else {
            // Sign-in successful after 2FA verification
            console.log('✅ 2FA verification and sign-in completed')
            setRequires2FA(false)
            setTwoFACode('')
            setTwoFAFactorId('')
            setTwoFAChallengeId('')
            setLoading(false)
            // User state will be updated by AuthContext, navigation happens via useEffect
          }
        } else {
          // Regular sign in
          console.log('🔐 Calling signIn with email:', email)
          const result = await signIn(email, password)
          console.log('📥 signIn result received:', { 
            hasError: !!result.error, 
            requires2FA: result.requires2FA,
            hasData: !!result.data,
            errorMessage: result.error?.message,
            factorId: result.factorId,
            challengeId: result.challengeId
          })
          
          if (result.error) {
            setError(result.error.message)
            setLoading(false)
          } else if (result.requires2FA) {
            // 2FA is required - store factor and challenge IDs
            console.log('🔐 Setting requires2FA=true, method:', result.mfaMethod, 'factorId:', result.factorId, 'challengeId:', result.challengeId)
            setRequires2FA(true)
            setMfaMethod(result.mfaMethod || 'whatsapp')
            setTwoFAFactorId(result.factorId || '')
            setTwoFAChallengeId(result.challengeId)
            setWhatsappNumber(result.whatsappNumber || '')
            setError('')
            setLoading(false) // Stop loading to show 2FA input
            console.log('🔐 2FA required for sign-in. Method:', result.mfaMethod || 'whatsapp')
          } else if (result.data) {
            // Sign-in successful without 2FA
            console.log('✅ Sign-in successful without 2FA')
            setLoading(false)
          } else {
            // Unexpected result
            console.warn('⚠️ Unexpected signIn result:', result)
            setError('Unexpected response from server')
            setLoading(false)
          }
        }
      }
    } catch (err) {
      console.error('❌ Exception in handleSubmit:', err)
      setError(err?.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-3 sm:px-4 py-6 sm:py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
            {requires2FA ? 'Two-Factor Authentication' : (isSignUp ? 'Create Account' : 'Welcome Back')}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-2 sm:mt-3 px-2">
            {requires2FA 
              ? `Enter the 6-digit code sent to ${whatsappNumber || 'your WhatsApp'}`
              : (isSignUp 
                ? 'Sign up to start managing your finances' 
                : 'Sign in to your Money Mind account')
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {requires2FA ? (
              <div className="space-y-4 sm:space-y-5">
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10">
                    <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  </div>
                  <div className="text-center space-y-1 sm:space-y-2">
                    <Label className="text-sm sm:text-base font-semibold">Enter Verification Code</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground px-2">
                      Check your WhatsApp for the 6-digit code sent to {whatsappNumber || 'your number'}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-center px-2">
                  <InputOTP
                    maxLength={6}
                    value={twoFACode}
                    onChange={(value) => setTwoFACode(value)}
                    disabled={loading}
                    autoFocus
                    className="gap-2 sm:gap-3"
                  >
                    <InputOTPGroup className="gap-2 sm:gap-3">
                      <InputOTPSlot index={0} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                      <InputOTPSlot index={1} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                      <InputOTPSlot index={2} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                      <InputOTPSlot index={3} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                      <InputOTPSlot index={4} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                      <InputOTPSlot index={5} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                
                <p className="text-xs text-center text-muted-foreground px-2">
                  Didn't receive the code? Check your WhatsApp messages or try again.
                </p>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full touch-target"
                  onClick={() => {
                    setRequires2FA(false)
                    setMfaMethod('whatsapp')
                    setTwoFACode('')
                    setTwoFAFactorId('')
                    setTwoFAChallengeId('')
                    setWhatsappNumber('')
                    setError('')
                  }}
                  disabled={loading}
                >
                  ← Back to Sign In
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 sm:h-10 text-base sm:text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="h-11 sm:h-10 text-base sm:text-sm"
                  />
                </div>
              </>
            )}
            
            {error && (
              <Alert variant="destructive" className="text-xs sm:text-sm">
                <AlertDescription className="break-words">{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full touch-target-lg text-sm sm:text-base"
              disabled={loading || (requires2FA && twoFACode.length !== 6)}
            >
              {loading ? 'Loading...' : (
                requires2FA ? 'Verify Code' : (isSignUp ? 'Create Account' : 'Sign In')
              )}
            </Button>
          </form>
          
          <div className="text-center mt-4 sm:mt-5">
            <Button
              variant="ghost"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
              }}
              disabled={loading}
              className="touch-target text-xs sm:text-sm"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}