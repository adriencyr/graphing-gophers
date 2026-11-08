/**
 * Format an axis tick using the precision implied by its interval.
 *
 * @param {number} value - Coordinate value for the tick.
 * @param {number} step - Distance between adjacent ticks.
 * @returns {string} Formatted tick label.
 */
function formatTick(value, step) {
  // Avoid displaying "-0" when floating-point math produces a tiny value.
  const safeValue = Math.abs(value) < step * 1e-10 ? 0 : value;

  // Use scientific notation for very small intervals or very large values.
  if (Math.abs(step) < 1e-6 || Math.abs(safeValue) >= 1e9) {
    return Number(safeValue.toPrecision(3)).toString();
  }

  const decimalPlaces = Math.min(
    10,
    Math.max(0, Math.ceil(-Math.log10(step)))
  );

  return Number(safeValue.toFixed(decimalPlaces)).toString();
}

/**
 * Find a padded range that includes all values.
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
 * Generate axis ticks at readable intervals such as 1, 2, or 5
 * multiplied by a power of ten.
 *
 * @param {number} min - Minimum visible coordinate.
 * @param {number} max - Maximum visible coordinate.
 * @param {number} targetCount - Approximate number of desired ticks.
 * @returns {{ values: number[], step: number }} Tick values and interval.
 */
function makeTicks(min, max, targetCount = 6) {
  const rawStep = (max - min) / Math.max(1, targetCount - 1);

  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return { values: [min], step: 1 };
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;

  const niceMultiplier =
    normalizedStep <= 1
      ? 1
      : normalizedStep <= 2
        ? 2
        : normalizedStep <= 5
          ? 5
          : 10;

  const step = niceMultiplier * magnitude;
  const firstTick = Math.ceil(min / step - 1e-10) * step;
  const values = [];

  // Prevent an unexpectedly dense range from creating too many ticks.
  for (let index = 0; index < 100; index += 1) {
    const tick = firstTick + index * step;

    if (tick > max + step * 1e-10) break;

    values.push(Number(tick.toPrecision(14)));
  }

  return { values, step };
}

/**
 * Render an XY Cartesian graph as a responsive SVG.
 *
 * The valid points are sorted by x-coordinate and joined with straight
 * segments. This matches linear interpolation used by graph facts and
 * sonification.
 *
 * @param {Object} props
 * @param {Object} props.graph - Graph data.
 * @param {{x: number, y: number} | null} [props.selectedPoint] - Audio cursor.
 * @param {boolean} [props.showPoints=true] - Show individual point markers.
 * @param {Array<Array<{x: number, y: number}>>} [props.graph.segments]
 *   Optional separate curves, used to preserve equation domain gaps.
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
export default function GraphPlot({
  graph = {}, showPoints = true, selectedPoint = null,
}) {
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

  // Calculate padded coordinate ranges from the supplied points.
  const [minX, maxX] = getRange(points.map((point) => point.x));
  const [minY, maxY] = getRange(points.map((point) => point.y));

  // Convert graph coordinates to pixel positions in the SVG.
  const scaleX = (x) =>
    margin.left + ((x - minX) / (maxX - minX)) * plotWidth;

  const scaleY = (y) =>
    margin.top + ((maxY - y) / (maxY - minY)) * plotHeight;

  // Generate readable tick intervals for both axes.
  const xTickData = makeTicks(minX, maxX);
  const yTickData = makeTicks(minY, maxY);

  // Sort points from left to right before drawing the graph.
  const orderedPoints = [...points].sort((a, b) => a.x - b.x);

  // Equation graphs can contain gaps; image-based graphs use one curve.
  const segments = Array.isArray(graph.segments)
    ? graph.segments.filter(Array.isArray).map((segment) => segment.filter(
        (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y),
      ))
    : [orderedPoints];

  // Put axes at zero when zero is visible; otherwise use a plot edge.
  const xAxisY =
    minY <= 0 && maxY >= 0 ? scaleY(0) : scaleY(minY);
  const yAxisX =
    minX <= 0 && maxX >= 0 ? scaleX(0) : scaleX(minX);

  const title = graph.title || "Graph";
  const xLabel = graph.xLabel || "x";
  const yLabel = graph.yLabel || "y";

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

        {/* Vertical grid lines and formatted x-axis tick labels. */}
        {xTickData.values.map((tick, index) => {
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
                {formatTick(tick, xTickData.step)}
              </text>
            </g>
          );
        })}

        {/* Horizontal grid lines and formatted y-axis tick labels. */}
        {yTickData.values.map((tick, index) => {
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
                {formatTick(tick, yTickData.step)}
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

        {/* Draw each continuous section separately, preserving domain gaps. */}
        {segments.filter((segment) => segment.length > 1).map((segment, i) => (
          <polyline
            key={i}
            points={segment.map((point) =>
              `${scaleX(point.x)},${scaleY(point.y)}`).join(" ")}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Draw a marker at every supplied coordinate. */}
        {showPoints && orderedPoints.map((point, index) => (
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

        {/* The audio cursor uses the same coordinate transform as the curve. */}
        {Number.isFinite(selectedPoint?.x) &&
          Number.isFinite(selectedPoint?.y) && (
          <g aria-label={`Selected point x ${selectedPoint.x}, ` +
            `y ${selectedPoint.y}`}>
            <line
              x1={scaleX(selectedPoint.x)} x2={scaleX(selectedPoint.x)}
              y1={margin.top} y2={height - margin.bottom}
              stroke="#774365" strokeWidth="2" strokeDasharray="5 4"
            />
            <circle
              cx={scaleX(selectedPoint.x)} cy={scaleY(selectedPoint.y)}
              r="8" fill="#774365" stroke="white" strokeWidth="2"
            />
          </g>
        )}

        {/* Axis labels. */}
        <text
          x={margin.left + plotWidth / 2}
          y={height - 12}
          textAnchor="middle"
          fill="#111827"
        >
          {xLabel}
        </text>

        <text
          x="18"
          y={margin.top + plotHeight / 2}
          textAnchor="middle"
          fill="#111827"
          transform={`rotate(-90 18 ${margin.top + plotHeight / 2})`}
        >
          {yLabel}
        </text>
      </svg>
    </figure>
  );
}
