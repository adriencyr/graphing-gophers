import { parse } from "mathjs/number";

const FUNCTIONS = new Set([
  "sin", "cos", "tan", "sqrt", "abs", "log", "exp",
]);
const SYMBOLS = new Set(["x", "pi", "e", ...FUNCTIONS]);
const OPERATORS = new Set(["+", "-", "*", "/", "^"]);
const SAMPLE_COUNT = 201;
const MAX_Y = 1e12;

/** Parse one real-valued function, rejecting assignments and other syntax. */
function compileEquation(input) {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Enter an equation, for example y = x^2 + 3.");
  }
  if (input.length > 200) {
    throw new Error("Keep the equation within 200 characters.");
  }
  const expression = input.trim().replace(/^y\s*=\s*/i, "");
  let tree;
  try {
    tree = parse(expression);
  } catch {
    throw new Error(
      "Check the equation's numbers, operators, and parentheses.",
    );
  }

  // Only scalar arithmetic is allowed. No JavaScript, assignments, or matrices.
  tree.traverse((node) => {
    const allowed =
      (node.isConstantNode && typeof node.value === "number" &&
        Number.isFinite(node.value)) ||
      (node.isSymbolNode && SYMBOLS.has(node.name)) ||
      node.isParenthesisNode ||
      (node.isOperatorNode && OPERATORS.has(node.op)) ||
      (node.isFunctionNode && node.fn.isSymbolNode &&
        FUNCTIONS.has(node.fn.name) && node.args.length === 1);
    if (!allowed) {
      throw new Error(
        "Use x, numbers, + - * / ^, parentheses, pi, e, or " +
        "sin, cos, tan, sqrt, abs, log, exp with one argument.",
      );
    }
  });

  // Track common poles so adjacent finite samples do not bridge an asymptote.
  const boundaries = [];
  tree.traverse((node) => {
    if (node.isOperatorNode && node.op === "/") {
      addZeroBoundaries(node.args[1], boundaries);
    }
    if (node.isOperatorNode && node.op === "^") {
      let variableExponent = false;
      node.args[1].traverse((part) => {
        if (part.isSymbolNode && part.name === "x") variableExponent = true;
      });
      if (!variableExponent && node.args[1].compile().evaluate() < 0) {
        addZeroBoundaries(node.args[0], boundaries);
      }
    }
    if (node.isFunctionNode && node.fn.name === "tan") {
      const argument = node.args[0].compile();
      boundaries.push({
        evaluate: (scope) => Math.cos(argument.evaluate(scope)),
      });
    }
  });
  return { expression, compiled: tree.compile(), boundaries };
}

/** Track denominator zeros, including even powers such as (x - 1)^2. */
function addZeroBoundaries(node, boundaries) {
  if (node.isParenthesisNode) {
    addZeroBoundaries(node.content, boundaries);
  } else if (node.isOperatorNode && node.op === "*") {
    node.args.forEach((part) => addZeroBoundaries(part, boundaries));
  } else if (node.isOperatorNode && node.op === "^" &&
      node.args[1].isConstantNode && node.args[1].value > 0) {
    addZeroBoundaries(node.args[0], boundaries);
  } else {
    boundaries.push(node.compile());
  }
}

/** Return a finite, real scalar, or null for undefined/unsupported values. */
function valueAt(compiled, x) {
  try {
    const value = compiled.evaluate({ x });
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

/** Sample an equation into the existing GraphPlot coordinate format. */
export function createEquationGraph(input, { minX = -10, maxX = 10 } = {}) {
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || minX >= maxX ||
      Math.abs(minX) > 1e6 || Math.abs(maxX) > 1e6) {
    throw new Error(
      "Choose an increasing x-range between -1000000 and 1000000.",
    );
  }
  const { expression, compiled, boundaries } = compileEquation(input);
  const segments = [];
  let segment = [];
  let previousX = null;
  let hasGaps = false;

  function finishSegment() {
    if (segment.length) segments.push(segment);
    segment = [];
  }

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const x = minX + (maxX - minX) * index / (SAMPLE_COUNT - 1);
    const y = valueAt(compiled, x);
    if (y === null || Math.abs(y) > MAX_Y) {
      finishSegment();
      previousX = null;
      hasGaps = true;
      continue;
    }

    if (previousX !== null) {
      const midpoint = valueAt(compiled, (previousX + x) / 2);
      const crossesPole = boundaries.some((boundary) => {
        const left = valueAt(boundary, previousX);
        const right = valueAt(boundary, x);
        return left === null || right === null || left === 0 || right === 0 ||
          Math.sign(left) !== Math.sign(right);
      });
      if (midpoint === null || Math.abs(midpoint) > MAX_Y || crossesPole) {
        finishSegment();
        hasGaps = true;
      }
    }
    segment.push({ x, y });
    previousX = x;
  }
  finishSegment();
  const points = segments.flat();
  if (points.length < 2) {
    throw new Error(
      "No plottable real values in this x-range. Check the equation or " +
      "change the range. Displayed y-values must be within ±10^12.",
    );
  }
  return {
    title: `y = ${expression}`,
    xLabel: "x",
    yLabel: "y",
    points,
    segments,
    hasGaps,
    minX,
    maxX,
  };
}
