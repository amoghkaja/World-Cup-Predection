// Instant skeleton while any app page streams in — makes navigation feel
// immediate on mobile instead of "stuck" on the old screen.
export default function Loading() {
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div className="flex items-end justify-between" style={{ gap: 14 }}>
        <div className="skel" style={{ width: 150, height: 26 }} />
        <div className="skel" style={{ width: 170, height: 52, borderRadius: 14 }} />
      </div>
      {[64, 260, 260].map((h, i) => (
        <div key={i} className="skel" style={{ height: h, borderRadius: "var(--radius)" }} />
      ))}
    </div>
  );
}
