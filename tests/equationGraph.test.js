import { describe, expect, it } from "vitest";
import { createEquationGraph } from "../lib/equationGraph";

describe("equation sampling", () => {
  it("samples the dashboard example into real graph coordinates", () => {
    const graph = createEquationGraph("y = x^2 + 3");
    expect(graph.title).toBe("y = x^2 + 3");
    expect(graph.points).toHaveLength(201);
    expect(graph.points[0]).toEqual({ x: -10, y: 103 });
    expect(graph.points[100]).toEqual({ x: 0, y: 3 });
    expect(graph.points[200]).toEqual({ x: 10, y: 103 });
    expect(graph.segments).toHaveLength(1);
    expect(graph.hasGaps).toBe(false);
  });

  it.each([
    ["2x + 1", 3], ["sin(x)", Math.sin(1)], ["cos(pi*x)", -1],
    ["sqrt(x)", 1], ["abs(-x)", 1], ["log(e*x)", 1],
    ["exp(x)", Math.E], ["-x^2", -1], ["5", 5],
  ])("supports scalar arithmetic in %s", (formula, expected) => {
    const graph = createEquationGraph(formula, { minX: 0, maxX: 2 });
    expect(graph.points.find((point) => point.x === 1).y)
      .toBeCloseTo(expected);
  });

  it.each(["1/x", "x^-2", "1/(x-0.03)", "1/(x-0.03)^2", "tan(x)"])(
    "does not connect sampled branches across poles in %s", (formula) => {
      const graph = createEquationGraph(formula);
      expect(graph.hasGaps).toBe(true);
      expect(graph.segments.length).toBeGreaterThan(1);
      const pole = formula.includes("0.03") ? 0.03 : 0;
      if (formula !== "tan(x)") {
        expect(graph.segments.some((segment) =>
          segment[0].x < pole && segment.at(-1).x > pole,
        )).toBe(false);
      }
    },
  );

  it("retains the real-valued part of a restricted domain", () => {
    const graph = createEquationGraph("sqrt(x)");
    expect(graph.hasGaps).toBe(true);
    expect(graph.points.every((point) => point.x >= 0)).toBe(true);
  });

  it.each([
    "", "y =", "x +", "z + 1", "x = 3", "x; 2", "[1, 2]",
    "x!", "x.constructor", 'import("x")', "random()", "sin(x, 2)",
    "1/0", "sqrt(-1)", "1e100", "x".repeat(201),
  ])("rejects unsupported, invalid, or unplottable input: %s", (formula) => {
    expect(() => createEquationGraph(formula)).toThrow();
  });

  it.each([
    { minX: 2, maxX: 2 }, { minX: 5, maxX: -5 },
    { minX: NaN, maxX: 10 }, { minX: -10, maxX: Infinity },
    { minX: -1e7, maxX: 10 },
  ])("rejects an invalid range %j", (range) => {
    expect(() => createEquationGraph("x", range)).toThrow(/x-range/);
  });
});
