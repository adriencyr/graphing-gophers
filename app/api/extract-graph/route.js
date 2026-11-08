import { GoogleGenAI, Type } from "@google/genai";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_POINTS = 250;
const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);

const graphSchema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ["readable", "unreadable"],
    },
    title: { type: Type.STRING },
    xLabel: { type: Type.STRING },
    yLabel: { type: Type.STRING },
    confidence: {
      type: Type.STRING,
      enum: ["high", "medium", "low"],
    },
    points: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER },
        },
        required: ["x", "y"],
      },
    },
    notes: { type: Type.STRING },
  },
  required: [
    "status",
    "title",
    "xLabel",
    "yLabel",
    "confidence",
    "points",
    "notes",
  ],
};

function isValidGraphResponse(graph) {
  return (
    graph !== null &&
    typeof graph === "object" &&
    ["readable", "unreadable"].includes(graph.status) &&
    typeof graph.title === "string" &&
    typeof graph.xLabel === "string" &&
    typeof graph.yLabel === "string" &&
    CONFIDENCE_LEVELS.has(graph.confidence) &&
    typeof graph.notes === "string" &&
    Array.isArray(graph.points) &&
    graph.points.length <= MAX_POINTS &&
    graph.points.every(
      (point) =>
        point !== null &&
        typeof point === "object" &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y)
    )
  );
}

/**
 * Reads an uploaded XY graph image using Gemini and returns validated data.
 * The Gemini API key is read only from the server environment.
 */
export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Graph reading is not configured on the server." },
      { status: 500 }
    );
  }

  let formData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Could not read the uploaded form." },
      { status: 400 }
    );
  }

  const image = formData.get("image");

  if (!image || typeof image.arrayBuffer !== "function") {
    return Response.json(
      { error: "Please upload a graph image." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(image.type)) {
    return Response.json(
      { error: "Upload a PNG or JPEG image." },
      { status: 400 }
    );
  }

  if (image.size === 0) {
    return Response.json(
      { error: "The selected image is empty." },
      { status: 400 }
    );
  }

  if (image.size > MAX_IMAGE_SIZE) {
    return Response.json(
      { error: "The image must be 5 MB or smaller." },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const imageData = Buffer.from(await image.arrayBuffer()).toString("base64");

    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      contents: [
        {
          inlineData: {
            mimeType: image.type,
            data: imageData,
          },
        },
        {
          text: [
            "Analyze this image as an XY Cartesian graph with linear axes.",
            "Estimate coordinates along the visible curve using the axis labels and tick marks.",
            "Sample the entire visible curve, including unmarked sections, endpoints, turning points, and enough intermediate points to represent its shape.",
            "Return points in increasing x order because the app will connect them.",
            "Do not extrapolate beyond the visible curve or invent points.",
            "If this is not a graph, its axes or scale cannot be read, or the curve is too blurry to estimate responsibly, return status unreadable and an empty points array.",
            "For unreadable images, explain why in notes.",
            "Use empty strings for labels or title that cannot be read.",
            "Set confidence to high, medium, or low based on how clearly the image supports the estimates.",
            "Use notes to explain uncertainty, blur, or other image issues.",
          ].join(" "),
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: graphSchema,
      },
    });

    const graph = JSON.parse(result.text);

    if (!isValidGraphResponse(graph)) {
      return Response.json(
        { error: "Graph analysis returned an unexpected response." },
        { status: 502 }
      );
    }

    // Do not present low-confidence estimates as readable graph data.
    if (graph.status === "readable" && graph.confidence === "low") {
      graph.status = "unreadable";
      graph.points = [];
      graph.notes ||= "The graph image is too unclear to estimate reliably.";
    }

    if (graph.status === "readable" && graph.points.length < 2) {
      graph.status = "unreadable";
      graph.points = [];
      graph.notes ||= "Not enough points could be estimated to draw the graph.";
    }

    if (graph.status === "unreadable") {
      graph.points = [];
      return Response.json(graph);
    }

    graph.points.sort((a, b) => a.x - b.x);

    return Response.json(graph);
  } catch (error) {
        console.error("[Graph Extraction] Request failed:", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
        status: error?.status,
        code: error?.code,
    });

    return Response.json(
        { error: "Could not read that graph image. Try a clearer image." },
        { status: 502 }
    );
    }
}