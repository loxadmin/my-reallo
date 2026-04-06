/**
 * Console Guard Utility
 * Highly aggressive protection to "lock" the frontend console and prevent inspection.
 * This script disables right-click, DevTools shortcuts, and neutralizes the console.
 * It also includes a "Math Shield" to replace the elements section with obfuscated
 * mathematical expressions if inspection is detected.
 */

export const initConsoleGuard = () => {
  // Only enable in production to avoid hindering development
  if (import.meta.env.DEV) return;

  // Store a reference to the real console.clear before we neutralize it
  const realConsole = { ...window.console };
  const realClear = realConsole.clear || (() => {});

  // 1. Disable right-click (context menu)
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  }, false);

  // 2. Disable common DevTools keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (
      e.code === "F12" ||
      (modifier && e.shiftKey && (e.code === "KeyI" || e.code === "KeyJ" || e.code === "KeyC" || e.code === "KeyK")) ||
      (isMac && e.altKey && modifier && (e.code === "KeyI" || e.code === "KeyJ" || e.code === "KeyC")) ||
      (modifier && (e.code === "KeyU" || e.code === "KeyS"))
    ) {
      e.preventDefault();
      return false;
    }
  }, false);

  // 3. Neutralize and LOCK console methods
  const noop = () => {};
  const methods = [
    'log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir',
    'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'count',
    'assert', 'clear'
  ];

  methods.forEach(method => {
    try {
      Object.defineProperty(window.console, method, {
        value: noop,
        writable: false,
        configurable: false
      });
    } catch (e) {
      (window.console as any)[method] = noop;
    }
  });

  // 4. Generate "Math Shield" content
  const generateMathShield = () => {
    const mathSymbols = ['∫', '∑', '∏', '∂', '∇', '∆', '∞', '≈', '≠', '≡', '≤', '≥', '√', '∛', '∜', '∝', '∠', 'sin', 'cos', 'tan', 'log', 'exp', 'π', 'θ', 'λ', 'μ', 'σ', 'Ω'];
    const hexChars = '0123456789ABCDEF';
    let content = '<div style="background: black; color: #00ff00; font-family: monospace; padding: 20px; height: 100vh; overflow: hidden; font-size: 10px; line-height: 1.2;">';

    for (let i = 0; i < 5000; i++) {
      const type = Math.floor(Math.random() * 4);
      if (type === 0) {
        // Random math expression
        content += mathSymbols[Math.floor(Math.random() * mathSymbols.length)] + '(' + Math.random().toString(16).substring(2, 6) + ') ';
      } else if (type === 1) {
        // Hex dump
        content += '0x' + Array.from({length: 8}, () => hexChars[Math.floor(Math.random() * 16)]).join('') + ' ';
      } else if (type === 2) {
        // Obfuscated string
        content += btoa(Math.random().toString()).substring(0, 10) + ' ';
      } else {
        // Logical operators
        content += ' ∀x∈ℝ ∃y s.t. f(x)→' + (Math.random() > 0.5 ? '∞' : '0') + ' ';
      }
      if (i % 10 === 0) content += '<br>';
    }
    content += '</div>';
    return content;
  };

  let isShieldActive = false;
  const activateShield = () => {
    if (isShieldActive) return;
    isShieldActive = true;
    document.body.innerHTML = generateMathShield();
    // Also clear console one last time with real clear
    try { realClear.call(realConsole); } catch (e) {}
  };

  // 5. Anti-debugging trap (Debugger Loop)
  const launchDebuggerTrap = () => {
    const start = Date.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = Date.now();

    if (end - start > 100) {
      // DevTools detected via debugger pause
      activateShield();
    }

    setTimeout(launchDebuggerTrap, 200);
  };

  // 6. Detection via window dimension threshold (docked DevTools)
  const threshold = 160;
  setInterval(() => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;

    if (widthThreshold || heightThreshold) {
      activateShield();
    }
  }, 500);

  // Start the trap
  launchDebuggerTrap();

  // Initial clear
  try { realClear.call(realConsole); } catch (e) {}
};
