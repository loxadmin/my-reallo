import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme from localStorage
const savedTheme = localStorage.getItem("reallo-theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  // Default to light mode (or if savedTheme is 'light')
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
