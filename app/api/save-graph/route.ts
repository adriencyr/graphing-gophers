import { auth0 } from "@/lib/auth0";
import { supabase } from "@/lib/supabase";

type GraphData = {
  title: string;
  xLabel: string;
  yLabel: string;
  points: { x: number; y: number }[];
};

function isValidGraph(graph: unknown): graph is GraphData {
  if (!graph || typeof graph !== "object") return false;

  const g = graph as Partial<GraphData>;

  return (
    typeof g.title === "string" &&
    typeof g.xLabel === "string" &&
    typeof g.yLabel === "string" &&
    Array.isArray(g.points) &&
    g.points.length >= 2 &&
    g.points.length <= 250 &&
    g.points.every(
      (point) =>
        point !== null &&
        typeof point === "object" &&
        typeof point.x === "number" &&
        Number.isFinite(point.x) &&
        typeof point.y === "number" &&
        Number.isFinite(point.y)
    )
  );
}

export async function POST(request: Request) {
  try {
    // Require authentication for saving graphs.
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return Response.json(
        { error: "You must be signed in to save graphs." },
        { status: 401 }
      );
    }

    let graph: unknown;
    try {
      graph = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (!isValidGraph(graph)) {
      return Response.json(
        { error: "Invalid graph data." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("graphs")
      .insert({
        user_id: session.user.sub,
        title: graph.title,
        graph_data: graph,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Failed to save graph:", error);

      return Response.json(
        { error: "Failed to save graph." },
        { status: 500 }
      );
    }

    return Response.json(
      { success: true, graphId: data.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Graph save request failed:", error);

    return Response.json(
      { error: "Unable to process graph save request." },
      { status: 500 }
    );
  }
}
