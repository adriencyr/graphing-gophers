import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/png", "image/jpeg"]);
const maxImageSize = 5 * 1024 * 1024;

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

export async function POST(request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "Graph reading is not configured on the server." },
      { status: 500 }
    );
  }

  let image;

  try {
    const formData = await request.formData();
    image = formData.get("image");
  } catch {
    return Response.json(
      { error: "Could not read the uploaded form." },
      { status: 400 }
    );
  }

  if (!image || typeof image.arrayBuffer !== "function") {
    return Response.json(
      { error: "Please upload a graph image." },
      { status: 400 }
    );
  }

  if (!allowedTypes.has(image.type)) {
    return Response.json(
      { error: "Upload a PNG or JPEG image." },
      { status: 400 }
    );
  }

  if (image.size > maxImageSize) {
    return Response.json(
      { error: "The image must be 5 MB or smaller." },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const imageData = Buffer.from(await image.arrayBuffer()).toString("base64");

    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
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
            "Estimate coordinates along the visible continuous curve using the axis labels and tick marks.",
            "Return points in increasing x order because the app will join them.",
            "Do not extrapolate beyond the visible curve or invent points.",
            'If the graph or its scale is not readable, set status to "unreadable" and return an empty points array.',
            "Use empty strings for labels or title you cannot read.",
            "Set confidence to high, medium, or low based on how clearly the image supports the estimates.",
            "Use notes to describe uncertainty or image issues.",
          ].join(" "),
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: graphSchema,
      },
    });

    const graph = JSON.parse(result.text);

    const validPoints =
      Array.isArray(graph.points) &&
      graph.points.length <= 250 &&
      graph.points.every(
        (point) =>
          Number.isFinite(point?.x) && Number.isFinite(point?.y)
      );

    const validStatus = ["readable", "unreadable"].includes(graph.status);

    if (!validPoints || !validStatus) {
      return Response.json(
        { error: "Graph analysis returned an unexpected response." },
        { status: 502 }
      );
    }

    if (graph.status === "readable" && graph.points.length < 2) {
      graph.status = "unreadable";
      graph.points = [];
      graph.notes ||= "Not enough points could be estimated to draw the curve.";
    }

    graph.points.sort((a, b) => a.x - b.x);

    return Response.json(graph);
  } catch {
    return Response.json(
      { error: "Could not read that graph image. Try a clearer image." },
      { status: 502 }
    );
  }
}