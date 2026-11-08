/**
 * Format an axis tick to three significant digits.
 *
 * @param {number} value - Coordinate value for the tick.
 * @returns {string} Formatted tick label.
 */
function formatTick(value) {
  return String(Number(value.toPrecision(3)));
}

/**
 * Find an axis range that includes all values and leaves a little padding.
 *
 * @param {number[]} values - Coordinate values for one axis.
 * @returns {[number, number]} Padded minimum and maximum.
 */
function getRange(values) {
  let min = Math.min(...values);
  let max = Math.max(...values);

  // Expand flat data so the graph has a visible range.
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const padding = (max - min) * 0.08;
  return [min - padding, max + padding];
}

/**
 * Render an XY Cartesian graph as a responsive SVG.
 *
 * Points are sorted by x-coordinate and joined to draw the graph curve.
 *
 * @param {Object} props
 * @param {Object} props.graph - Graph data.
 * @param {string} [props.graph.title] - Title shown above the graph.
 * @param {string} [props.graph.xLabel] - Horizontal-axis label.
 * @param {string} [props.graph.yLabel] - Vertical-axis label.
 * @param {{x: number, y: number}[]} [props.graph.points] - Graph coordinates.
 *
 * @example
 * <GraphPlot
 *   graph={{
 *     title: "Parabola",
 *     xLabel: "x",
 *     yLabel: "y",
 *     points: [
 *       { x: -2, y: 4 },
 *       { x: 0, y: 0 },
 *       { x: 2, y: 4 },
 *     ],
 *   }}
 * />
 */
export default function GraphPlot({ graph = {} }) {
  // Keep only points with valid numeric coordinates.
  const points = Array.isArray(graph.points)
    ? graph.points.filter(
        (point) =>
          Number.isFinite(point?.x) && Number.isFinite(point?.y)
      )
    : [];

  // Explain why the graph is blank when there are no usable points.
  if (points.length === 0) {
    return <p role="status">No graph points to display.</p>;
  }

  // SVG canvas size and room for tick labels and axis labels.
  const width = 720;
  const height = 440;
  const margin = { top: 24, right: 24, bottom: 64, left: 76 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Calculate padded coordinate ranges from the provided points.
  const [minX, maxX] = getRange(points.map((point) => point.x));
  const [minY, maxY] = getRange(points.map((point) => point.y));

  // Convert graph coordinates into pixel positions in the SVG.
  const scaleX = (x) =>
    margin.left + ((x - minX) / (maxX - minX)) * plotWidth;

  const scaleY = (y) =>
    margin.top + ((maxY - y) / (maxY - minY)) * plotHeight;

  // Generate five evenly spaced tick values for an axis.
  const makeTicks = (min, max) =>
    Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4);

  const xTicks = makeTicks(minX, maxX);
  const yTicks = makeTicks(minY, maxY);

  // Sort by x so the curve is drawn from left to right.
  const orderedPoints = [...points].sort((a, b) => a.x - b.x);

  // Convert all points to SVG coordinate strings for the polyline.
  const plottedPoints = orderedPoints
    .map((point) => `${scaleX(point.x)},${scaleY(point.y)}`)
    .join(" ");

  // Put the axes at zero when zero is in view; otherwise use the plot edge.
  const xAxisY = minY <= 0 && maxY >= 0 ? scaleY(0) : scaleY(minY);
  const yAxisX = minX <= 0 && maxX >= 0 ? scaleX(0) : scaleX(minX);

  const title = graph.title || "Graph";

  return (
    <figure style={{ width: "100%", margin: 0 }}>
      <figcaption style={{ fontWeight: 600, marginBottom: 8 }}>
        {title}
      </figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${title} with ${points.length} plotted points`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <rect width={width} height={height} fill="white" />

        {/* Vertical grid lines and x-axis tick labels. */}
        {xTicks.map((tick, index) => {
          const x = scaleX(tick);

          return (
            <g key={`x-${index}`}>
              <line
                x1={x}
                y1={margin.top}
                x2={x}
                y2={height - margin.bottom}
                stroke="#e5e7eb"
              />
              <text
                x={x}
                y={height - margin.bottom + 20}
                textAnchor="middle"
                fill="#374151"
                fontSize="12"
              >
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        {/* Horizontal grid lines and y-axis tick labels. */}
        {yTicks.map((tick, index) => {
          const y = scaleY(tick);

          return (
            <g key={`y-${index}`}>
              <line
                x1={margin.left}
                y1={y}
                x2={width - margin.right}
                y2={y}
                stroke="#e5e7eb"
              />
              <text
                x={margin.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="#374151"
                fontSize="12"
              >
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        {/* Main x- and y-axes. */}
        <g stroke="#374151" strokeWidth="2">
          <line
            x1={yAxisX}
            y1={margin.top}
            x2={yAxisX}
            y2={height - margin.bottom}
          />
          <line
            x1={margin.left}
            y1={xAxisY}
            x2={width - margin.right}
            y2={xAxisY}
          />
        </g>

        {/* Join every point to draw the Cartesian graph curve. */}
        {orderedPoints.length > 1 && (
          <polyline
            points={plottedPoints}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Draw a marker at every coordinate. */}
        {orderedPoints.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={scaleX(point.x)}
            cy={scaleY(point.y)}
            r="5"
            fill="#1d4ed8"
          >
            <title>{`(${point.x}, ${point.y})`}</title>
          </circle>
        ))}

        {/* Axis labels. */}
        <text
          x={margin.left + plotWidth / 2}
          y={height - 12}
          textAnchor="middle"
          fill="#111827"
        >
          {graph.xLabel || "x"}
        </text>

        <text
          x="18"
          y={margin.top + plotHeight / 2}
          textAnchor="middle"
          fill="#111827"
          transform={`rotate(-90 18 ${margin.top + plotHeight / 2})`}
        >
          {graph.yLabel || "y"}
        </text>
      </svg>
    </figure>
  );
}