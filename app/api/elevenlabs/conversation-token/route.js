import { auth0 } from "@/lib/auth0";

export async function POST() {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return Response.json(
        { error: "Sign in to start voice chat." },
        { status: 401 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;

    if (!apiKey || !agentId) {
      return Response.json(
        { error: "ElevenLabs is not configured on the server." },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const details = await response.text();
      console.error(
        "[ElevenLabs token] Request failed:",
        response.status,
        details
      );

      return Response.json(
        { error: "Could not start the voice session." },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (typeof data.token !== "string" || !data.token) {
      console.error("[ElevenLabs token] Response did not contain a token.");

      return Response.json(
        { error: "ElevenLabs returned an invalid session token." },
        { status: 502 }
      );
    }

    return Response.json(
      { token: data.token },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[ElevenLabs token] Unexpected error:", error);

    return Response.json(
      { error: "Could not start the voice session." },
      { status: 502 }
    );
  }
}