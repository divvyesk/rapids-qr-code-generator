// "RAPIDS QR" in the ANSI Shadow figlet style, assembled letter by letter
const LETTERS = {
  R: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██║  ██║", "╚═╝  ╚═╝"],
  A: [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  P: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔═══╝ ", "██║     ", "╚═╝     "],
  I: ["██╗", "██║", "██║", "██║", "██║", "╚═╝"],
  D: ["██████╗ ", "██╔══██╗", "██║  ██║", "██║  ██║", "██████╔╝", "╚═════╝ "],
  S: ["███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝"],
  Q: [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║▄▄ ██║", "╚██████╔╝", " ╚══▀▀═╝ "],
  " ": ["  ", "  ", "  ", "  ", "  ", "  "],
};

const WORDMARK = Array.from({ length: 6 }, (_, row) =>
  [..."RAPIDS QR"].map((ch) => LETTERS[ch][row]).join("")
).join("\n");

export default function AsciiWordmark() {
  return (
    <pre className="ascii-wordmark" aria-hidden="true">
      {WORDMARK}
    </pre>
  );
}
