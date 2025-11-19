import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";

import { AuthProvider } from "@/contexts/AuthContext";
import { TransactionProvider } from "@/contexts/TransactionContext";
import { BudgetProvider } from "@/contexts/BudgetContext";

import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRouter";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Budget = lazy(() => import("./pages/Budget"));
const Settings = lazy(() => import("./pages/Settings"));
const Premium = lazy(() => import("./pages/Premium"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const Chatbot = lazy(() => import("@/components/ui/chatbot"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="expense-tracker-theme">
      <AuthProvider>
        <TransactionProvider>
          <BudgetProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route 
                      path="/auth" 
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Auth />
                        </Suspense>
                      } 
                    />

                    <Route
                      path="/*"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <Suspense fallback={<PageLoader />}>
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/transactions" element={<Transactions />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/budget" element={<Budget />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/premium" element={<Premium />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>

                              <Chatbot />
                            </Suspense>
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </BudgetProvider>
        </TransactionProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
