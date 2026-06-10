// Instant skeleton while any app page streams in — makes navigation feel
// immediate on mobile instead of "stuck" on the old screen.
export default function Loading() {
  return (
    <div className="flex flex-col anim-fade" style={{ gap: 18 }}>
      <div className="flex items-end justify-between" style={{ gap: 14 }}>
        <div className="flex flex-col" style={{ gap: 8 }}>
          <div className="skel" style={{ width: 110, height: 12 }} />
          <div className="skel" style={{ width: 180, height: 28 }} />
        </div>
        <div className="skel" style={{ width: 150, height: 54, borderRadius: 16 }} />
      </div>
      {[88, 200, 200, 140].map((h, i) => (
        <div key={i} className="skel" style={{ height: h, borderRadius: "var(--radius)" }} />
      ))}
    </div>
  );
}
