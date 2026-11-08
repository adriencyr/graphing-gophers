import { auth0 } from "@/lib/auth0";
import { supabase } from "@/lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from("graphs")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.sub)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Graph deletion failed:", error);

      return Response.json(
        { error: "Failed to delete graph" },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { error: "Graph not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Graph deletion error:", error);

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
