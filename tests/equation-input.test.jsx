import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import Dashboard from "../app/dashboard/page";
import EquationGraph from "../components/EquationGraph";
import GraphPlot from "../components/GraphPlot";

afterEach(cleanup);

it("plots the dashboard input when submitted using Enter", async () => {
  const user = userEvent.setup();
  render(<Dashboard />);
  await user.type(screen.getByLabelText("Mathematical equation"),
    "y = x^2 + 3{Enter}");
  expect(screen.getByRole("img", {
    name: "y = x^2 + 3 with 201 plotted points",
  })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("-10 ≤ x ≤ 10");
});

it("updates the requested range and replaces the previous plot", async () => {
  const user = userEvent.setup();
  render(<EquationGraph />);
  const input = screen.getByLabelText("Mathematical equation");
  await user.type(input, "x^2");
  await user.click(screen.getByRole("button", { name: "Create Graph" }));
  fireEvent.change(input, { target: { value: "sin(x)" } });
  fireEvent.change(screen.getByLabelText("Minimum x"), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByLabelText("Maximum x"), {
    target: { value: "6.28" },
  });
  await user.click(screen.getByRole("button", { name: "Create Graph" }));
  expect(screen.getByRole("img")).toHaveAccessibleName(
    "y = sin(x) with 201 plotted points",
  );
  expect(screen.getByRole("status")).toHaveTextContent("0 ≤ x ≤ 6.28");
});

it("announces errors and allows correction without stale plots", async () => {
  const user = userEvent.setup();
  render(<EquationGraph />);
  const input = screen.getByLabelText("Mathematical equation");
  await user.type(input, "x");
  await user.click(screen.getByRole("button", { name: "Create Graph" }));
  fireEvent.change(input, { target: { value: "x +" } });
  await user.click(screen.getByRole("button", { name: "Create Graph" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Check the equation");
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription(/Check the equation/);
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: "2x" } });
  await user.click(screen.getByRole("button", { name: "Create Graph" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("img")).toBeInTheDocument();
});

it("shows range errors without plotting", async () => {
  const user = userEvent.setup();
  render(<EquationGraph />);
  await user.type(screen.getByLabelText("Mathematical equation"), "x");
  fireEvent.change(screen.getByLabelText("Minimum x"), {
    target: { value: "20" },
  });
  await user.click(screen.getByRole("button", { name: "Create Graph" }));
  expect(screen.getByRole("alert")).toHaveTextContent("increasing x-range");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

it("draws distinct branches without a line across the gap", async () => {
  const user = userEvent.setup();
  const { container } = render(<EquationGraph />);
  await user.type(screen.getByLabelText("Mathematical equation"), "1/x");
  await user.click(screen.getByRole("button", { name: "Create Graph" }));
  expect(container.querySelectorAll("polyline")).toHaveLength(2);
  expect(container.querySelectorAll("circle")).toHaveLength(0);
  expect(screen.getByRole("status")).toHaveTextContent("leave gaps");
});

it("preserves image graph lines and markers by default", () => {
  const { container } = render(<GraphPlot graph={{
    points: [{ x: 0, y: 0 }, { x: 1, y: 2 }],
  }} />);
  expect(container.querySelectorAll("polyline")).toHaveLength(1);
  expect(container.querySelectorAll("circle")).toHaveLength(2);
});
