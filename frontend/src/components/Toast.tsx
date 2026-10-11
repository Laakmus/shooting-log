import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

const VISIBLE_MS = 2600;

const ToastContext = createContext<(text: string) => void>(() => {});

/** Returns a function that shows a short confirmation bar at the bottom of the screen. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((next: string) => {
    setText(next);
    setVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), VISIBLE_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-[22px] left-1/2 z-[60] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-4 rounded-[10px] bg-ink px-4 py-[11px] text-[13.5px] text-page shadow-[0_8px_28px_rgba(0,0,0,0.22)] transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${visible ? "translate-y-0" : "translate-y-[80px]"}`}
      >
        {text}
      </div>
    </ToastContext.Provider>
  );
}
