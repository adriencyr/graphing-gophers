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

  // The limit prevents an unexpectedly dense range from creating too many ticks.
  for (let index = 0; index < 100; index += 1) {
    const tick = firstTick + index * step;

    if (tick > max + step * 1e-10) break;

    values.push(Number(tick.toPrecision(14)));
  }

  return { values, step };
}

/**
 * Calculate an endpoint slope for shape-preserving cubic interpolation.
 *
 * @param {number} firstWidth - Width of the first interval.
 * @param {number} secondWidth - Width of the adjacent interval.
 * @param {number} firstSlope - Slope of the first interval.
 * @param {number} secondSlope - Slope of the adjacent interval.
 * @returns {number} Shape-preserving endpoint slope.
 */
function getEndpointSlope(firstWidth, secondWidth, firstSlope, secondSlope) {
  let slope =
    ((2 * firstWidth + secondWidth) * firstSlope -
      firstWidth * secondSlope) /
    (firstWidth + secondWidth);

  if (Math.sign(slope) !== Math.sign(firstSlope)) {
    return 0;
  }

  if (
    Math.sign(firstSlope) !== Math.sign(secondSlope) &&
    Math.abs(slope) > Math.abs(3 * firstSlope)
  ) {
    slope = 3 * firstSlope;
  }

  return slope;
}

/**
 * Make a smooth SVG path through the supplied points using shape-preserving
 * cubic interpolation. Returns null when x-values repeat, so the caller can
 * draw those points as straight segments instead.
 *
 * @param {{x: number, y: number}[]} points - Points sorted by x.
 * @param {(x: number) => number} scaleX - Converts x-coordinates to SVG pixels.
 * @param {(y: number) => number} scaleY - Converts y-coordinates to SVG pixels.
 * @returns {string | null} SVG path data, or null if x-values repeat.
 */
function makeCurvePath(points, scaleX, scaleY) {
  if (points.length < 2) return null;

  const widths = [];
  const slopes = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const width = points[index + 1].x - points[index].x;

    // A vertical segment cannot be represented as y = f(x).
    if (width <= 0) return null;

    widths.push(width);
    slopes.push(
      (points[index + 1].y - points[index].y) / width
    );
  }

  const pointSlopes = Array(points.length);

  if (points.length === 2) {
    pointSlopes[0] = slopes[0];
    pointSlopes[1] = slopes[0];
  } else {
    pointSlopes[0] = getEndpointSlope(
      widths[0],
      widths[1],
      slopes[0],
      slopes[1]
    );

    for (let index = 1; index < points.length - 1; index += 1) {
      const previousSlope = slopes[index - 1];
      const nextSlope = slopes[index];

      // Set the slope to zero at a local maximum, minimum, or flat section.
      if (
        previousSlope === 0 ||
        nextSlope === 0 ||
        Math.sign(previousSlope) !== Math.sign(nextSlope)
      ) {
        pointSlopes[index] = 0;
        continue;
      }

      const previousWidth = widths[index - 1];
      const nextWidth = widths[index];

      const firstWeight = 2 * nextWidth + previousWidth;
      const secondWeight = nextWidth + 2 * previousWidth;

      pointSlopes[index] =
        (firstWeight + secondWeight) /
        (firstWeight / previousSlope + secondWeight / nextSlope);
    }

    const lastIndex = points.length - 1;

    pointSlopes[lastIndex] = getEndpointSlope(
      widths[lastIndex - 1],
      widths[lastIndex - 2],
      slopes[lastIndex - 1],
      slopes[lastIndex - 2]
    );
  }

  let path = `M ${scaleX(points[0].x)} ${scaleY(points[0].y)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    const width = widths[index];

    const control1X = left.x + width / 3;
    const control1Y = left.y + (pointSlopes[index] * width) / 3;
    const control2X = right.x - width / 3;
    const control2Y = right.y - (pointSlopes[index + 1] * width) / 3;

    path +=
      ` C ${scaleX(control1X)} ${scaleY(control1Y)}` +
      ` ${scaleX(control2X)} ${scaleY(control2Y)}` +
      ` ${scaleX(right.x)} ${scaleY(right.y)}`;
  }

  return path;
}

/**
 * Render an XY Cartesian graph as a responsive SVG.
 *
 * Points are sorted by x-coordinate. The curve passes through every point.
 * The displayed curve uses shape-preserving interpolation when x-values are
 * unique and falls back to straight segments when x-values repeat.
 *
 * @param {Object} props
 * @param {Object} props.graph - Graph data.
 * @param {string} [props.graph.title] - Title shown above the graph.
 * @param {string} [props.graph.xLabel] - Horizontal-axis label.
 * @param {string} [props.graph.yLabel] - Vertical-axis label.
 * @param {{x: number, y: number}[]} [props.graph.points] - Graph coordinates.
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

  // Sort points from left to right before drawing the curve.
  const orderedPoints = [...points].sort((a, b) => a.x - b.x);

  // Use a smooth curve when possible; otherwise use straight segments.
  const curvePath = makeCurvePath(orderedPoints, scaleX, scaleY);

  const plottedPoints = orderedPoints
    .map((point) => `${scaleX(point.x)},${scaleY(point.y)}`)
    .join(" ");

  // Put the axes at zero when zero is in view; otherwise use a plot edge.
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

        {/* Draw the connected curve through the supplied graph points. */}
        {orderedPoints.length > 1 &&
          (curvePath ? (
            <path
              d={curvePath}
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : (
            <polyline
              points={plottedPoints}
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

        {/* Draw a marker at every supplied coordinate. */}
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