const EPSILON = 1e-9;

/**
 * Keep finite coordinate pairs and sort them from left to right.
 */
function getValidPoints(points) {
  if (!Array.isArray(points)) return [];

  return points
    .filter(
      (point) =>
        Number.isFinite(point?.x) && Number.isFinite(point?.y)
    )
    .sort((a, b) => a.x - b.x);
}

/**
 * Find the y-value at x along the graph's joined line segments.
 */
function findYAtX(points, x) {
  if (!Number.isFinite(x)) {
    return { value: null, reason: "The requested x-value is invalid." };
  }

  const minX = points[0].x;
  const maxX = points[points.length - 1].x;

  if (x < minX - EPSILON || x > maxX + EPSILON) {
    return {
      value: null,
      reason: "The requested x-value is outside the available point range.",
    };
  }

  const exactMatches = points.filter(
    (point) => Math.abs(point.x - x) <= EPSILON
  );

  if (exactMatches.length > 0) {
    const firstY = exactMatches[0].y;
    const hasDifferentY = exactMatches.some(
      (point) => Math.abs(point.y - firstY) > EPSILON
    );

    if (hasDifferentY) {
      return {
        value: null,
        reason: "There is more than one y-value at this x-value.",
      };
    }

    return { value: firstY, reason: null };
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];

    if (x > left.x && x < right.x && right.x > left.x) {
      const fraction = (x - left.x) / (right.x - left.x);

      return {
        value: left.y + fraction * (right.y - left.y),
        reason: null,
      };
    }
  }

  return {
    value: null,
    reason: "A y-value could not be determined at this x-value.",
  };
}

/**
 * Find the part of the joined graph that overlaps the displayed x-range.
 * If graph.xRange is not provided, the point range is used.
 */
function getVisiblePoints(points, displayedXRange) {
  const pointMinX = points[0].x;
  const pointMaxX = points[points.length - 1].x;

  const minX = Math.max(displayedXRange.min, pointMinX);
  const maxX = Math.min(displayedXRange.max, pointMaxX);

  if (minX > maxX) return [];

  const firstY = findYAtX(points, minX);
  const lastY = findYAtX(points, maxX);

  if (firstY.value === null || lastY.value === null) return [];

  const visiblePoints = [{ x: minX, y: firstY.value }];

  for (const point of points) {
    if (point.x > minX + EPSILON && point.x < maxX - EPSILON) {
      visiblePoints.push(point);
    }
  }

  if (maxX > minX + EPSILON) {
    visiblePoints.push({ x: maxX, y: lastY.value });
  }

  return visiblePoints;
}

/**
 * Find isolated x-intercepts and intervals where a joined segment lies
 * directly on the x-axis.
 */
function findXIntercepts(points) {
  const roots = [];
  const intervals = [];

  function addRoot(x) {
    const alreadyAdded = roots.some(
      (existingX) => Math.abs(existingX - x) <= EPSILON
    );

    if (!alreadyAdded) roots.push(x);
  }

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const next = points[index + 1];

    if (!next) {
      if (Math.abs(point.y) <= EPSILON) addRoot(point.x);
      continue;
    }

    const pointIsZero = Math.abs(point.y) <= EPSILON;
    const nextIsZero = Math.abs(next.y) <= EPSILON;

    if (pointIsZero && nextIsZero) {
      intervals.push({
        minX: Math.min(point.x, next.x),
        maxX: Math.max(point.x, next.x),
      });
      continue;
    }

    if (pointIsZero) addRoot(point.x);
    if (nextIsZero) addRoot(next.x);

    const crossesZero =
      (point.y < -EPSILON && next.y > EPSILON) ||
      (point.y > EPSILON && next.y < -EPSILON);

    if (crossesZero) {
      const fraction = -point.y / (next.y - point.y);
      addRoot(point.x + fraction * (next.x - point.x));
    }
  }

  intervals.sort((a, b) => a.minX - b.minX);

  const mergedIntervals = [];

  for (const interval of intervals) {
    const previous = mergedIntervals[mergedIntervals.length - 1];

    if (previous && interval.minX <= previous.maxX + EPSILON) {
      previous.maxX = Math.max(previous.maxX, interval.maxX);
    } else {
      mergedIntervals.push({ ...interval });
    }
  }

  const isolatedRoots = roots
    .filter(
      (root) =>
        !mergedIntervals.some(
          (interval) =>
            root >= interval.minX - EPSILON &&
            root <= interval.maxX + EPSILON
        )
    )
    .sort((a, b) => a - b);

  return {
    roots: isolatedRoots,
    intervals: mergedIntervals,
  };
}

/**
 * Calculate structured facts from a graph.
 *
 * Shared graph shape:
 * {
 *   title,
 *   xLabel,
 *   yLabel,
 *   points: [{ x, y }],
 *   source?,       // "image" or "equation"
 *   confidence?,   // "high", "medium", or "low"
 *   equation?,     // exact equation, if user supplied one
 *   graphType?,    // known type, if supplied
 *   xRange?        // optional displayed range: { min, max }
 * }
 *
 * Pass currentX from the graph controls to calculate the current point.
 */
export function getGraphFacts(graph, currentX = null) {
  const points = getValidPoints(graph?.points);

  if (points.length < 2) {
    return {
      status: "unavailable",
      reason: "At least two valid graph points are required.",
    };
  }

  const pointRange = {
    min: points[0].x,
    max: points[points.length - 1].x,
  };

  const hasValidDisplayedRange =
    Number.isFinite(graph?.xRange?.min) &&
    Number.isFinite(graph?.xRange?.max) &&
    graph.xRange.min <= graph.xRange.max;

  const xRange = hasValidDisplayedRange
    ? { min: graph.xRange.min, max: graph.xRange.max }
    : pointRange;

  const visiblePoints = getVisiblePoints(points, xRange);

  if (visiblePoints.length === 0) {
    return {
      status: "unavailable",
      reason: "There are no graph points in the displayed x-range.",
      xRange,
      pointRange,
    };
  }

  const minimumPoint = visiblePoints.reduce((best, point) =>
    point.y < best.y ? point : best
  );

  const maximumPoint = visiblePoints.reduce((best, point) =>
    point.y > best.y ? point : best
  );

  const yInterceptResult =
    xRange.min <= 0 && xRange.max >= 0
      ? findYAtX(visiblePoints, 0)
      : {
          value: null,
          reason: "x = 0 is outside the displayed graph range.",
        };

  let currentPoint = null;

  if (Number.isFinite(currentX)) {
    if (currentX < xRange.min - EPSILON || currentX > xRange.max + EPSILON) {
      currentPoint = {
        x: currentX,
        y: null,
        reason: "The current x-value is outside the displayed graph range.",
      };
    } else {
      const result = findYAtX(visiblePoints, currentX);
      currentPoint = {
        x: currentX,
        y: result.value,
        reason: result.reason,
      };
    }
  }

  const confidence =
    ["high", "medium", "low"].includes(graph?.confidence)
      ? graph.confidence
      : null;

  const source =
    typeof graph?.source === "string"
      ? graph.source
      : confidence
        ? "image"
        : "unknown";

  const equation =
    typeof graph?.equation === "string" && graph.equation.trim()
      ? graph.equation.trim()
      : null;

  const graphType =
    typeof graph?.graphType === "string" && graph.graphType.trim()
      ? graph.graphType.trim()
      : null;

  const intercepts = findXIntercepts(visiblePoints);

  return {
    status: "ready",
    title: typeof graph?.title === "string" ? graph.title : "",
    xLabel: typeof graph?.xLabel === "string" ? graph.xLabel : "",
    yLabel: typeof graph?.yLabel === "string" ? graph.yLabel : "",
    source,
    confidence,

    // Image coordinates, or graphs without a known source, may be approximate.
    approximate: source !== "equation" || confidence !== null,
    calculationMethod: "joined points with linear interpolation",

    xRange,
    pointRange,
    yRange: {
      min: minimumPoint.y,
      max: maximumPoint.y,
    },
    minimum: { x: minimumPoint.x, y: minimumPoint.y },
    maximum: { x: maximumPoint.x, y: maximumPoint.y },

    currentPoint,
    xIntercepts: intercepts.roots,
    xInterceptIntervals: intercepts.intervals,
    xInterceptStatus:
      intercepts.roots.length > 0 || intercepts.intervals.length > 0
        ? "found"
        : "none-in-displayed-range",
    yIntercept: yInterceptResult.value,
    yInterceptReason: yInterceptResult.reason,

    equation,
    equationReason: equation
      ? null
      : "No exact equation was provided; sampled points do not identify a unique equation.",
    graphType,
    graphTypeReason: graphType
      ? null
      : "Graph type was not provided and cannot be determined reliably from points alone.",
  };
}