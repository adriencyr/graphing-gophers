# Keyboard graph sonification

1. Create an equation graph, read an uploaded graph, or open a saved graph.
2. Click the plotted graph, or Tab to **Graph sound controls**.
3. Press Left or Right Arrow to move horizontally. The purple marker and dashed
   line indicate the selected position. Its x/y values appear below the graph.
4. Each movement plays a short tone. Higher y-values produce higher pitches.
   **Play current point** plays the value without moving. Left and Right buttons
   provide the same movement on touch devices.

Movement is one x-unit for domains spanning at least 20 units. Smaller domains
use one-twentieth of their span so narrow graphs remain navigable. Movement stops
at the graph boundaries. Keys are handled only inside the focused graph controls;
arrow keys in equation inputs still edit text normally.

Pitch is relative to the displayed data: the lowest y maps to 220 Hz and the
highest to 880 Hz. A horizontal graph uses 550 Hz. Values between sampled points
are linearly interpolated. Domain gaps remain silent and are announced instead
of inventing a value. Graphs with repeated x-coordinates cannot be sonified
unambiguously and display an explanation.

## Implementation

- `GraphExplorer.jsx` composes the plot and sound controls. Its render function
  passes the current point from `GraphSonification` into `GraphPlot`.
- `GraphPlot.jsx` accepts an optional `selectedPoint` and draws the cursor with
  the same coordinate transforms used for the curve.
- `GraphSonification.jsx` sorts valid data, respects equation segments, handles
  focused arrow keys, updates the marker, and maps y to pitch. It keeps an
  immediate cursor for rapid key events so movement never reuses stale state.
- Web Audio starts/resumes only after a key press or click. New tones stop old
  tones; superseded pending playback cannot start later. Nodes are disconnected
  when finished, and audio closes when the graph changes or unmounts.
- The existing `onPositionChange` callback remains available for other consumers.
- Both the dashboard's uploaded/saved graph viewer and equation results use the
  explorer. ElevenLabs voice integration is separate and is unchanged.

## Verification

Tests simulate a Web Audio device to verify increasing/decreasing pitch,
interpolation, narrow domains, keyboard focus, rapid keys, boundaries, silent
gaps, horizontal graphs, unsupported audio, cleanup, marker updates, and dashboard
and equation integration. Actual speaker output still needs a browser check.

Run `npm test`, `npm run typecheck`, and `npm run build`. For manual verification,
use `y = x` over -10 to 10. Click its plot and move right: both the displayed y
and the tone's pitch should increase. Moving left should lower both. Check system
volume and that the browser tab is not muted if no sound is audible.
