"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import GraphPlot from "./GraphPlot";
import GraphSonification from "./GraphSonification";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Lets a user upload a graph image, request server-side analysis,
 * and explore the returned points with GraphPlot and GraphSonification.
 * Pass image to reuse an existing upload field; remount when that file changes.
 */
export default function GraphImageReader({ image: providedImage } = {}) {
  const [selectedImage, setImage] = useState(null);
  const isEmbedded = providedImage !== undefined;
  const image = isEmbedded ? providedImage : selectedImage;
  const [previewUrl, setPreviewUrl] = useState("");
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const requestRef = useRef(null);

  const previewRef = useRef(null);

  // Release requests and standalone previews on unmount or file replacement.
  useEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function handleImageChange(event) {
    const selectedImage = event.target.files?.[0] ?? null;

    requestRef.current?.abort();
    requestRef.current = null;
    setIsLoading(false);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreviewUrl("");
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

    previewRef.current = URL.createObjectURL(selectedImage);
    setPreviewUrl(previewRef.current);
    setImage(selectedImage);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    // Block duplicate requests before React renders the disabled button.
    if (requestRef.current) return;
    setError("");
    setMessage("");
    setGraph(null);

    if (!image) {
      setError("Choose a graph image first.");
      return;
    }

    if (
      !ALLOWED_TYPES.has(image.type) || image.size === 0 ||
      image.size > MAX_IMAGE_SIZE
    ) {
      setError("Choose a non-empty PNG or JPEG image, up to 5 MB.");
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", image);

      const response = await fetch("/api/extract-graph", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const result = await response.json();
      if (controller.signal.aborted) return;

      if (!response.ok) {
        throw new Error(result?.error || "Could not read the graph image.");
      }

      if (result?.status === "unreadable" || result?.confidence === "low") {
        setMessage(
          typeof result.notes === "string" && result.notes
            ? result.notes
            : "The graph could not be read. Try a clearer image."
        );
        return;
      }

      const hasValidGraph =
        result?.status === "readable" &&
        ["high", "medium"].includes(result.confidence) &&
        typeof result.title === "string" &&
        typeof result.xLabel === "string" &&
        typeof result.yLabel === "string" &&
        typeof result.notes === "string" &&
        Array.isArray(result.points) &&
        result.points.length >= 2 && result.points.length <= 250 &&
        result.points.every(
          (point) =>
            Number.isFinite(point?.x) && Number.isFinite(point?.y)
        );

      if (!hasValidGraph) {
        throw new Error("The graph reader did not return valid graph data.");
      }

      setGraph({
        ...result,
        points: [...result.points].sort((a, b) => a.x - b.x),
      });
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  }

  // Sound interpolation requires exactly one y-value at each x-coordinate.
  const supportsSound = graph &&
    new Set(graph.points.map((point) => point.x)).size === graph.points.length;

  return (
    <section aria-labelledby="graph-reader-title">
      <h2 id="graph-reader-title" className="text-lg font-bold">
        Read a graph from an image
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#514752]">
        Upload a clear XY graph image. Coordinates read from an image may be
        approximate.
      </p>

      <form onSubmit={handleSubmit} aria-busy={isLoading}>
        {!isEmbedded && (
          <>
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
              <Image
                src={previewUrl}
                alt="Preview of the graph image to analyze"
                width={1200}
                height={800}
                unoptimized
                className="mt-4 max-h-72 w-auto max-w-full object-contain"
              />
            )}
          </>
        )}
        <button
          type="submit"
          disabled={!image || isLoading}
          className="mt-4 min-h-12 rounded-lg bg-[#774365] px-5 py-3
            font-semibold text-white hover:bg-[#603352]
            focus-visible:outline-4 focus-visible:outline-offset-4
            focus-visible:outline-[#774365] disabled:cursor-not-allowed
            disabled:opacity-60"
        >
          {isLoading ? "Reading graph..." : "Read graph"}
        </button>
      </form>

      {isLoading && <p role="status">Analyzing the image...</p>}
      {error && <p role="alert" className="mt-3 text-[#A51D32]">{error}</p>}
      {message && <p role="status">{message}</p>}

      {graph && (
        <div className="mt-5 space-y-4">
          <p role="status">Graph ready. Plot and sound controls are below.</p>
          <GraphPlot graph={graph} />

          <p>
            Coordinate confidence: {graph.confidence}. Values may be
            approximate.
          </p>

          {graph.notes && <p>{graph.notes}</p>}

          {supportsSound ? (
            <div className="rounded-lg border border-[#D8C6D1] p-4
              [&_button]:m-1 [&_button]:min-h-11 [&_button]:rounded-lg
              [&_button]:border [&_button]:border-[#774365]
              [&_button]:px-4 [&_button]:py-2
              [&_button]:focus-visible:outline-4
              [&_button]:focus-visible:outline-offset-4
              [&_button]:focus-visible:outline-[#774365]">
              <GraphSonification graph={graph} />
            </div>
          ) : (
            <p role="status">
              Sound exploration requires one y-value per x-coordinate.
              This image contains repeated x-coordinates.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
