import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import GlassButton from "./GlassButton";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <GlassButton
      variant="outline"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-xl h-10 w-10 flex items-center justify-center"
      title="Toggle Theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </GlassButton>
  );
};

export default ThemeToggle;
