import { connection } from "next/server";
import { auth0 } from "@/lib/auth0";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // This endpoint depends on the incoming user request.
  await connection();

  try {
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("graphs")
      .select("id, title, graph_data, created_at")
      .eq("user_id", session.user.sub)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Graph retrieval failed:", error);

      return Response.json(
        { error: "Failed to retrieve graphs" },
        { status: 500 }
      );
    }

    return Response.json({ graphs: data });
  } catch (error) {
    console.error("Graph retrieval error:", error);

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
