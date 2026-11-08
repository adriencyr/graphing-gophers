
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function GuestPage() {
  const [selectedFile, setSelectedFile] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const [equation, setEquation] = useState("");

  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const objectUrlRef = useRef(null);

  // Clean up temporary image URLs
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  // Open graph preview
  function openPreview() {
    previousFocusRef.current = document.activeElement;

    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }

  // Close graph preview
  function closePreview() {
    dialogRef.current?.close();
  }

  // Validate PNG and JPG files
  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const validType = ["image/png", "image/jpeg"].includes(file.type);
    const validExtension = /\.(png|jpe?g)$/i.test(file.name);

    if (!validType || !validExtension) {
      setFileError("Please choose a PNG or JPG image.");
      setSelectedFile("");
      setPreviewUrl("");
      event.target.value = "";

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      return;
    }

    const newUrl = URL.createObjectURL(file);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    objectUrlRef.current = newUrl;

    setSelectedFile(file.name);
    setPreviewUrl(newUrl);
    setFileError("");

    openPreview();
  }

  return (
    <div className="min-h-full bg-[#EEE3E9] px-5 py-8 text-[#171923] sm:px-8 lg:py-10">

      <div className="mx-auto w-full max-w-3xl">

        {/* WELCOME CARD */}
        <section
          aria-labelledby="guest-heading"
          className="rounded-[28px] border-2 border-[#C7A1B8] bg-[#FAF7F9] px-6 py-7 shadow-[4px_4px_0px_#D4B9C9] sm:px-8 sm:py-8"
        >
          <div
            aria-hidden="true"
            className="mb-4 h-1 w-12 rounded-full bg-[#774365]"
          />

          <h1
            id="guest-heading"
            className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
          >
            Explore Graphs Through Sound
          </h1>

          <p className="mt-3 text-base leading-7 text-[#443B46]">
            Upload a graph image or enter an equation to get started.
          </p>

          {/* Guest information */}
          <p className="mt-4 inline-flex rounded-lg border border-[#C7A1B8] bg-[#F2E4EC] px-3 py-2 text-sm font-medium text-[#603352]">
            Guest mode — your graphs won't be saved.
          </p>
        </section>

        {/* MAIN GRAPH INPUT CARD */}
        <div className="mt-7 overflow-hidden rounded-[28px] border border-[#8B7786] bg-white shadow-[4px_4px_0px_#C9B5C0]">

          {/* UPLOAD SECTION */}
          <section
            aria-labelledby="upload-heading"
            className="px-6 py-8 sm:px-9"
          >
            <div className="flex items-start gap-4">

              {/* Upload icon */}
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
                  Choose a graph image to preview.
                </p>
              </div>
            </div>

            {/* File input */}
            <div className="mt-6">
              <label
                htmlFor="guest-graph-upload"
                className="block text-sm font-semibold"
              >
                Select a graph image
              </label>

              <input
                id="guest-graph-upload"
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={handleFileChange}
                aria-invalid={Boolean(fileError)}
                aria-describedby={
                  fileError
                    ? "guest-upload-help guest-upload-error"
                    : "guest-upload-help"
                }
                className="mt-3 block min-h-14 w-full min-w-0 rounded-xl border-2 border-[#766374] bg-[#FCFAFB] p-2 text-sm text-[#171923] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#774365] file:px-4 file:py-3 file:font-semibold file:text-white hover:file:bg-[#603352] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
              />

              <p
                id="guest-upload-help"
                className="mt-3 text-sm text-[#514752]"
              >
                PNG or JPG only
              </p>

              {/* Validation error */}
              {fileError && (
                <p
                  id="guest-upload-error"
                  role="alert"
                  className="mt-3 text-sm font-semibold text-[#A51D32]"
                >
                  {fileError}
                </p>
              )}

              {/* Selected file */}
              {selectedFile && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p
                    role="status"
                    className="min-w-0 break-all text-sm font-medium text-[#514752]"
                  >
                    Selected: {selectedFile}
                  </p>

                  <button
                    type="button"
                    onClick={openPreview}
                    className="min-h-11 rounded-xl border-2 border-[#774365] bg-white px-4 py-2 text-sm font-bold text-[#774365] hover:bg-[#F7EDF3] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
                  >
                    View Image
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* OR DIVIDER */}
          <div
            className="flex items-center gap-4 px-6 sm:px-9"
            aria-hidden="true"
          >
            <div className="h-px flex-1 bg-[#E2D4DE]" />
            <span className="text-sm font-semibold text-[#625565]">
              OR
            </span>
            <div className="h-px flex-1 bg-[#E2D4DE]" />
          </div>

          {/* EQUATION SECTION */}
          <section
            aria-labelledby="equation-heading"
            className="px-6 py-8 sm:px-9"
          >
            <div className="flex items-start gap-4">

              {/* Equation icon */}
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
                  Type an equation to explore.
                </p>
              </div>
            </div>

            {/* Equation input */}
            <div className="mt-6">
              <label
                htmlFor="guest-equation-input"
                className="block text-sm font-semibold"
              >
                Mathematical equation
              </label>

              <input
                id="guest-equation-input"
                type="text"
                value={equation}
                onChange={(event) => setEquation(event.target.value)}
                placeholder="y = x^2 + 3"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="guest-equation-help"
                className="mt-3 min-h-14 w-full rounded-xl border-2 border-[#766374] bg-[#FCFAFB] px-4 py-3 text-base text-[#171923] placeholder:text-[#6B6070] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
              />

              <p
                id="guest-equation-help"
                className="mt-3 text-sm text-[#514752]"
              >
                Example: y = x^2 + 3
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* ACCESSIBLE IMAGE PREVIEW */}
      <dialog
        ref={dialogRef}
        aria-labelledby="guest-preview-title"
        aria-describedby="guest-preview-description"
        onClose={() => previousFocusRef.current?.focus()}
        className="m-auto max-h-[90dvh] w-[min(92vw,850px)] overflow-y-auto rounded-2xl border-2 border-[#554450] bg-white p-0 text-[#171923] shadow-2xl backdrop:bg-[#171923]/80"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#E2D4DE] px-5 py-4 sm:px-7">
          <h2
            id="guest-preview-title"
            className="text-lg font-bold sm:text-xl"
          >
            Graph Preview
          </h2>

          <button
            type="button"
            autoFocus
            onClick={closePreview}
            aria-label="Close graph preview"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#8B7786] text-xl font-bold hover:bg-[#F2E4EC] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
          >
            ×
          </button>
        </div>

        {/* Preview content */}
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
            id="guest-preview-description"
            className="mt-4 text-sm leading-6 text-[#514752]"
          >
            This is a preview of your selected graph.
            Audio exploration is not connected yet.
          </p>

          <button
            type="button"
            onClick={closePreview}
            className="mt-5 min-h-12 rounded-xl bg-[#774365] px-6 py-3 font-semibold text-white hover:bg-[#603352] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
          >
            Close Preview
          </button>
        </div>
      </dialog>
    </div>
  );
}
