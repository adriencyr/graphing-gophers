# Dashboard image reading and sound

## Using the dashboard

1. Open `/dashboard` and choose a PNG or JPEG graph image, up to 5 MB.
2. Inspect the existing image preview and close it.
3. Choose **Read graph** below the upload field.
4. The returned coordinates appear in the existing `GraphPlot` component, with
   the reader's confidence and notes. These are image-based estimates.
5. Focus **Graph sound controls** and press Left/Right Arrow, or use its Left
   and Right buttons, to move one x-unit and play the corresponding tone.
   Audio begins only after a user action; higher y-values mean higher pitches.

Unreadable or low-confidence images show an explanation without a graph.
Repeated x-coordinates can be plotted, but sound is unavailable because the
existing sound component expects exactly one point per x-coordinate.

## Server configuration

The existing `/api/extract-graph` endpoint requires `GEMINI_API_KEY` in the
server environment (locally, `.env.local`). `GEMINI_MODEL` can optionally select
an available model for the project's Gemini account. Restart the server after
changing environment settings. No key belongs in browser code or Git.

Without a configured key, **Read graph** displays the server's configuration
error and allows another attempt. Full live image analysis has not been tested
in this workspace because `GEMINI_API_KEY` is missing.

## Code flow

- `app/dashboard/page.js` retains the selected `File` alongside its existing
  preview. It checks type, extension, non-empty content, and the 5 MB limit.
- `GraphImageReader` accepts an optional `image` prop to use that file without
  adding a second upload field. Its original standalone upload mode still works.
  The dashboard keys it by preview URL, resetting results and sound when the
  user selects a different image.
- **Read graph** posts the file as multipart `image` to `/api/extract-graph`.
  It blocks duplicate requests and aborts obsolete requests when the reader
  unmounts. Aborted responses cannot replace the current graph.
- Validated, sorted points feed both `GraphPlot` and `GraphSonification`.
  Both components retain their existing rendering and audio algorithms.
- Loading and errors use status/alert messages. Plotting does not start audio
  automatically. Leaving or replacing the graph closes its audio context.

Equation parsing, database saving, and graph history are separate work.

## Verification

`npm test` exercises the dashboard upload, posted file, actual plot and sound
components (with a simulated Web Audio device), keyboard controls, duplicate
requests, replacement uploads, unreadable responses, API errors, invalid data,
repeated x-coordinates, and image-size validation. Tests use mocked analysis
responses and do not send files to Gemini.
