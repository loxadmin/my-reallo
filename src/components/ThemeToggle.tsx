import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = () => {
  const [isLight, setIsLight] = useState(
    () => !document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem("reallo-theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsLight(false);
    } else {
      document.documentElement.classList.remove("dark");
      setIsLight(true);
    }
  }, []);

  const toggle = () => {
    const newIsLight = !isLight;
    if (newIsLight) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("reallo-theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("reallo-theme", "dark");
    }
    setIsLight(newIsLight);
  };

  return (
    <button
      onClick={toggle}
      className="p-2.5 rounded-[14px] glass-button border-none"
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
