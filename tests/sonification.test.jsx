import "@testing-library/jest-dom/vitest";
import {
  act, cleanup, fireEvent, render, screen, waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import GraphExplorer from "../components/GraphExplorer";
import EquationGraph from "../components/EquationGraph";
import Dashboard from "../app/dashboard/page";

const graph = {
  title: "Line",
  points: [{ x: 20, y: 10 }, { x: 0, y: -10 }, { x: 10, y: 0 }],
};
let context;
let oscillators;
let frequency;

beforeEach(() => {
  oscillators = [];
  frequency = vi.fn();
  context = {
    state: "running", currentTime: 0, destination: {},
    resume: vi.fn().mockResolvedValue(), close: vi.fn().mockResolvedValue(),
    createOscillator: vi.fn(() => {
      const oscillator = {
        frequency: { setValueAtTime: frequency },
        connect: vi.fn(), disconnect: vi.fn(),
        start: vi.fn(), stop: vi.fn(),
      };
      oscillators.push(oscillator);
      return oscillator;
    }),
    createGain: vi.fn(() => ({
      connect: vi.fn(), disconnect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    })),
  };
  vi.stubGlobal("AudioContext", vi.fn(function () { return context; }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("moves the focused plot cursor and changes pitch", async () => {
  const user = userEvent.setup();
  const { container } = render(<GraphExplorer graph={graph} />);
  expect(context.resume).not.toHaveBeenCalled();
  await user.click(screen.getByRole("img"));
  const controls = screen.getByRole("group", { name: "Graph sound controls" });
  expect(controls).toHaveFocus();
  const cursor = () => container.querySelector(
    'g[aria-label^="Selected point"] circle',
  );
  const originalX = cursor().getAttribute("cx");
  await user.keyboard("{ArrowRight}");
  await waitFor(() => expect(frequency).toHaveBeenLastCalledWith(253, 0));
  expect(cursor().getAttribute("cx")).not.toBe(originalX);
  expect(screen.getByText("Current point: x = 1, y = -9"))
    .toBeInTheDocument();
  await user.keyboard("{ArrowRight}");
  await waitFor(() => expect(frequency).toHaveBeenLastCalledWith(286, 0));
  await user.keyboard("{ArrowLeft}");
  await waitFor(() => expect(frequency).toHaveBeenLastCalledWith(253, 0));
  expect(oscillators[0].disconnect).toHaveBeenCalled();
});

it("clamps rapid keys and keeps pitch in range", async () => {
  render(<GraphExplorer graph={graph} />);
  const controls = screen.getByRole("group");
  act(() => {
    for (let i = 0; i < 30; i += 1) {
      fireEvent.keyDown(controls, { key: "ArrowRight" });
    }
  });
  await waitFor(() => expect(frequency).toHaveBeenLastCalledWith(880, 0));
  expect(screen.getByText("Current point: x = 20, y = 10"))
    .toBeInTheDocument();
  expect(context.createOscillator).toHaveBeenCalledTimes(1);
  act(() => {
    for (let i = 0; i < 30; i += 1) {
      fireEvent.keyDown(controls, { key: "ArrowLeft" });
    }
  });
  await waitFor(() => expect(frequency).toHaveBeenLastCalledWith(220, 0));
});

it("uses interpolation and a finer step on narrow domains", async () => {
  render(<GraphExplorer graph={{
    points: [{ x: 0, y: 0 }, { x: 0.1, y: 10 }],
  }} />);
  fireEvent.keyDown(screen.getByRole("group"), { key: "ArrowRight" });
  await waitFor(() => expect(frequency).toHaveBeenCalledWith(253, 0));
  expect(screen.getByText("Current point: x = 0.005, y = 0.5"))
    .toBeInTheDocument();
});

it("uses a middle pitch for a horizontal graph", async () => {
  render(<GraphExplorer graph={{
    points: [{ x: 0, y: 5 }, { x: 20, y: 5 }],
  }} />);
  fireEvent.click(screen.getByRole("button", { name: "Play current point" }));
  await waitFor(() => expect(frequency).toHaveBeenCalledWith(550, 0));
});

it("announces gaps without playing a tone", async () => {
  const points = [{ x: -2, y: -1 }, { x: -1, y: -2 },
    { x: 1, y: 2 }, { x: 2, y: 1 }];
  const { container } = render(<GraphExplorer graph={{
    points, segments: [points.slice(0, 2), points.slice(2)],
  }} />);
  fireEvent.click(screen.getByRole("button", { name: "Play current point" }));
  expect(screen.getByRole("status")).toHaveTextContent("undefined");
  expect(container.querySelector('g[aria-label^="Selected point"]'))
    .not.toBeInTheDocument();
  expect(context.createOscillator).not.toHaveBeenCalled();
});

it("handles unsupported audio and ambiguous x-values", async () => {
  vi.stubGlobal("AudioContext", undefined);
  const { rerender } = render(<GraphExplorer graph={graph} />);
  fireEvent.click(screen.getByRole("button", { name: "Play current point" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("not supported");
  rerender(<GraphExplorer graph={{
    points: [{ x: 0, y: 0 }, { x: 0, y: 1 }],
  }} />);
  expect(screen.getByText(/distinct x-coordinates/)).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("cancels audio when the graph changes", async () => {
  let resume;
  context.resume.mockImplementation(() => new Promise((resolve) => {
    resume = resolve;
  }));
  const { rerender } = render(<GraphExplorer graph={graph} />);
  fireEvent.keyDown(screen.getByRole("group"), { key: "ArrowRight" });
  rerender(<GraphExplorer graph={{
    points: [{ x: 5, y: 2 }, { x: 10, y: 3 }],
  }} />);
  await act(async () => resume());
  expect(context.close).toHaveBeenCalledTimes(1);
  expect(context.createOscillator).not.toHaveBeenCalled();
  expect(screen.getByText("Current point: x = 5, y = 2"))
    .toBeInTheDocument();
});

it("reports coordinates and closes audio on unmount", async () => {
  const onPositionChange = vi.fn();
  const { unmount } = render(<GraphExplorer graph={graph}
    onPositionChange={onPositionChange} />);
  expect(onPositionChange).toHaveBeenLastCalledWith(0);
  fireEvent.keyDown(screen.getByRole("group"), { key: "ArrowRight" });
  await waitFor(() => expect(frequency).toHaveBeenCalled());
  expect(onPositionChange).toHaveBeenLastCalledWith(1);
  unmount();
  expect(context.close).toHaveBeenCalledTimes(1);
  expect(oscillators[0].disconnect).toHaveBeenCalled();
});

it("connects equation audio and preserves typing", async () => {
  const user = userEvent.setup();
  render(<EquationGraph />);
  await user.type(screen.getByLabelText("Mathematical equation"), "x");
  await user.click(screen.getByRole("button", { name: "Create Graph" }));
  await user.click(screen.getByRole("img"));
  await user.keyboard("{ArrowRight}");
  await waitFor(() => expect(frequency).toHaveBeenCalledWith(583, 0));
  expect(screen.getByText("Current point: x = 1, y = 1"))
    .toBeInTheDocument();
  const calls = frequency.mock.calls.length;
  await user.click(screen.getByLabelText("Mathematical equation"));
  await user.keyboard("{ArrowLeft}");
  expect(frequency).toHaveBeenCalledTimes(calls);
});

it("connects the dashboard saved graph viewer to keyboard sound", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
    graphs: [{ id: "line", title: "Saved line", graph_data: graph }],
  })));
  const user = userEvent.setup();
  render(<Dashboard />);
  await user.click(await screen.findByRole("button", { name: "Show History" }));
  await user.click(await screen.findByRole("button", { name: "Saved line" }));
  await user.click(screen.getByRole("img"));
  await user.keyboard("{ArrowRight}");
  await waitFor(() => expect(frequency).toHaveBeenCalledWith(253, 0));
  expect(screen.getByText("Current point: x = 1, y = -9"))
    .toBeInTheDocument();
});
