"use client";

import { useEffect, useRef, useState } from "react";
import SaveGraphButton from "./SaveGraphButton";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Analyzes the image selected by the dashboard and sends readable graph data
 * back to the dashboard's shared graph viewer.
 */
export default function GraphImageReader({
  selectedImage = null,
  onGraphRead = () => {},
  onGraphSaved = () => {},
}) {
  const [analysis, setAnalysis] = useState(null);
  const requestControllerRef = useRef(null);

  // Cancel analysis if the selected file changes or the component unmounts.
  useEffect(() => {
    return () => requestControllerRef.current?.abort();
  }, [selectedImage]);

  // Show results only for the currently selected image.
  const currentAnalysis =
    analysis?.image === selectedImage ? analysis : null;

  const validationError = getImageValidationError(selectedImage);
  const error = currentAnalysis?.error || "";
  const message = currentAnalysis?.message || "";
  const graph = currentAnalysis?.graph || null;
  const isLoading = currentAnalysis?.isLoading || false;

  async function handleSubmit(event) {
    event.preventDefault();
    onGraphRead(null);

    if (!selectedImage) {
      setAnalysis({
        image: selectedImage,
        graph: null,
        error: "Choose a graph image in the upload area above.",
        message: "",
        isLoading: false,
      });
      return;
    }

    if (validationError) {
      setAnalysis({
        image: selectedImage,
        graph: null,
        error: validationError,
        message: "",
        isLoading: false,
      });
      return;
    }

    requestControllerRef.current?.abort();

    const controller = new AbortController();
    requestControllerRef.current = controller;

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
        signal: controller.signal,
      });

      const result = await response.json().catch(() => ({}));

      if (controller.signal.aborted) return;

      if (!response.ok) {
        throw new Error(result.error || "Could not read the graph image.");
      }

      if (result.status === "unreadable") {
        setAnalysis({
          image: selectedImage,
          graph: null,
          error: "",
          message:
            result.notes || "The graph could not be read. Try a clearer image.",
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
            Number.isFinite(point?.x) && Number.isFinite(point?.y)
        );

      if (!hasValidGraph) {
        throw new Error("The graph reader did not return valid graph data.");
      }

      setAnalysis({
        image: selectedImage,
        graph: result,
        error: "",
        message: "",
        isLoading: false,
      });

      // The dashboard displays the result in its shared graph viewer.
      onGraphRead(result);
    } catch (requestError) {
      if (controller.signal.aborted) return;

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
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
    }
  }

  function handleGraphSaved(graphId) {
    setAnalysis((previous) =>
      previous?.image === selectedImage
        ? { ...previous, message: "Graph saved successfully." }
        : previous
    );

    onGraphSaved(graphId);
  }

  return (
    <section aria-labelledby="graph-reader-title">
      <h2 id="graph-reader-title">Read the selected graph</h2>

      <p>
        The image is selected in the upload area above. Coordinates read from
        an image may be approximate.
      </p>

      {selectedImage && (
        <p className="mt-3 break-all text-sm">
          Selected image: {selectedImage.name}
        </p>
      )}

      {validationError && (
        <p className="mt-3" role="alert">
          {validationError}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={!selectedImage || Boolean(validationError) || isLoading}
        >
          {isLoading ? "Reading graph..." : "Read graph"}
        </button>
      </form>

      {isLoading && <p role="status">Analyzing the image...</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {graph && (
        <div aria-live="polite">
          <SaveGraphButton graph={graph} onSaved={handleGraphSaved} />

          <p>
            Coordinates are estimates. Confidence:{" "}
            {graph.confidence || "not provided"}.
          </p>

          {graph.notes && <p>{graph.notes}</p>}
        </div>
      )}
    </section>
  );
}

function getImageValidationError(image) {
  if (!image) {
    return "Choose a graph image in the upload area above.";
  }

  const hasSupportedType = ALLOWED_TYPES.has(image.type);
  const hasSupportedExtension = /\.(png|jpe?g)$/i.test(image.name);

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