"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

const MIN_FREQUENCY = 220;
const MAX_FREQUENCY = 880;
const DURATION = 0.3;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatValue(value) {
  return Number(value.toPrecision(4)).toString();
}

/** Interpolate only inside a continuous section; never bridge a domain gap. */
function getYAtX(segments, x) {
  for (const points of segments) {
    if (!points.length || x < points[0].x || x > points.at(-1).x) continue;
    for (let i = 0; i < points.length; i += 1) {
      const right = points[i];
      if (right.x === x) return right.y;
      if (right.x > x && i > 0) {
        const left = points[i - 1];
        return left.y + (x - left.x) / (right.x - left.x) *
          (right.y - left.y);
      }
    }
  }
  return null;
}

/** Stop and disconnect the previous tone before another one starts. */
function stopTone(toneRef) {
  const tone = toneRef.current;
  toneRef.current = null;
  if (!tone) return;
  tone.oscillator.onended = null;
  try { tone.oscillator.stop(); } catch { /* It may have already ended. */ }
  tone.oscillator.disconnect();
  tone.gain.disconnect();
}

/**
 * Focusable graph controls with y-to-pitch playback. A render-function child
 * receives the current point so the plot can display the same position.
 */
export default function GraphSonification({
  graph, onPositionChange, children,
}) {
  const [selection, setSelection] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const audioContextRef = useRef(null);
  const toneRef = useRef(null);
  const sequenceRef = useRef(0);
  const cursorRef = useRef(null);
  const titleId = useId();
  const instructionsId = useId();

  const { points, segments } = useMemo(() => {
    const valid = (point) =>
      Number.isFinite(point?.x) && Number.isFinite(point?.y);
    const points = Array.isArray(graph?.points)
      ? graph.points.filter(valid).sort((a, b) => a.x - b.x)
      : [];
    const segments = Array.isArray(graph?.segments)
      ? graph.segments.filter(Array.isArray).map((section) =>
          section.filter(valid).sort((a, b) => a.x - b.x))
      : [points];
    return { points, segments };
  }, [graph]);

  const hasFunction = points.length >= 2 &&
    new Set(points.map((point) => point.x)).size === points.length;
  const minX = points[0]?.x ?? 0;
  const maxX = points.at(-1)?.x ?? 0;
  const initialX = clamp(0, minX, maxX);
  const currentX = selection?.graph === graph
    ? clamp(selection.x, minX, maxX) : initialX;
  const currentY = getYAtX(segments, currentX);
  // Keep the original one-unit movement, with finer steps for small domains.
  const step = Math.min(1, (maxX - minX) / 20);
  const error = audioError?.graph === graph ? audioError.message : "";
  const announcement = feedback?.graph === graph ? feedback.message : "";

  useEffect(() => {
    onPositionChange?.(hasFunction ? currentX : null);
  }, [hasFunction, currentX, onPositionChange]);

  // A different graph or unmount invalidates pending playback and closes audio.
  useEffect(() => () => {
    sequenceRef.current += 1;
    stopTone(toneRef);
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close().catch(() => {});
    }
  }, [graph]);

  async function playTone(y) {
    const sequence = ++sequenceRef.current;
    stopTone(toneRef);
    if (y === null) return;
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Audio playback is not supported in this browser.");
      }
      let context = audioContextRef.current;
      if (!context || context.state === "closed") {
        context = new AudioContextClass();
        audioContextRef.current = context;
      }
      // Invoked by a click or key press so browsers can unlock audio.
      await context.resume();
      if (sequence !== sequenceRef.current) return;
      if (context.state !== "running") {
        throw new Error("Sound is paused. Click Play current point to retry.");
      }
      const minY = Math.min(...points.map((point) => point.y));
      const maxY = Math.max(...points.map((point) => point.y));
      const ratio = minY === maxY ? 0.5 :
        clamp((y - minY) / (maxY - minY), 0, 1);
      const frequency = MIN_FREQUENCY + ratio *
        (MAX_FREQUENCY - MIN_FREQUENCY);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime;
      const end = start + DURATION;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(context.destination);
      toneRef.current = { oscillator, gain };
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        if (toneRef.current?.oscillator === oscillator) toneRef.current = null;
      };
      oscillator.start(start);
      oscillator.stop(end);
      setAudioError(null);
    } catch (error) {
      if (sequence !== sequenceRef.current) return;
      setAudioError({ graph, message: error instanceof Error
        ? error.message : "Could not play the graph tone." });
    }
  }

  function selectPoint(x, edge = "") {
    const y = getYAtX(segments, x);
    cursorRef.current = { graph, x };
    setSelection({ graph, x });
    setFeedback({ graph, message: y === null
      ? `x ${formatValue(x)}: the function is undefined here. No tone.`
      : `${edge}x ${formatValue(x)}, y ${formatValue(y)}.` });
    void playTone(y);
  }

  function moveBy(direction) {
    // Read the immediate cursor so rapid key events never reuse an old x.
    const x = cursorRef.current?.graph === graph
      ? cursorRef.current.x : currentX;
    const next = clamp(Number((x + direction * step).toPrecision(14)),
      minX, maxX);
    selectPoint(next, next === x ? "At the edge of the graph. " : "");
  }

  function handleKeyDown(event) {
    if (!hasFunction || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest("input, textarea, select, [contenteditable]")) {
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveBy(event.key === "ArrowRight" ? 1 : -1);
    }
  }

  const buttonStyle =
    "min-h-11 rounded-lg border border-[#774365] bg-white px-4 py-2 " +
    "font-semibold text-[#603352] hover:bg-[#F7EDF3] " +
    "focus-visible:outline-4 focus-visible:outline-offset-4 " +
    "focus-visible:outline-[#774365] disabled:opacity-50";

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="mb-2 text-lg font-semibold">
        Explore the graph with sound
      </h3>
      <p id={instructionsId} className="mb-3 text-sm text-[#514752]">
        Click the graph or Tab to its controls, then press Left or Right Arrow.
        Each press moves {formatValue(step)} x-units and plays the y-value.
        Higher values produce higher pitches. Sound starts only on interaction.
      </p>
      <div
        role="group"
        aria-label="Graph sound controls"
        aria-describedby={instructionsId}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={(event) => {
          if (!event.target.closest("button, input, a")) {
            event.currentTarget.focus();
          }
        }}
        className="rounded-lg p-2 focus-visible:outline-4
          focus-visible:outline-offset-4 focus-visible:outline-[#774365]"
      >
        {typeof children === "function" && children(
          hasFunction && currentY !== null
            ? { x: currentX, y: currentY } : null,
        )}
        {hasFunction ? (
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className={buttonStyle}
              onClick={() => moveBy(-1)} aria-label="Move left and play tone">
              Left
            </button>
            <button type="button" className={buttonStyle}
              onClick={() => selectPoint(currentX)}>
              Play current point
            </button>
            <button type="button" className={buttonStyle}
              onClick={() => moveBy(1)} aria-label="Move right and play tone">
              Right
            </button>
          </div>
        ) : (
          <p className="mt-3">
            Sound requires at least two points with distinct x-coordinates.
          </p>
        )}
      </div>
      {hasFunction && <p className="mt-3 text-sm">
        Current point: x = {formatValue(currentX)}, y = {currentY === null
          ? "undefined" : formatValue(currentY)}
      </p>}
      <p role="status" aria-live="polite" className="mt-2 text-sm">
        {announcement}
      </p>
      {error && <p role="alert" className="mt-3 text-[#A51D32]">{error}</p>}
    </section>
  );
}
