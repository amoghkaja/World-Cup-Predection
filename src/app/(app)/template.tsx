// Re-mounts on every navigation → each page gets a broadcast-style
// rise-in entrance. Purely presentational; reduced-motion users skip it.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="anim-rise">{children}</div>;
}
