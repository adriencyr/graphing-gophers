
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import GraphImageReader from "../../components/GraphImageReader";

export default function Dashboard() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const [equation, setEquation] = useState("");

  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const objectUrlRef = useRef(null);

  // Release temporary image memory when leaving the page
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  // Open the accessible image preview
  function openPreview() {
    previousFocusRef.current = document.activeElement;

    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }

  function closePreview() {
    dialogRef.current?.close();
  }

  // Validate and preview the selected graph image
  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const validType = ["image/png", "image/jpeg"].includes(
      file.type
    );

    const validExtension = /\.(png|jpe?g)$/i.test(file.name);

    if (!validType || !validExtension || file.size === 0 ||
        file.size > 5 * 1024 * 1024) {
      setFileError("Choose a non-empty PNG or JPG image, up to 5 MB.");
      setImageFile(null);
      setSelectedFile("");
      setPreviewUrl("");
      event.target.value = "";

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      return;
    }

    // Create a temporary browser URL for preview
    const newUrl = URL.createObjectURL(file);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    objectUrlRef.current = newUrl;

    setSelectedFile(file.name);
    setImageFile(file);
    setPreviewUrl(newUrl);
    setFileError("");

    // Open automatically after selection
    openPreview();
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

        {/* HISTORY SIDEBAR */}
        <aside
          id="graph-history"
          aria-labelledby="history-heading"
          className={`border-b border-[#D8C6D1] bg-[#F7F2F5] px-6 py-9 lg:block lg:border-b-0 lg:border-r ${
            historyOpen ? "block" : "hidden"
          }`}
        >
          <h2
            id="history-heading"
            className="text-lg font-bold"
          >
            Recent Graphs
          </h2>

          <div
            aria-hidden="true"
            className="mt-3 h-1 w-10 rounded-full bg-[#774365]"
          />

          <div className="mt-8 border-t border-[#D8C6D1] pt-7">
            <p className="text-sm font-semibold">
              No saved graphs yet
            </p>

            <p className="mt-2 text-sm leading-6 text-[#514752]">
              Your saved graphs will appear here.
            </p>
          </div>
        </aside>

        {/* WORKSPACE */}
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
              Upload a graph image or enter an equation
              to get started.
            </p>

            {/* MAIN WORKSPACE CARD */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-[#8B7786] bg-white shadow-[4px_4px_0px_#C9B5C0]">

              {/* UPLOAD OPTION */}
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
                    <h2
                      id="upload-heading"
                      className="text-lg font-bold"
                    >
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
                    PNG or JPG, up to 5 MB
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
                        Image ready for preview
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
                </div>

                {imageFile && (
                  <div className="mt-6 border-t border-[#D8C6D1] pt-6">
                    <GraphImageReader key={previewUrl} image={imageFile} />
                  </div>
                )}
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

              {/* EQUATION OPTION */}
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
                    <h2
                      id="equation-heading"
                      className="text-lg font-bold"
                    >
                      Enter an Equation
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#514752]">
                      Type an equation you want to explore.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="equation-input"
                    className="block text-sm font-semibold"
                  >
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
                    aria-describedby="equation-help"
                    className="mt-3 min-h-14 w-full rounded-lg border-2 border-[#766374] bg-[#FCFAFB] px-4 py-3 text-base text-[#171923] placeholder:text-[#6B6070] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
                  />

                  <p
                    id="equation-help"
                    className="mt-3 text-sm text-[#514752]"
                  >
                    Example: y = x^2 + 3
                  </p>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>

      {/* ACCESSIBLE IMAGE PREVIEW MODAL */}
      <dialog
        ref={dialogRef}
        aria-labelledby="preview-title"
        aria-describedby="preview-description"
        onClose={() => previousFocusRef.current?.focus()}
        className="m-auto w-[min(92vw,850px)] max-h-[90dvh] overflow-y-auto rounded-2xl border-2 border-[#554450] bg-white p-0 text-[#171923] shadow-2xl backdrop:bg-[#171923]/80"
      >
        {/* Popup header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#E2D4DE] px-5 py-4 sm:px-7">
          <h2
            id="preview-title"
            className="text-lg font-bold sm:text-xl"
          >
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

        {/* Selected graph image */}
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
            This is a preview of your selected image.
            Close this preview and choose Read graph below the upload field
            to generate a plot and explore its values with sound.
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








