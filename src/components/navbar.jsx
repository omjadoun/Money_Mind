import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Moon, Sun, Settings, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

  export function Navbar({ onMenuClick }) {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const getInitials = (email) => {
    return email?.split("@")[0]?.substring(0, 2)?.toUpperCase() || "U";
  };

  const userMetadata = user?.user_metadata || {};
  const avatarUrl = userMetadata?.avatar_url || "";
  const firstName = userMetadata?.first_name || "";
  const lastName = userMetadata?.last_name || "";
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : user?.email?.split("@")[0] || "User";
  
  useEffect(() => {
  }, [user]);

  return (
    <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 sm:h-16 items-center px-3 sm:px-4 md:px-6 gap-2 sm:gap-3 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden touch-target-lg -ml-1"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent truncate">
            MoneyMind
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="h-10 w-10 sm:h-9 sm:w-9 touch-target"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 sm:h-5 sm:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 sm:h-5 sm:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {user && <NotificationDropdown />}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 sm:h-9 sm:w-9 rounded-full touch-target p-0">
                  <Avatar className="h-full w-full" key={`navbar-avatar-${avatarUrl || 'none'}`}>
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                      {getInitials(user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 sm:w-64" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 sm:gap-3 p-2 sm:p-3">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0" key={`dropdown-avatar-${avatarUrl || 'none'}`}>
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5 sm:space-y-1 leading-none min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">
                      {fullName}
                    </p>
                    <p className="w-full truncate text-xs sm:text-sm text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowProfileModal(true)} className="touch-target">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="touch-target">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="touch-target">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              onClick={() => setShowAuthModal(true)} 
              className="h-10 sm:h-9 px-3 sm:px-4 touch-target text-sm sm:text-base"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>
              View your profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24" key={`modal-avatar-${avatarUrl || 'none'}`}>
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold">{fullName}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">First Name</Label>
                <p className="text-sm font-medium">{firstName || "Not set"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Last Name</Label>
                <p className="text-sm font-medium">{lastName || "Not set"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm font-medium">{user?.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <p className="text-sm font-medium">{userMetadata.phone || "Not set"}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowProfileModal(false);
                  navigate("/settings");
                }}
              >
                Edit Profile
              </Button>
              <Button 
                className="flex-1"
                onClick={() => setShowProfileModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
