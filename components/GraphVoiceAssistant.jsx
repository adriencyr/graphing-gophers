"use client";

import { useState } from "react";
import {
  ConversationProvider,
  useConversation,
  useConversationClientTool,
} from "@elevenlabs/react";

export default function GraphVoiceAssistant({
  graph = null,
  currentX = null,
  getGraphFacts,
}) {
  return (
    <ConversationProvider>
      <GraphVoiceAssistantControls
        graph={graph}
        currentX={currentX}
        getGraphFacts={getGraphFacts}
      />
    </ConversationProvider>
  );
}

function GraphVoiceAssistantControls({ graph, currentX, getGraphFacts }) {
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState([]);

  const conversation = useConversation({
    onError: (conversationError) => {
      setError(
        conversationError instanceof Error
          ? conversationError.message
          : "The voice conversation encountered an error."
      );
    },
    onMessage: (message) => {
      const text =
        typeof message === "string"
          ? message
          : message?.message ?? message?.text ?? message?.transcript;

      if (typeof text === "string" && text.trim()) {
        setTranscript((previous) => [...previous, text.trim()]);
      }
    },
  });

  const {
    status,
    isSpeaking,
    isListening,
    isMuted,
    setMuted,
    startSession,
    endSession,
  } = conversation;

  // The tool name must match the name configured in the ElevenLabs dashboard.
  useConversationClientTool("get_graph_facts", () => {
    if (!graph || typeof getGraphFacts !== "function") {
      return JSON.stringify({
        status: "unavailable",
        reason: "There is no graph data available yet.",
      });
    }

    return JSON.stringify(getGraphFacts(graph, currentX));
  });

  async function handleStart() {
    setError("");
    setTranscript([]);

    try {
      const response = await fetch("/api/elevenlabs/conversation-token", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.token) {
        throw new Error(result.error || "Could not connect to ElevenLabs.");
      }

      await startSession({ conversationToken: result.token });
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Could not start voice chat. Check microphone access and try again."
      );
    }
  }

  async function handleEnd() {
    setError("");

    try {
      await endSession();
    } catch {
      setError("Could not end the voice conversation.");
    }
  }

  const statusText =
    status === "connecting"
      ? "Connecting…"
      : status === "connected"
        ? isSpeaking
          ? "GraphGuide is speaking"
          : isListening
            ? "Listening"
            : "Connected"
        : "Not connected";

  return (
    <section aria-labelledby="graph-voice-title">
      <h2 id="graph-voice-title">Ask about this graph</h2>

      <p role="status" aria-live="polite">
        {statusText}
      </p>

      {status === "connected" ? (
        <>
          <button type="button" onClick={() => setMuted(!isMuted)}>
            {isMuted ? "Unmute microphone" : "Mute microphone"}
          </button>

          <button type="button" onClick={handleEnd}>
            End conversation
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleStart}
          disabled={status === "connecting"}
        >
          {status === "connecting" ? "Connecting…" : "Start voice chat"}
        </button>
      )}

      {error && <p role="alert">{error}</p>}

      {transcript.length > 0 && (
        <div aria-label="Conversation transcript" aria-live="polite">
          <h3>Conversation</h3>
          <ol>
            {transcript.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}