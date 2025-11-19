import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Wallet,
  Settings,
  Crown,
  X
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Budget", href: "/budget", icon: Wallet },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar({ onClose }) {
  const location = useLocation()

  const handleNavClick = () => {
    if (onClose && window.innerWidth < 768) {
      onClose()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 border-b border-border">
        <h2 className="text-base sm:text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
          MoneyMind🧠
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden touch-target"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 sm:py-2 text-sm sm:text-base font-medium transition-colors touch-target",
                "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
