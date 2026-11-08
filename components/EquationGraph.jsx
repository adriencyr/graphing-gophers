"use client";

import { useState } from "react";
import { createEquationGraph } from "../lib/equationGraph";
import GraphPlot from "./GraphPlot";

const inputStyle =
  "mt-3 min-h-12 w-full rounded-lg border-2 border-[#766374] " +
  "bg-[#FCFAFB] px-4 py-3 text-base text-[#171923] " +
  "placeholder:text-[#6B6070] focus-visible:outline-4 " +
  "focus-visible:outline-offset-4 focus-visible:outline-[#774365]";

/** Convert the submitted formula into points and render the existing plot. */
export default function EquationGraph() {
  const [equation, setEquation] = useState("");
  const [minX, setMinX] = useState("-10");
  const [maxX, setMaxX] = useState("10");
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setGraph(null);
    try {
      setGraph(createEquationGraph(equation, {
        minX: minX.trim() ? Number(minX) : NaN,
        maxX: maxX.trim() ? Number(maxX) : NaN,
      }));
    } catch (equationError) {
      setError(equationError.message);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="equation-input" className="block text-sm font-semibold">
          Mathematical equation
        </label>
        <input
          id="equation-input"
          type="text"
          value={equation}
          onChange={(event) => setEquation(event.target.value)}
          placeholder="y = x^2 + 3"
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
          aria-invalid={Boolean(error)}
          aria-describedby={error
            ? "equation-help equation-error"
            : "equation-help"}
          className={inputStyle}
        />
        <p id="equation-help" className="mt-3 text-sm text-[#514752]">
          Examples: y = x^2 + 3, 2x + 1, sin(x), sqrt(x), 1/x.
          Use ^ for powers. Trigonometric functions use radians.
        </p>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold">X-axis range</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label htmlFor="equation-min" className="text-sm">
              Minimum x
              <input
                id="equation-min"
                type="number"
                step="any"
                value={minX}
                onChange={(event) => setMinX(event.target.value)}
                className={inputStyle}
                aria-describedby={error ? "equation-error" : undefined}
              />
            </label>
            <label htmlFor="equation-max" className="text-sm">
              Maximum x
              <input
                id="equation-max"
                type="number"
                step="any"
                value={maxX}
                onChange={(event) => setMaxX(event.target.value)}
                className={inputStyle}
                aria-describedby={error ? "equation-error" : undefined}
              />
            </label>
          </div>
        </fieldset>
        {error && (
          <p id="equation-error" role="alert"
            className="mt-3 text-sm font-semibold text-[#A51D32]">
            {error}
          </p>
        )}
        <button type="submit"
          className="mt-5 min-h-12 rounded-lg bg-[#774365] px-5 py-3
            font-semibold text-white hover:bg-[#603352]
            focus-visible:outline-4 focus-visible:outline-offset-4
            focus-visible:outline-[#774365]">
          Create Graph
        </button>
      </form>
      {graph && (
        <div className="mt-6 space-y-3">
          <p role="status" className="text-sm text-[#514752]">
            Graph created for {graph.minX} ≤ x ≤ {graph.maxX}.
            Curves are approximated from sampled points.
            {graph.hasGaps && " Undefined or out-of-range values leave gaps."}
          </p>
          <GraphPlot graph={graph} showPoints={false} />
        </div>
      )}
    </div>
  );
}
