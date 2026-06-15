"use client";

import { useEffect, useRef } from "react";

/**
 * Minimal accessible modal: dialog semantics, Escape to close, body scroll
 * lock, focus moved in on open and restored on close. Plain dimmed backdrop —
 * no backdrop blur (it costs real frame time on low-end phones).
 */
export function Modal({
  onClose,
  label,
  maxWidth = 380,
  dismissible = true,
  children,
}: {
  onClose: () => void;
  label: string;
  maxWidth?: number;
  // When false, backdrop click and Escape do NOT close — the content must
  // provide its own explicit dismissal (e.g. a "must read" acknowledgement).
  dismissible?: boolean;
  children: React.ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Mount-only: focus the dialog, lock body scroll, bind Escape. Re-renders of
  // the parent (e.g. onboarding step changes) must not re-steal focus.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (dismissible && e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [dismissible]);

  return (
    <div
      onClick={dismissible ? onClose : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(8, 12, 9, 0.6)",
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      <div
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="card anim-pop"
        style={{
          maxWidth,
          width: "100%",
          overflow: "hidden",
          maxHeight: "88dvh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
          outline: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
