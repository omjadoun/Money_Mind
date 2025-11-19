import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

export function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-background no-overflow">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex md:w-64 lg:w-72 bg-card border-r border-border flex-shrink-0">
          <Sidebar />
        </aside>

        {isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside className="fixed left-0 top-0 z-50 h-full w-64 sm:w-72 bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:hidden">
              <Sidebar onClose={() => setIsSidebarOpen(false)} />
            </aside>
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0 w-full">
          <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
          <main className="flex-1 w-full overflow-x-hidden">
            <div className="container-responsive max-w-[1400px] mx-auto py-4 sm:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
