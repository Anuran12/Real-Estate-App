import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { router, useSegments } from "expo-router";
import { getCurrentUser } from "./appwrite";
import { useAppwrite } from "./useAppwrite";

interface User {
  $id: string;
  name: string;
  email: string;
  avatar: string;
}

interface GlobalContextType {
  isLogged: boolean;
  user: User | null;
  loading: boolean;
  refetch: (newParams: Record<string, string | number>) => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
  children: ReactNode;
  requireAuth?: boolean;
  allowedPaths?: string[];
}

export const GlobalProvider = ({
  children,
  requireAuth = false,
  allowedPaths = ["/sign-in", "/sign-up", "/forgot-password"],
}: GlobalProviderProps) => {
  const segments = useSegments();
  const {
    data: user = null,
    loading,
    refetch,
  } = useAppwrite({
    fn: async () => {
      try {
        return await getCurrentUser();
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
  });

  const isLogged = !!user;

  useEffect(() => {
    const checkSession = async () => {
      // Don't redirect while loading
      if (loading) return;

      // Get current path from segments
      const currentPath = "/" + segments.join("/");

      // Check if current path is allowed without auth
      const isAllowedPath = allowedPaths.some((path) =>
        currentPath.startsWith(path)
      );

      if (requireAuth && !isLogged && !isAllowedPath) {
        // Store the attempted URL to redirect back after login
        if (currentPath && !allowedPaths.includes(currentPath)) {
          router.push({
            pathname: "/sign-in",
            params: { redirect: currentPath },
          });
        } else {
          router.replace("/sign-in");
        }
      }

      // Redirect to home if user is logged in and trying to access auth pages
      if (isLogged && isAllowedPath) {
        router.replace("/");
      }
    };

    checkSession();
  }, [isLogged, loading, requireAuth, segments]);

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        user,
        loading,
        refetch,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context)
    throw new Error("useGlobalContext must be used within a GlobalProvider");

  return context;
};

// Utility HOC for protected routes
export const withAuth = (WrappedComponent: React.ComponentType<any>) => {
  return function WithAuthComponent(props: any) {
    return (
      <GlobalProvider requireAuth={true}>
        <WrappedComponent {...props} />
      </GlobalProvider>
    );
  };
};

export default GlobalProvider;
