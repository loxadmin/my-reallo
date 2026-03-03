import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme from localStorage
const savedTheme = localStorage.getItem("reallo-theme");
if (savedTheme === "light") {
  document.documentElement.classList.add("light");
}

createRoot(document.getElementById("root")!).render(<App />);
