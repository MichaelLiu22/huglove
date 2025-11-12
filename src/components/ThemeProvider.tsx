import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Check time and set theme accordingly
    const updateThemeByTime = () => {
      const hour = new Date().getHours();
      // Dark mode from 18:00 (6 PM) to 06:00 (6 AM)
      const isDarkTime = hour >= 18 || hour < 6;
      const newTheme = isDarkTime ? "dark" : "light";
      
      setTheme(newTheme);
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
    };

    // Update immediately
    updateThemeByTime();

    // Check every minute
    const interval = setInterval(updateThemeByTime, 60000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
