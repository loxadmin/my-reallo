/**
 * Console Guard Utility - AGGRESSIVE
 * Implements strict protection against inspection and debugging.
 */

export const initConsoleGuard = () => {
  // Only disable in production to allow development
  if (import.meta.env.MODE === "development") return;

  // 1. Disable Right-Click
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  // 2. Shortcut Blocking (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Cmd+Opt+I, etc.)
  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (
      e.key === "F12" ||
      (modifier && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
      (modifier && (e.key === "U" || e.key === "S" || e.key === "P")) ||
      (isMac && e.altKey && e.metaKey && (e.key === "I" || e.key === "J" || e.key === "C" || e.key === "U"))
    ) {
      e.preventDefault();
      return false;
    }
  });

  // 3. Locking the Console
  const lockConsole = () => {
    const noop = () => {};
    // Capture the original clear method before overriding
    const originalClear = window.console.clear;

    // Override common console methods
    const consoleMethods = ['log', 'debug', 'info', 'warn', 'error', 'clear', 'table', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'count', 'assert', 'profile', 'profileEnd'];

    consoleMethods.forEach(method => {
      try {
        (window.console as any)[method] = noop;
      } catch (e) {}
    });

    // Periodically clear the console to keep it blank and prevent "Preserve log" bypasses
    setInterval(() => {
      try {
        if (typeof originalClear === 'function') {
          originalClear.call(window.console);
        }
      } catch (e) {}
    }, 50);
  };

  lockConsole();

  // 4. The Debugger Trap & DevTools Detection
  const mathEquations = `
    <div style="font-family: 'Times New Roman', serif; padding: 50px; background: white; color: black; height: 100vh; width: 100vw; position: fixed; top: 0; left: 0; z-index: 9999999; overflow: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
      <h1>Mathematical Analysis - Complex Systems</h1>
      <div style="font-size: 24px; line-height: 2;">
        <p>$$\\oint_C \\mathbf{E} \\cdot d\\mathbf{l} = -\\frac{d\\Phi_B}{dt}$$</p>
        <p>$$\\nabla \\times \\mathbf{B} = \\mu_0\\mathbf{J} + \\mu_0\\epsilon_0\\frac{\\partial\\mathbf{E}}{\\partial dt}$$</p>
        <p>$$\\Psi(r, t) = A e^{i(kr - \\omega t)}$$</p>
        <p>$$i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\left [ -\\frac{\\hbar^2}{2m}\\nabla^2 + V(\\mathbf{r},t) \\right ] \\Psi(\\mathbf{r},t)$$</p>
        <p>$$\\zeta(s) = \\sum_{n=1}^{\\infty} \\frac{1}{n^s} = \\prod_{p \\text{ prime}} \\frac{1}{1 - p^{-s}}$$</p>
        <p>$$R_{\\mu\\nu} - \\frac{1}{2}Rg_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}$$</p>
        <p>$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$</p>
        <p>$$e^{i\\pi} + 1 = 0$$</p>
        <p>$$\\frac{1}{\\pi} = \\frac{2\\sqrt{2}}{9801} \\sum_{k=0}^{\\infty} \\frac{(4k)!(1103+26390k)}{(k!)^4 396^{4k}}$$</p>
      </div>
    </div>
  `;

  let protectionTriggered = false;
  const triggerProtection = () => {
    if (protectionTriggered) return;
    protectionTriggered = true;
    document.body.innerHTML = mathEquations;
    document.body.style.pointerEvents = "none";
    document.body.style.userSelect = "none";
    document.title = "Complex Analysis";
  };

  // Continuous Debugger Trap
  const startTrap = () => {
    const check = () => {
      const start = new Date().getTime();
      debugger;
      const end = new Date().getTime();

      if (end - start > 100) {
        triggerProtection();
      }

      // Schedule next check immediately
      setTimeout(check, 50);
    };
    check();
  };

  startTrap();
};
