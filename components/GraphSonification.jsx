"use client";

import { useEffect, useRef, useState } from "react";

const MIN_FREQUENCY = 220;
const MAX_FREQUENCY = 880;
const TONE_DURATION_SECONDS = 0.3;
const TONE_VOLUME = 0.15;

/**
 * Keep an x-coordinate within the graph's visible range.
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format a coordinate for display without unnecessary trailing digits.
 */
function formatValue(value) {
  return Number(value.toPrecision(4)).toString();
}

/**
 * Find the graph's y-value at a given x-coordinate.
 * Values between points are linearly interpolated.
 *
 * This assumes the points describe a function with one y-value per x-value.
 */
function getYAtX(points, x) {
  if (x <= points[0].x) return points[0].y;

  if (x >= points[points.length - 1].x) {
    return points[points.length - 1].y;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];

    if (x === left.x) return left.y;

    if (x >= left.x && x <= right.x && right.x > left.x) {
      const fraction = (x - left.x) / (right.x - left.x);
      return left.y + fraction * (right.y - left.y);
    }
  }

  return points[points.length - 1].y;
}

/**
 * Lets a user explore a graph one x-unit at a time.
 * The y-value at the selected x-coordinate determines the tone's pitch.
 *
 * Expected graph shape:
 * {
 *   points: [{ x: number, y: number }, ...]
 * }
 */
export default function GraphSonification({ graph }) {
  const [selectedX, setSelectedX] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  const audioContextRef = useRef(null);

  const points = Array.isArray(graph?.points)
    ? graph.points
        .filter(
          (point) =>
            Number.isFinite(point?.x) && Number.isFinite(point?.y)
        )
        .sort((a, b) => a.x - b.x)
    : [];

  useEffect(() => {
    return () => {
      const audioContext = audioContextRef.current;
      audioContextRef.current = null;

      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
    };
  }, []);

  if (points.length < 2) {
    return (
      <section aria-labelledby="graph-sonification-title">
        <h2 id="graph-sonification-title">Explore the graph with sound</h2>
        <p role="status">At least two valid graph points are needed.</p>
      </section>
    );
  }

  const minX = points[0].x;
  const maxX = points[points.length - 1].x;

  // Start at x = 0 when it is in range; otherwise use the nearest boundary.
  const initialX = clamp(0, minX, maxX);
  const currentX =
    selectedX === null ? initialX : clamp(selectedX, minX, maxX);
  const currentY = getYAtX(points, currentX);

  /**
   * Play one short tone. Higher y-values map to higher pitches.
   */
  async function playTone(yValue) {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error("Audio playback is not supported in this browser.");
      }

      let audioContext = audioContextRef.current;

      if (!audioContext || audioContext.state === "closed") {
        audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
      }

      // Browsers may suspend audio until a user action resumes it.
      await audioContext.resume();

      const minY = Math.min(...points.map((point) => point.y));
      const maxY = Math.max(...points.map((point) => point.y));

      // A horizontal graph uses a middle-range pitch.
      const normalizedY =
        minY === maxY ? 0.5 : (yValue - minY) / (maxY - minY);

      const frequency =
        MIN_FREQUENCY + normalizedY * (MAX_FREQUENCY - MIN_FREQUENCY);

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startTime = audioContext.currentTime;
      const endTime = startTime + TONE_DURATION_SECONDS;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startTime);

      // Fade the tone in and out to avoid clicks.
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(TONE_VOLUME, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(endTime);

      setError("");
    } catch (audioError) {
      setError(
        audioError instanceof Error
          ? audioError.message
          : "Could not play the graph tone."
      );
    }
  }

  /**
   * Move one x-unit, clamp at the graph boundaries, and play the new y-value.
   */
  function moveBy(direction) {
    const nextX = clamp(currentX + direction, minX, maxX);

    if (nextX === currentX) {
      setAnnouncement(
        `At the ${direction < 0 ? "left" : "right"} edge of the graph.`
      );
      return;
    }

    const nextY = getYAtX(points, nextX);

    setSelectedX(nextX);
    setAnnouncement(
      `x ${formatValue(nextX)}, y ${formatValue(nextY)}. Playing tone.`
    );

    void playTone(nextY);
  }

  /**
   * Use the arrow keys while the graph controls are focused.
   */
  function handleKeyDown(event) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveBy(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveBy(-1);
    }
  }

  return (
    <section aria-labelledby="graph-sonification-title">
      <h2 id="graph-sonification-title">Explore the graph with sound</h2>

      <p id="graph-sonification-instructions">
        Focus the controls below. Press the Left or Right Arrow key to move one
        x-unit. Higher y-values produce higher pitches.
      </p>

      <div
        role="group"
        aria-label="Graph sound controls"
        aria-describedby="graph-sonification-instructions"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ outlineOffset: 4 }}
      >
        <button
          type="button"
          onClick={() => moveBy(-1)}
          aria-label="Move left one x-unit and play its graph value"
        >
          Left
        </button>

        <button
          type="button"
          onClick={() => moveBy(1)}
          aria-label="Move right one x-unit and play its graph value"
        >
          Right
        </button>
      </div>

      <p>
        Current point: x = {formatValue(currentX)}, y = {formatValue(currentY)}
      </p>

      <p role="status" aria-live="polite">
        {announcement ||
          `Starting point: x = ${formatValue(currentX)}, y = ${formatValue(currentY)}.`}
      </p>

      {error && <p role="alert">{error}</p>}
    </section>
  );
}