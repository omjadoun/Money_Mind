import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <Navbar />
          <main className="p-6 pt-20">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}