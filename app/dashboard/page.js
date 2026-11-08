"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import GraphImageReader from "../../components/GraphImageReader";
import GraphExplorer from "../../components/GraphExplorer";
import EquationGraph from "../../components/EquationGraph";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export default function Dashboard() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileError, setFileError] = useState("");

  const [savedGraphs, setSavedGraphs] = useState([]);
  const [graphsLoading, setGraphsLoading] = useState(true);
  const [graphsError, setGraphsError] = useState("");
  const [graphSelectionError, setGraphSelectionError] = useState("");
  const [activeGraph, setActiveGraph] = useState(null);
  const [selectedGraphId, setSelectedGraphId] = useState(null);

  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const objectUrlRef = useRef(null);
  const uploadInputRef = useRef(null);

  // Used when refreshing the list after a graph is saved.
  const loadSavedGraphs = useCallback(async () => {
    setGraphsLoading(true);
    setGraphsError("");

    try {
      const graphs = await fetchSavedGraphsFromApi();
      setSavedGraphs(graphs);
    } catch (error) {
      setGraphsError(
        error instanceof Error
          ? error.message
          : "Could not load saved graphs."
      );
    } finally {
      setGraphsLoading(false);
    }
  }, []);

  // Load saved graphs when the dashboard first appears.
  useEffect(() => {
    let cancelled = false;

    fetchSavedGraphsFromApi()
      .then((graphs) => {
        if (!cancelled) {
          setSavedGraphs(graphs);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setGraphsError(
            error instanceof Error
              ? error.message
              : "Could not load saved graphs."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGraphsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Release temporary image memory when leaving the page.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function openPreview() {
    previousFocusRef.current = document.activeElement;

    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }

  function closePreview() {
    dialogRef.current?.close();
  }

  function clearImageSelection(event, errorMessage) {
    setFileError(errorMessage);
    setSelectedFile("");
    setSelectedImage(null);
    setPreviewUrl("");
    setActiveGraph(null);
    setSelectedGraphId(null);
    setGraphSelectionError("");
    event.target.value = "";

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setActiveGraph(null);
    setSelectedGraphId(null);
    setGraphSelectionError("");

    const validType = ["image/png", "image/jpeg"].includes(file.type);
    const validExtension = /\.(png|jpe?g)$/i.test(file.name);

    if (!validType || !validExtension) {
      clearImageSelection(event, "Please choose a PNG or JPG image.");
      return;
    }

    if (file.size === 0) {
      clearImageSelection(event, "The selected image is empty.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      clearImageSelection(
        event,
        "Choose an image that is 5 MB or smaller."
      );
      return;
    }

    const newUrl = URL.createObjectURL(file);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    objectUrlRef.current = newUrl;

    setSelectedFile(file.name);
    setSelectedImage(file);
    setPreviewUrl(newUrl);
    setFileError("");

    openPreview();
  }

  function handleGraphRead(graph) {
    setActiveGraph(graph);
    setSelectedGraphId(null);
    setGraphSelectionError("");
  }

  function handleSavedGraphSelect(savedGraph) {
    const graphData = getSavedGraphData(savedGraph);

    if (!graphData || !Array.isArray(graphData.points)) {
      setGraphSelectionError(
        "This saved item does not contain readable graph data."
      );
      return;
    }

    setGraphSelectionError("");
    setActiveGraph({
      ...graphData,
      title: savedGraph.title || graphData.title || "Saved graph",
    });
    setSelectedGraphId(savedGraph.id);

    // Clear the upload selection so the saved graph is the active viewer graph.
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }

    setSelectedImage(null);
    setSelectedFile("");
    setFileError("");
    setPreviewUrl("");

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setHistoryOpen(false);
  }

  function handleGraphSaved(graphId) {
    if (graphId) {
      setSelectedGraphId(graphId);
    }

    loadSavedGraphs();
  }

  return (
    <div className="min-h-full bg-[#EEE3E9] text-[#171923]">
      {/* Mobile history toggle */}
      <div className="border-b border-[#D8C6D1] bg-[#F7F2F5] px-5 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setHistoryOpen(!historyOpen)}
          aria-expanded={historyOpen}
          aria-controls="graph-history"
          className="min-h-12 rounded-lg border-2 border-[#554450] bg-white px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
        >
          {historyOpen ? "Hide History" : "Show History"}
        </button>
      </div>

      <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Saved graph list */}
        <aside
          id="graph-history"
          aria-labelledby="history-heading"
          className={`border-b border-[#D8C6D1] bg-[#F7F2F5] px-6 py-9 lg:block lg:border-b-0 lg:border-r ${
            historyOpen ? "block" : "hidden"
          }`}
        >
          <h2 id="history-heading" className="text-lg font-bold">
            Recent Graphs
          </h2>

          <div
            aria-hidden="true"
            className="mt-3 h-1 w-10 rounded-full bg-[#774365]"
          />

          <div className="mt-8 border-t border-[#D8C6D1] pt-7">
            {graphsLoading ? (
              <p role="status" className="text-sm">
                Loading saved graphs...
              </p>
            ) : graphsError ? (
              <p role="alert" className="text-sm font-semibold text-[#A51D32]">
                {graphsError}
              </p>
            ) : savedGraphs.length === 0 ? (
              <>
                <p className="text-sm font-semibold">No saved graphs yet</p>
                <p className="mt-2 text-sm leading-6 text-[#514752]">
                  Your saved graphs will appear here.
                </p>
              </>
            ) : (
              <ul className="max-h-[60vh] space-y-3 overflow-y-auto">
                {savedGraphs.map((savedGraph) => (
                  <li key={savedGraph.id}>
                    <button
                      type="button"
                      onClick={() => handleSavedGraphSelect(savedGraph)}
                      aria-pressed={selectedGraphId === savedGraph.id}
                      className="min-h-12 w-full rounded-lg border border-[#8B7786] bg-white p-3 text-left hover:bg-[#F2E4EC] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#774365]"
                    >
                      <span className="block break-words text-sm font-semibold">
                        {savedGraph.title ||
                          getSavedGraphData(savedGraph)?.title ||
                          "Untitled graph"}
                      </span>

                      {formatSavedDate(savedGraph.created_at) && (
                        <span className="mt-1 block text-xs text-[#514752]">
                          {formatSavedDate(savedGraph.created_at)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {graphSelectionError && (
              <p
                role="alert"
                className="mt-3 text-sm font-semibold text-[#A51D32]"
              >
                {graphSelectionError}
              </p>
            )}
          </div>
        </aside>

        {/* Main workspace */}
        <section
          aria-labelledby="dashboard-heading"
          className="min-w-0 px-5 py-10 sm:px-10 lg:px-14 lg:py-14"
        >
          <div className="mx-auto max-w-3xl">
            <h1
              id="dashboard-heading"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Explore Graphs Through Sound
            </h1>

            <p className="mt-3 text-base leading-7 text-[#443B46]">
              Upload a graph image or enter an equation to get started.
            </p>

            {/* Shared viewer for uploaded and saved graphs */}
            {activeGraph && (
              <section
                aria-labelledby="active-graph-heading"
                className="mt-8 rounded-2xl border border-[#8B7786] bg-white p-5 shadow-[4px_4px_0px_#C9B5C0] sm:p-8"
              >
                <h2
                  id="active-graph-heading"
                  className="mb-4 text-lg font-bold"
                >
                  Graph Viewer
                </h2>
                <GraphExplorer graph={activeGraph} />
              </section>
            )}

            {/* Main workspace card */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-[#8B7786] bg-white shadow-[4px_4px_0px_#C9B5C0]">
              {/* Upload option */}
              <section
                aria-labelledby="upload-heading"
                className="px-6 py-8 sm:px-9"
              >
                <div className="flex items-start gap-4">
                  <div
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F2E4EC]"
                  >
                    <svg
                      width="25"
                      height="25"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#774365"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 16V4" />
                      <path d="m7 9 5-5 5 5" />
                      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                    </svg>
                  </div>

                  <div>
                    <h2 id="upload-heading" className="text-lg font-bold">
                      Upload a Graph
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#514752]">
                      Choose a graph image to preview and explore.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="graph-upload"
                    className="block text-sm font-semibold"
                  >
                    Select a graph image
                  </label>

                  <input
                    ref={uploadInputRef}
                    id="graph-upload"
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    onChange={handleFileChange}
                    aria-invalid={Boolean(fileError)}
                    aria-describedby={
                      fileError
                        ? "upload-help upload-error"
                        : "upload-help"
                    }
                    className="mt-3 block min-h-14 w-full min-w-0 rounded-lg border-2 border-[#766374] bg-[#FCFAFB] p-2 text-sm text-[#171923] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#774365] file:px-4 file:py-3 file:font-semibold file:text-white hover:file:bg-[#603352] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
                  />

                  <p
                    id="upload-help"
                    className="mt-3 text-sm text-[#514752]"
                  >
                    PNG or JPG only, up to 5 MB
                  </p>

                  {fileError && (
                    <p
                      id="upload-error"
                      role="alert"
                      className="mt-3 text-sm font-semibold text-[#A51D32]"
                    >
                      {fileError}
                    </p>
                  )}

                  {selectedFile && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <p className="min-w-0 break-all text-sm font-medium text-[#514752]">
                        Image ready for preview: {selectedFile}
                      </p>

                      <button
                        type="button"
                        onClick={openPreview}
                        className="min-h-11 rounded-lg border-2 border-[#774365] bg-white px-4 py-2 text-sm font-bold text-[#774365] hover:bg-[#F7EDF3] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
                      >
                        View Image
                      </button>
                    </div>
                  )}

                  {selectedImage && (
                    <div className="mt-8 border-t border-[#E2D4DE] pt-8">
                      <GraphImageReader
                        selectedImage={selectedImage}
                        onGraphRead={handleGraphRead}
                        onGraphSaved={handleGraphSaved}
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* OR divider */}
              <div
                aria-hidden="true"
                className="flex items-center gap-4 px-6 sm:px-9"
              >
                <div className="h-px flex-1 bg-[#E2D4DE]" />
                <span className="text-sm font-semibold text-[#625565]">
                  OR
                </span>
                <div className="h-px flex-1 bg-[#E2D4DE]" />
              </div>

              {/* Equation option */}
              <section
                aria-labelledby="equation-heading"
                className="px-6 py-8 sm:px-9"
              >
                <div className="flex items-start gap-4">
                  <div
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F2E4EC] text-2xl font-semibold text-[#774365]"
                  >
                    ∑
                  </div>

                  <div>
                    <h2 id="equation-heading" className="text-lg font-bold">
                      Enter an Equation
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#514752]">
                      Type an equation you want to explore.
                    </p>
                  </div>
                </div>

                <EquationGraph />
              </section>
            </div>
          </div>
        </section>
      </div>

      {/* Accessible image preview modal */}
      <dialog
        ref={dialogRef}
        aria-labelledby="preview-title"
        aria-describedby="preview-description"
        onClose={() => previousFocusRef.current?.focus()}
        className="m-auto max-h-[90dvh] w-[min(92vw,850px)] overflow-y-auto rounded-2xl border-2 border-[#554450] bg-white p-0 text-[#171923] shadow-2xl backdrop:bg-[#171923]/80"
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#E2D4DE] px-5 py-4 sm:px-7">
          <h2 id="preview-title" className="text-lg font-bold sm:text-xl">
            Graph Preview
          </h2>

          <button
            type="button"
            autoFocus
            onClick={closePreview}
            aria-label="Close graph preview"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#8B7786] text-xl font-bold hover:bg-[#F2E4EC] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5 sm:px-7">
          <p className="mb-4 break-all text-sm font-medium text-[#514752]">
            {selectedFile}
          </p>

          <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-[#D8C6D1] bg-[#FAF7F9] p-3">
            {previewUrl && (
              <Image
                src={previewUrl}
                alt={`Preview of selected graph image: ${selectedFile}`}
                width={1200}
                height={800}
                unoptimized
                className="max-h-[60dvh] w-auto max-w-full object-contain"
              />
            )}
          </div>

          <p
            id="preview-description"
            className="mt-4 text-sm leading-6 text-[#514752]"
          >
            Close this preview to return to the upload area and read the graph.
          </p>

          <button
            type="button"
            onClick={closePreview}
            className="mt-5 min-h-12 rounded-lg bg-[#774365] px-6 py-3 font-semibold text-white hover:bg-[#603352] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
          >
            Close Preview
          </button>
        </div>
      </dialog>
    </div>
  );
}

function getSavedGraphData(savedGraph) {
  let graphData = savedGraph?.graph_data;

  if (typeof graphData === "string") {
    try {
      graphData = JSON.parse(graphData);
    } catch {
      return null;
    }
  }

  if (
    !graphData ||
    typeof graphData !== "object" ||
    Array.isArray(graphData)
  ) {
    return null;
  }

  return graphData;
}

function formatSavedDate(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : `Saved ${date.toLocaleDateString()}`;
}

async function fetchSavedGraphsFromApi() {
  const response = await fetch("/api/graphs", { cache: "no-store" });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error ||
        (response.status === 401
          ? "Sign in to view your saved graphs."
          : "Could not load saved graphs.")
    );
  }

  if (!Array.isArray(result.graphs)) {
    throw new Error("The saved graphs response was invalid.");
  }

  return result.graphs;
}