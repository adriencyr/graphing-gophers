"use client";

import { useEffect, useState } from "react";
import GraphPlot from "./GraphPlot";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Lets a user upload a graph image, request server-side analysis,
 * and display the returned graph using GraphPlot.
 */
export default function GraphImageReader() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Create and clean up a temporary URL for the selected image preview.
  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(image);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  function handleImageChange(event) {
    const selectedImage = event.target.files?.[0] ?? null;

    setImage(null);
    setGraph(null);
    setError("");
    setMessage("");

    if (!selectedImage) return;

    if (!ALLOWED_TYPES.has(selectedImage.type)) {
      setError("Choose a PNG or JPEG image.");
      event.target.value = "";
      return;
    }

    if (selectedImage.size === 0) {
      setError("The selected image is empty.");
      event.target.value = "";
      return;
    }

    if (selectedImage.size > MAX_IMAGE_SIZE) {
      setError("Choose an image that is 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setImage(selectedImage);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setGraph(null);

    if (!image) {
      setError("Choose a graph image first.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", image);

      const response = await fetch("/api/extract-graph", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not read the graph image.");
      }

      if (result.status === "unreadable") {
        setMessage(
          result.notes || "The graph could not be read. Try a clearer image."
        );
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

      setGraph(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section aria-labelledby="graph-reader-title">
      <h2 id="graph-reader-title">Read a graph from an image</h2>

      <p>
        Upload a clear XY graph image. Coordinates read from an image may be
        approximate.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="graph-image">
          Graph image (PNG or JPEG, up to 5 MB)
        </label>

        <input
          id="graph-image"
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleImageChange}
        />

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Preview of the graph image to analyze"
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: 280,
              marginTop: 16,
            }}
          />
        )}

        <button type="submit" disabled={!image || isLoading}>
          {isLoading ? "Reading graph..." : "Read graph"}
        </button>
      </form>

      {isLoading && <p role="status">Analyzing the image...</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {graph && (
        <div aria-live="polite">
          <GraphPlot graph={graph} />

          <p>
            Coordinate confidence: {graph.confidence}. Values may be
            approximate.
          </p>

          {graph.notes && <p>{graph.notes}</p>}
        </div>
      )}
    </section>
  );
}