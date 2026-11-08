"use client";

import { useEffect, useRef, useState } from "react";

type GraphData = {
  title: string;
  xLabel: string;
  yLabel: string;
  points: { x: number; y: number }[];
};

type SaveGraphButtonProps = {
  graph: GraphData | null;
  onSaved?: (graphId: string) => void;
};

export default function SaveGraphButton({
  graph,
  onSaved,
}: SaveGraphButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "unauthorized"
  >("idle");

  const [errorMessage, setErrorMessage] = useState("");

  const requestId = useRef(0);

  // Reset when the dashboard supplies a different graph.
  useEffect(() => {
    requestId.current++;
    setStatus("idle");
    setErrorMessage("");
  }, [graph]);

  async function handleSave() {
    if (!graph || status === "saving" || status === "saved") {
      return;
    }

    const currentRequest = ++requestId.current;

    setStatus("saving");
    setErrorMessage("");

    try {
      const response = await fetch("/api/save-graph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(graph),
      });

      // Ignore responses belonging to a previous graph.
      if (currentRequest !== requestId.current) return;

      if (response.status === 401) {
        setStatus("unauthorized");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to save graph. Please try again.");
      }

      const result = await response.json();

      // The graph may have changed while parsing the response.
      if (currentRequest !== requestId.current) return;

      setStatus("saved");
      onSaved?.(result.graphId);
    } catch (error) {
      // Ignore errors from outdated requests.
      if (currentRequest !== requestId.current) return;

      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={handleSave}
        disabled={!graph || status === "saving" || status === "saved"}
        aria-busy={status === "saving"}
        className="
          min-h-12 rounded-lg
          bg-[#774365] px-6 py-3
          font-semibold text-white
          hover:bg-[#603352]
          focus-visible:outline-4
          focus-visible:outline-offset-4
          focus-visible:outline-[#774365]
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        {status === "saving"
          ? "Saving..."
          : status === "saved"
            ? "Graph Saved ✓"
            : "Save Graph"}
      </button>

      {status === "saved" && (
        <p role="status" className="text-sm font-semibold text-[#514752]">
          Your graph has been saved successfully.
        </p>
      )}

      {status === "unauthorized" && (
        <p role="status" className="text-sm text-[#514752]">
          Please{" "}
          <a
            href="/auth/login"
            className="
              font-bold text-[#774365] underline
              underline-offset-2
              focus-visible:outline-4
              focus-visible:outline-[#774365]
            "
          >
            sign in
          </a>{" "}
          to save your graph.
        </p>
      )}

      {status === "error" && (
        <p role="alert" className="text-sm font-semibold text-[#A51D32]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
