import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  User,
  Bell,
  Shield,
  Download,
  Upload,
  Camera,
  Mail,
  Lock,
  Globe,
  Loader2,
  X
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useTransactions } from "@/contexts/TransactionContext"
import { useBudgets } from "@/contexts/BudgetContext"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"
import { BACKEND_BASE_URL } from "@/lib/backend"

export default function Settings() {
  const {
    user,
    signOut,
    refreshUser
  } = useAuth()
  const { transactions } = useTransactions()
  const { budgets } = useBudgets()
  const { toast } = useToast()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  // Profile state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [profileLoading, setProfileLoading] = useState(false)

  // Password change dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Delete account dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [budgetWarning80, setBudgetWarning80] = useState(true)
  const [budgetExceeded, setBudgetExceeded] = useState(true)
  const [monthlyReports, setMonthlyReports] = useState(true)

  // Preferences
  const [currency, setCurrency] = useState("usd")
  const [timezone, setTimezone] = useState("pst")
  const [dateFormat, setDateFormat] = useState("mm-dd-yyyy")
  const [language, setLanguage] = useState("en")

  // Google MFA state
  const [googleMfaEnabled, setGoogleMfaEnabled] = useState(false)
  const [googleMfaSetup, setGoogleMfaSetup] = useState(null) // { secret, qrCode }
  const [googleMfaCode, setGoogleMfaCode] = useState('')
  const [isEnablingMfa, setIsEnablingMfa] = useState(false)
  const [twoFALoading, setTwoFALoading] = useState(false)

  // Load user data and preferences
  useEffect(() => {
    if (user) {
      const metadata = user.user_metadata || {}
      setFirstName(metadata.first_name || "")
      setLastName(metadata.last_name || "")
      setEmail(user.email || "")
      setPhone(metadata.phone || "")
      setAvatarUrl(metadata.avatar_url || "")

      // Load preferences from localStorage
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}")
      setCurrency(prefs.currency || "usd")
      setTimezone(prefs.timezone || "pst")
      setDateFormat(prefs.dateFormat || "mm-dd-yyyy")
      setLanguage(prefs.language || "en")

      // Load notification settings
      const notifSettings = JSON.parse(localStorage.getItem("notificationSettings") || "{}")
      setEmailNotifications(notifSettings.emailNotifications !== false)
      setBudgetWarning80(notifSettings.budgetWarning80 !== false)
      setBudgetExceeded(notifSettings.budgetExceeded !== false)
      setMonthlyReports(notifSettings.monthlyReports !== false)

      // Check Google MFA status
      const checkGoogleMfaStatus = async () => {
        try {
          const response = await fetch(`${BACKEND_BASE_URL}/api/google-mfa/status/${user.id}`)
          const data = await response.json()
          if (data.enabled) {
            setGoogleMfaEnabled(true)
          } else {
            setGoogleMfaEnabled(false)
          }
        } catch (error) {
          console.error("Error checking Google MFA status:", error)
        }
      }
      checkGoogleMfaStatus()
    }
  }, [user])

  // Get user initials for avatar
  const getUserInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return "U"
  }

  // Handle profile photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    try {
      setProfileLoading(true)

      const formData = new FormData()
      formData.append('avatar', file)
      formData.append('userId', user.id)

      const response = await fetch(`${BACKEND_BASE_URL}/api/account/upload-avatar`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload image')
      }

      // Update local state
      setAvatarUrl(result.publicUrl)

      // Refresh user in background to update navbar
      refreshUser().catch(console.error)

      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      })

    } catch (error) {
      console.error("Error updating photo:", error)
      // Don't clear existing avatar on error
      toast({
        title: "Error",
        description: error.message || "Failed to update photo",
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle remove photo
  const handleRemovePhoto = async () => {
    try {
      setProfileLoading(true)
      setAvatarUrl("") // Update immediately

      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      })
      if (error) {
        const metadata = user?.user_metadata || {}
        setAvatarUrl(metadata.avatar_url || "")
        throw error
      }

      refreshUser().catch(console.error)
      toast({
        title: "Success",
        description: "Profile photo removed",
      })
    } catch (error) {
      console.error("Error removing photo:", error)
      toast({
        title: "Error",
        description: "Failed to remove photo",
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
    }
  }

  // Handle save profile
  const handleSaveProfile = async () => {
    try {
      setProfileLoading(true)
      const { error } = await supabase.auth.updateUser({
        email: email,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        }
      })

      if (error) throw error

      refreshUser().catch(console.error)
      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
    }
  }

  // Handle change password
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    try {
      setPasswordLoading(true)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Password updated successfully",
      })
      setPasswordDialogOpen(false)
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      console.error("Error changing password:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  // Handle export data
  const handleExportData = () => {
    try {
      // Export transactions
      const transactionsCSV = [
        ["Type", "Amount", "Category", "Description", "Date", "Payment Method"],
        ...transactions.map(t => [
          t.type,
          t.amount,
          t.category,
          t.description || "",
          t.date,
          t.payment_method || ""
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n")

      // Export budgets
      const budgetsCSV = [
        ["Category", "Budget Limit", "Start Date", "End Date"],
        ...budgets.map(b => [
          b.category,
          b.budget_limit,
          b.start_date,
          b.end_date
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n")

      // Create download
      const transactionsBlob = new Blob([transactionsCSV], { type: "text/csv" })
      const budgetsBlob = new Blob([budgetsCSV], { type: "text/csv" })

      const transactionsUrl = URL.createObjectURL(transactionsBlob)
      const budgetsUrl = URL.createObjectURL(budgetsBlob)

      const transactionsLink = document.createElement("a")
      transactionsLink.href = transactionsUrl
      transactionsLink.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`
      transactionsLink.click()

      setTimeout(() => {
        const budgetsLink = document.createElement("a")
        budgetsLink.href = budgetsUrl
        budgetsLink.download = `budgets-${new Date().toISOString().split("T")[0]}.csv`
        budgetsLink.click()

        URL.revokeObjectURL(transactionsUrl)
        URL.revokeObjectURL(budgetsUrl)
      }, 500)

      toast({
        title: "Success",
        description: "Data exported successfully",
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      })
    }
  }

  // Handle save preferences
  const handleSavePreferences = () => {
    const preferences = {
      currency,
      timezone,
      dateFormat,
      language,
    }
    localStorage.setItem("userPreferences", JSON.stringify(preferences))
    toast({
      title: "Success",
      description: "Preferences saved successfully",
    })
  }

  // Handle save notification settings
  useEffect(() => {
    const settings = {
      emailNotifications,
      budgetWarning80,
      budgetExceeded,
      monthlyReports,
    }
    localStorage.setItem("notificationSettings", JSON.stringify(settings))
  }, [emailNotifications, budgetWarning80, budgetExceeded, monthlyReports])

  // Google MFA Handlers
  const handleEnableGoogleMFA = async () => {
    try {
      setIsEnablingMfa(true)
      setTwoFALoading(true)

      const response = await fetch(`${BACKEND_BASE_URL}/api/google-mfa/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email })
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error || "Failed to generate MFA secret")

      setGoogleMfaSetup(result) // { secret, qrCode }
      toast({
        title: "Scan QR Code",
        description: "Please scan the QR code with your authenticator app.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsEnablingMfa(false)
      setTwoFALoading(false)
    }
  }

  const handleVerifyGoogleSetup = async () => {
    if (!googleMfaCode) {
      toast({ title: "Error", description: "Please enter the code", variant: "destructive" })
      return
    }

    try {
      setTwoFALoading(true)
      const response = await fetch(`${BACKEND_BASE_URL}/api/google-mfa/verify-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          token: googleMfaCode,
          secret: googleMfaSetup.secret
        })
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error || "Verification failed")

      setGoogleMfaEnabled(true)
      setGoogleMfaSetup(null)
      setGoogleMfaCode('')
      toast({
        title: "Success",
        description: "Two-factor authentication enabled successfully!",
      })
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTwoFALoading(false)
    }
  }

  const handleDisableGoogleMFA = async () => {
    try {
      setTwoFALoading(true)
      const response = await fetch(`${BACKEND_BASE_URL}/api/google-mfa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (!response.ok) throw new Error("Failed to disable MFA")

      setGoogleMfaEnabled(false)
      setGoogleMfaSetup(null)
      toast({
        title: "Disabled",
        description: "Two-factor authentication has been disabled.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTwoFALoading(false)
    }
  }

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast({
        title: "Error",
        description: "Please type DELETE to confirm",
        variant: "destructive",
      })
      return
    }

    try {
      setDeleteLoading(true)

      // Get the current session to get access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error("Unable to get current session. Please try signing out and back in.")
      }

      // Call backend API to delete account
      const response = await fetch(`${BACKEND_BASE_URL}/api/account/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          accessToken: session.access_token,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete account")
      }

      // Clear local storage (notifications, preferences, etc.)
      try {
        localStorage.removeItem(`money_mind_notifications_${user.id}`)
        localStorage.removeItem(`money_mind_last_transaction_check_${user.id}`)
        localStorage.removeItem("notificationSettings")
        localStorage.removeItem("userPreferences")
      } catch (storageError) {
        console.warn("Error clearing localStorage:", storageError)
      }

      // Sign out and redirect
      await signOut()
      navigate("/auth")

      toast({
        title: "Account Deleted",
        description: "Your account and all data have been permanently deleted",
      })
    } catch (error) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-5xl mx-auto px-2 sm:px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your account preferences and settings</p>
      </div>

      {/* Profile Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information and profile photo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20" key={`settings-avatar-${avatarUrl || "none"}`}>
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={profileLoading}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Profile Photo</h3>
              <p className="text-sm text-muted-foreground">
                Click the camera icon to upload a new photo
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={profileLoading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePhoto}
                  disabled={profileLoading || !avatarUrl}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm sm:text-base">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={profileLoading}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm sm:text-base">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={profileLoading}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={profileLoading}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm sm:text-base">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={profileLoading}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={profileLoading} className="touch-target-lg w-full sm:w-auto">
              {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Privacy
          </CardTitle>
          <CardDescription>Manage your account security and privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span className="font-medium">Password</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Change your account password
                </p>
              </div>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(true)} className="touch-target-lg w-full sm:w-auto">
                Change Password
              </Button>
            </div>

            <Separator />

            {/* Google MFA Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Two-Factor Authentication</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Secure your account with Google Authenticator
                  </p>
                </div>
                {googleMfaEnabled ? (
                  <Button variant="destructive" onClick={handleDisableGoogleMFA} disabled={twoFALoading}>
                    {twoFALoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable"}
                  </Button>
                ) : (
                  !googleMfaSetup && (
                    <Button onClick={handleEnableGoogleMFA} disabled={twoFALoading}>
                      {twoFALoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable"}
                    </Button>
                  )
                )}
              </div>

              {/* Setup UI */}
              {!googleMfaEnabled && googleMfaSetup && (
                <div className="mt-4 space-y-4 border p-4 rounded-md bg-muted/50">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-between w-full">
                      <Label className="text-lg font-semibold">Scan QR Code</Label>
                      <Button variant="ghost" size="icon" onClick={() => setGoogleMfaSetup(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="bg-white p-2 rounded-lg">
                      <img src={googleMfaSetup.qrCode} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                      Open your authenticator app (like Google Authenticator) and scan this code.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Enter Verification Code</Label>
                    <div className="flex gap-2">
                      <Input
                        value={googleMfaCode}
                        onChange={(e) => setGoogleMfaCode(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="font-mono text-center tracking-widest text-lg"
                      />
                      <Button onClick={handleVerifyGoogleSetup} disabled={twoFALoading}>
                        {twoFALoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Enabled Status */}
              {googleMfaEnabled && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ 2FA is enabled. You'll need to enter a code from your authenticator app when signing in.
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-medium">Data Export</span>
                <p className="text-sm text-muted-foreground">
                  Download all your data in CSV format
                </p>
              </div>
              <Button variant="outline" className="gap-2 touch-target-lg w-full sm:w-auto" onClick={handleExportData}>
                <Download className="h-4 w-4" />
                <span className="text-sm sm:text-base">Export Data</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Email Notifications</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about your expenses
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <span className="font-medium">Budget Alerts</span>
              <p className="text-xs text-muted-foreground ml-6">
                Receive email alerts when your spending approaches budget limits
              </p>
              <div className="space-y-3 ml-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm">Budget warning at 80%</span>
                    <p className="text-xs text-muted-foreground">
                      Get notified when you&apos;ve used 80% of your budget
                    </p>
                  </div>
                  <Switch
                    checked={budgetWarning80}
                    onCheckedChange={setBudgetWarning80}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm">When I exceed my budget</span>
                    <p className="text-xs text-muted-foreground">
                      Alert when spending exceeds budget limit
                    </p>
                  </div>
                  <Switch
                    checked={budgetExceeded}
                    onCheckedChange={setBudgetExceeded}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <span className="font-medium">Monthly Reports</span>
              <p className="text-xs text-muted-foreground ml-6">
                Receive comprehensive monthly financial reports via email
              </p>
              <div className="space-y-3 ml-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm">Monthly financial report</span>
                    <p className="text-xs text-muted-foreground">
                      Complete summary with income, expenses, budgets, and CSV download
                    </p>
                  </div>
                  <Switch
                    checked={monthlyReports}
                    onCheckedChange={setMonthlyReports}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm">Report delivery date</span>
                    <p className="text-xs text-muted-foreground">
                      Sent on the 1st of each month at 9:00 AM
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Automatic</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Preferences
          </CardTitle>
          <CardDescription>Customize your app experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-sm sm:text-base">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency" className="h-11 sm:h-10 text-base sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                  <SelectItem value="gbp">GBP (£)</SelectItem>
                  <SelectItem value="cad">CAD (C$)</SelectItem>
                  <SelectItem value="inr">INR (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm sm:text-base">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone" className="h-11 sm:h-10 text-base sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                  <SelectItem value="mst">Mountain Time (MST)</SelectItem>
                  <SelectItem value="cst">Central Time (CST)</SelectItem>
                  <SelectItem value="est">Eastern Time (EST)</SelectItem>
                  <SelectItem value="ist">India Standard Time (IST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFormat" className="text-sm sm:text-base">Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger id="dateFormat" className="h-11 sm:h-10 text-base sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language" className="text-sm sm:text-base">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language" className="h-11 sm:h-10 text-base sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSavePreferences} className="touch-target-lg w-full sm:w-auto">Save Preferences</Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="shadow-card border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>These actions cannot be undone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="space-y-1">
              <span className="font-medium">Delete Account</span>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="touch-target-lg w-full sm:w-auto"
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your new password. Make sure it&apos;s at least 6 characters long.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={passwordLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={passwordLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false)
                setNewPassword("")
                setConfirmPassword("")
              }}
              disabled={passwordLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers. All your transactions, budgets,
              and settings will be permanently deleted.
              <div className="mt-4 space-y-2">
                <Label htmlFor="deleteConfirm">Type DELETE to confirm:</Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  disabled={deleteLoading}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteLoading || deleteConfirmText !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
