-- Create table for saved graph data.
CREATE TABLE public.graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    graph_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimize retrieval of a user's saved graphs.
CREATE INDEX idx_graphs_user_id
ON public.graphs (user_id);

-- Enable row-level security.
ALTER TABLE public.graphs ENABLE ROW LEVEL SECURITY;

-- Allow privileged server-side database operations.
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.graphs TO service_role;