"use client";

import { useRef, useState } from "react";
import GraphPlot from "./GraphPlot";
import SaveGraphButton from "./SaveGraphButton";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Analyzes the image selected by the dashboard and renders
 * the extracted graph.
 *
 * The dashboard handles image selection and preview.
 */
export default function GraphImageReader({ selectedImage = null }) {
  const [analysis, setAnalysis] = useState(null);
  const requestId = useRef(0);

  // Only display analysis for the currently selected image.
  const currentAnalysis =
    analysis?.image === selectedImage ? analysis : null;

  const validationError = getImageValidationError(selectedImage);
  const graph = currentAnalysis?.graph || null;
  const error = currentAnalysis?.error || "";
  const message = currentAnalysis?.message || "";
  const isLoading = currentAnalysis?.isLoading || false;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedImage || validationError) {
      setAnalysis({
        image: selectedImage,
        graph: null,
        error: validationError || "Choose a graph image first.",
        message: "",
        isLoading: false,
      });
      return;
    }

    const currentRequest = ++requestId.current;

    setAnalysis({
      image: selectedImage,
      graph: null,
      error: "",
      message: "",
      isLoading: true,
    });

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch("/api/extract-graph", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      // Ignore responses from older requests.
      if (currentRequest !== requestId.current) return;

      if (!response.ok) {
        throw new Error(
          result.error || "Could not read the graph image."
        );
      }

      if (result.status === "unreadable") {
        setAnalysis({
          image: selectedImage,
          graph: null,
          error: "",
          message:
            result.notes ||
            "The graph could not be read. Try a clearer image.",
          isLoading: false,
        });
        return;
      }

      const hasValidGraph =
        result.status === "readable" &&
        typeof result.title === "string" &&
        typeof result.xLabel === "string" &&
        typeof result.yLabel === "string" &&
        Array.isArray(result.points) &&
        result.points.length >= 2 &&
        result.points.every(
          (point) =>
            Number.isFinite(point?.x) &&
            Number.isFinite(point?.y)
        );

      if (!hasValidGraph) {
        throw new Error(
          "The graph reader did not return valid graph data."
        );
      }

      setAnalysis({
        image: selectedImage,
        graph: result,
        error: "",
        message: "",
        isLoading: false,
      });
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;

      setAnalysis({
        image: selectedImage,
        graph: null,
        error:
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong. Please try again.",
        message: "",
        isLoading: false,
      });
    }
  }

  function handleGraphSaved(graphId) {
    setAnalysis((previous) =>
      previous?.image === selectedImage
        ? {
            ...previous,
            message: "Graph saved successfully.",
          }
        : previous
    );
  }

  return (
    <section
      aria-labelledby="graph-reader-title"
      className="w-full space-y-5 rounded-xl border border-[#8B7786]/40 bg-white p-6 text-[#171923] shadow-sm sm:p-8"
    >
      {/* Heading */}
      <div className="space-y-2">
        <h2
          id="graph-reader-title"
          className="text-xl font-bold tracking-tight sm:text-2xl"
        >
          Read the selected graph
        </h2>

        <p className="text-sm leading-relaxed text-[#514752]">
          Analyze your uploaded graph to extract coordinates and
          explore its data. Coordinates extracted from images
          may be approximate.
        </p>
      </div>

      {/* Selected image */}
      {selectedImage && (
        <div className="rounded-lg border border-[#8B7786]/30 bg-[#EEE3E9]/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#514752]">
            Selected image
          </p>

          <p className="mt-1 break-all text-sm font-medium text-[#171923]">
            {selectedImage.name}
          </p>
        </div>
      )}

      {/* Image validation */}
      {selectedImage && validationError && (
        <p
          role="alert"
          className="text-sm font-medium text-[#A51D32]"
        >
          {validationError}
        </p>
      )}

      {/* Read graph button */}
      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={
            !selectedImage ||
            Boolean(validationError) ||
            isLoading
          }
          aria-busy={isLoading}
          className="
            inline-flex min-h-12 items-center justify-center
            rounded-lg bg-[#774365] px-6 py-3
            text-sm font-semibold text-white
            transition-colors duration-150
            hover:bg-[#603352]
            focus-visible:outline-4
            focus-visible:outline-offset-4
            focus-visible:outline-[#774365]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {isLoading ? "Reading graph..." : "Read graph"}
        </button>
      </form>

      {/* Loading */}
      {isLoading && (
        <p
          role="status"
          className="text-sm font-medium text-[#514752]"
        >
          Analyzing the image...
        </p>
      )}

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="text-sm font-medium text-[#A51D32]"
        >
          {error}
        </p>
      )}

      {/* Informational / success message */}
      {message && (
        <p
          role="status"
          className="text-sm font-medium text-[#514752]"
        >
          {message}
        </p>
      )}

      {/* Extracted graph */}
      {graph && (
        <div className="space-y-6 border-t border-[#8B7786]/30 pt-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[#171923]">
              Graph analysis
            </h3>

            <p className="text-sm text-[#514752]">
              Review the extracted graph below.
            </p>
          </div>

          {/* Graph visualization */}
          <GraphPlot graph={graph} />

          {/* Save graph */}
          <div className="flex flex-wrap items-center gap-3">
            <SaveGraphButton
              graph={graph}
              onSaved={handleGraphSaved}
            />
          </div>

          {/* Analysis details */}
          <div className="space-y-2 rounded-lg border border-[#8B7786]/30 bg-[#EEE3E9]/30 p-4">
            <h4 className="text-sm font-semibold text-[#171923]">
              Analysis details
            </h4>

            <p className="text-sm text-[#514752]">
              Coordinates are estimates. Confidence:{" "}
              <span className="font-semibold text-[#171923]">
                {graph.confidence || "not provided"}
              </span>
            </p>

            {graph.notes && (
              <p className="text-sm leading-relaxed text-[#514752]">
                {graph.notes}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Validates an uploaded graph image.
 *
 * Accepted formats: PNG and JPEG.
 * Maximum size: 5 MB.
 */
function getImageValidationError(image) {
  if (!image) {
    return "Choose a graph image in the upload area above.";
  }

  const hasSupportedType = ALLOWED_TYPES.has(image.type);
  const hasSupportedExtension = /\.(png|jpe?g)$/i.test(
    image.name
  );

  if (!hasSupportedType || !hasSupportedExtension) {
    return "Choose a PNG or JPEG image.";
  }

  if (image.size === 0) {
    return "The selected image is empty.";
  }

  if (image.size > MAX_IMAGE_SIZE) {
    return "Choose an image that is 5 MB or smaller.";
  }

  return "";
}
