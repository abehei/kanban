import { useState } from "react";
import { Board } from "./components/Board";

export default function App() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <Board isDark={isDark} onToggleTheme={toggleTheme} />
    </div>
  );
}
