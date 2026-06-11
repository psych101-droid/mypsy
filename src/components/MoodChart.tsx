/**
 * Simple, non-alarming mood trend line (spec §3.3) — a quiet SVG sparkline,
 * not a clinical chart. Server-renderable.
 */
export function MoodChart({
  points,
}: {
  points: { mood: number; created_at: string }[];
}) {
  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-sm text-ink-soft">
        Check in a few more times and your mood trend will appear here.
      </p>
    );
  }

  const width = 320;
  const height = 96;
  const padding = 10;

  const xs = points.map((_, i) =>
    points.length === 1
      ? width / 2
      : padding + (i * (width - padding * 2)) / (points.length - 1)
  );
  const ys = points.map(
    (p) => height - padding - ((p.mood - 1) / 4) * (height - padding * 2)
  );
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Mood trend over time"
    >
      {[1, 3, 5].map((mood) => {
        const y = height - padding - ((mood - 1) / 4) * (height - padding * 2);
        return (
          <line
            key={mood}
            x1={padding}
            x2={width - padding}
            y1={y}
            y2={y}
            stroke="#dce8f3"
            strokeWidth="1"
          />
        );
      })}
      <path
        d={path}
        fill="none"
        stroke="#2b5f8e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3" fill="#d9892e" />
      ))}
    </svg>
  );
}
