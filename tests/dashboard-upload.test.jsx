import "@testing-library/jest-dom/vitest";
import {
  act, cleanup, fireEvent, render, screen, waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Dashboard from "../app/dashboard/page";

const readableGraph = {
  status: "readable",
  title: "Rising curve",
  xLabel: "Time",
  yLabel: "Distance",
  confidence: "high",
  notes: "Coordinates are estimated from the image.",
  points: [{ x: 2, y: 4 }, { x: 0, y: 0 }, { x: 1, y: 1 }],
};
let urlNumber = 0;
let revoke;

beforeEach(() => {
  const BrowserURL = URL;
  revoke = vi.fn();
  vi.stubGlobal("URL", class extends BrowserURL {
    static createObjectURL = vi.fn(() => `blob:graph-${++urlNumber}`);
    static revokeObjectURL = revoke;
  });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function chooseImage(user, name = "graph.png") {
  const image = new File(["image data"], name, { type: "image/png" });
  await user.upload(screen.getByLabelText("Select a graph image"), image);
  await user.click(screen.getByRole("button", {
    name: "Close graph preview",
  }));
  return image;
}

it("connects the dashboard file to plotting and sound", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json(readableGraph));
  vi.stubGlobal("fetch", fetchMock);
  const frequency = vi.fn();
  const start = vi.fn();
  const close = vi.fn().mockResolvedValue();
  const context = {
    state: "running", currentTime: 0, destination: {},
    resume: vi.fn().mockResolvedValue(), close,
    createOscillator: () => ({
      frequency: { setValueAtTime: frequency },
      connect: vi.fn(), start, stop: vi.fn(),
    }),
    createGain: () => ({
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    }),
  };
  vi.stubGlobal("AudioContext", vi.fn(function () { return context; }));
  const user = userEvent.setup();
  const view = render(<Dashboard />);
  const file = await chooseImage(user);
  await user.click(screen.getByRole("button", { name: "Read graph" }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/extract-graph");
  expect(request.method).toBe("POST");
  expect(request.body.get("image")).toBe(file);
  expect(await screen.findByRole("img", {
    name: "Rising curve with 3 plotted points",
  })).toBeInTheDocument();
  expect(screen.getByText(/Coordinate confidence: high/)).toBeInTheDocument();
  const controls = screen.getByRole("group", { name: "Graph sound controls" });
  controls.focus();
  fireEvent.keyDown(controls, { key: "ArrowRight" });
  await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
  // Sorted/interpolated y=1 maps into [220, 880] at one-quarter of the range.
  expect(frequency).toHaveBeenCalledWith(385, 0);
  expect(screen.getByText("Current point: x = 1, y = 1")).toBeInTheDocument();
  view.unmount();
  expect(close).toHaveBeenCalledTimes(1);
  expect(revoke).toHaveBeenCalled();
});

it("blocks repeat reads and discards replaced results", async () => {
  let finish;
  const fetchMock = vi.fn(() => new Promise((resolve) => {
    finish = resolve;
  }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<Dashboard />);
  await chooseImage(user);
  const button = screen.getByRole("button", { name: "Read graph" });
  act(() => { button.click(); button.click(); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Analyzing");
  const signal = fetchMock.mock.calls[0][1].signal;
  await chooseImage(user, "another.png");
  expect(signal.aborted).toBe(true);
  await act(async () => finish(Response.json(readableGraph)));
  expect(screen.queryByRole("img", {
    name: "Rising curve with 3 plotted points",
  })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Read graph" })).toBeEnabled();
});

it.each([
  [{ status: "unreadable", notes: "The axes are too blurry." }, /too blurry/],
  [{ ...readableGraph, confidence: "low" }, /estimated from the image/],
])("handles unreadable images", async (data, message) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(data)));
  const user = userEvent.setup();
  render(<Dashboard />);
  await chooseImage(user);
  await user.click(screen.getByRole("button", { name: "Read graph" }));
  expect(await screen.findByRole("status")).toHaveTextContent(message);
  expect(screen.queryByRole("group", {
    name: "Graph sound controls",
  })).not.toBeInTheDocument();
});

it.each([
  [Response.json({ error: "Graph reading is not configured on the server." },
    { status: 500 }), /not configured/],
  [Response.json({ ...readableGraph, points: [{ x: "bad", y: 1 }] }),
    /did not return valid graph data/],
])("allows retry on errors", async (response, message) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  const user = userEvent.setup();
  render(<Dashboard />);
  await chooseImage(user);
  await user.click(screen.getByRole("button", { name: "Read graph" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(screen.getByRole("button", { name: "Read graph" })).toBeEnabled();
});

it("plots repeated-x data without sound", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
    ...readableGraph, points: [{ x: 0, y: 0 }, { x: 0, y: 2 }],
  })));
  const user = userEvent.setup();
  render(<Dashboard />);
  await chooseImage(user);
  await user.click(screen.getByRole("button", { name: "Read graph" }));
  expect(await screen.findByRole("img", {
    name: "Rising curve with 2 plotted points",
  })).toBeInTheDocument();
  expect(
    screen.getByText(/contains repeated x-coordinates/),
  ).toBeInTheDocument();
  expect(screen.queryByRole("group", {
    name: "Graph sound controls",
  })).not.toBeInTheDocument();
});

it.each([0, 5 * 1024 * 1024 + 1])("rejects image size %i", async (size) => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(<Dashboard />);
  const file = new File(["data"], "graph.png", { type: "image/png" });
  Object.defineProperty(file, "size", { value: size });
  fireEvent.change(screen.getByLabelText("Select a graph image"), {
    target: { files: [file] },
  });
  expect(screen.getByRole("alert")).toHaveTextContent("up to 5 MB");
  expect(screen.queryByRole("button", { name: "Read graph" })).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
