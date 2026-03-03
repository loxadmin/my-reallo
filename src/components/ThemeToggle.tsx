import { useState } from "react";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = () => {
  const [isLight, setIsLight] = useState(
    () => document.documentElement.classList.contains("light")
  );

  const toggle = () => {
    document.documentElement.classList.toggle("light");
    const nowLight = document.documentElement.classList.contains("light");
    setIsLight(nowLight);
    localStorage.setItem("reallo-theme", nowLight ? "light" : "dark");
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl glass-button"
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
    >
      {isLight ? (
        <Moon className="w-4 h-4 text-primary" />
      ) : (
        <Sun className="w-4 h-4 text-primary" />
      )}
    </button>
  );
};

export default ThemeToggle;
