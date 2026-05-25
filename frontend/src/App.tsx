import { useState } from "react";
import { Board } from "./components/Board";
import { applyAccentColor } from "./theme";

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [accentColorId, setAccentColorId] = useState("blue");

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const changeAccentColor = (colorId: string) => {
    setAccentColorId(colorId);
    applyAccentColor(colorId);
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <Board
        isDark={isDark}
        onToggleTheme={toggleTheme}
        accentColorId={accentColorId}
        onChangeAccentColor={changeAccentColor}
      />
    </div>
  );
}
