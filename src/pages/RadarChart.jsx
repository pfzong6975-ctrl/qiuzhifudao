// SVG Radar Chart Component
export default function RadarChart({ data, size = 240, color = '#6366f1' }) {
  if (!data || !Array.isArray(data)) return null;

  const cx = size / 2, cy = size / 2, r = size * 0.36;
  const levels = 5;
  const angleSlice = (Math.PI * 2) / data.length;

  function getPoint(idx, value, maxVal) {
    const angle = angleSlice * idx - Math.PI / 2;
    const dist = (value / 100) * r;
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  }

  // Grid polygons
  const gridPolygons = [];
  for (let lv = 1; lv <= levels; lv++) {
    const points = data.map((_, i) => {
      const p = getPoint(i, (lv / levels) * 100, 100);
      return `${p.x},${p.y}`;
    }).join(' ');
    gridPolygons.push(<polygon key={lv} points={points} fill="none" stroke="#e2e8f0" strokeWidth={lv === 3 ? 1.5 : 1} />);
  }

  // Axes
  const axes = data.map((_, i) => {
    const p = getPoint(i, 100, 100);
    return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={1} />;
  });

  // Data polygon
  const dataPoints = data.map((d, i) => {
    const p = getPoint(i, d.value, 100);
    return `${p.x},${p.y}`;
  }).join(' ');
  const dataPolygon = <polygon points={dataPoints} fill={`${color}20`} stroke={color} strokeWidth={2.5} />;

  // Data dots
  const dots = data.map((d, i) => {
    const p = getPoint(i, d.value, 100);
    return <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke="white" strokeWidth={2} />;
  });

  // Labels
  const labels = data.map((d, i) => {
    const p = getPoint(i, 115, 100);
    return (
      <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
        fontSize={11} fill="#475569" fontWeight={500}>
        {d.label}
      </text>
    );
  });

  // Score labels
  const scores = data.map((d, i) => {
    const p = getPoint(i, 85, 100);
    return (
      <text key={`s${i}`} x={p.x} y={p.y - 2} textAnchor="middle"
        fontSize={10} fontWeight={700} fill={color}>
        {d.value}
      </text>
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      {gridPolygons}
      {axes}
      {dataPolygon}
      {dots}
      {scores}
      {labels}
    </svg>
  );
}
