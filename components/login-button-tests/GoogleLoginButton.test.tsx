import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GoogleLoginButton from "../GoogleLoginButton";
import Home from "../../app/page";

describe("GoogleLoginButton", () => {
  it("invokes the callback without submitting a form", async () => {
    const login = vi.fn();
    const submit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <GoogleLoginButton onGoogleLogin={login} />
      </form>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Sign in with Google" }),
    );
    expect(login).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("blocks repeat clicks while loading and resets", async () => {
    let finish!: () => void;
    const login = vi.fn(
      () => new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    render(<GoogleLoginButton onGoogleLogin={login} />);
    const button = screen.getByRole("button");
    // Dispatch twice in one batch to exercise the guard before rerendering.
    act(() => {
      button.click();
      button.click();
    });
    expect(login).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent("Signing in…");
    expect(screen.getByRole("status")).toHaveTextContent("Please wait");
    await act(async () => finish());
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not invoke a disabled callback", async () => {
    const login = vi.fn();
    render(<GoogleLoginButton onGoogleLogin={login} disabled />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toBeDisabled();
    expect(login).not.toHaveBeenCalled();
  });

  it.each(["sync", "async"])("handles %s failures safely", async (mode) => {
    const login = vi.fn(() => {
      if (mode === "sync") throw new Error("secret provider detail");
      return Promise.reject("secret provider detail");
    });
    render(<GoogleLoginButton onGoogleLogin={login} />);
    await userEvent.click(screen.getByRole("button"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Unable to sign in with Google. Please try again.",
    );
    expect(screen.getByRole("button")).toHaveAccessibleDescription(
      alert.textContent!,
    );
    expect(screen.getByRole("button")).toBeEnabled();
    expect(
      screen.queryByText("secret provider detail"),
    ).not.toBeInTheDocument();
  });

  it("clears a custom error on retry and succeeds", async () => {
    let finish!: () => void;
    const login = vi.fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("failure"))
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => {
          finish = resolve;
        }),
      );
    render(
      <GoogleLoginButton
        onGoogleLogin={login}
        errorMessage="Please retry sign-in."
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please retry sign-in.",
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => finish());
    expect(login).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it.each(["{Enter}", " "])("activates with %s", async (key) => {
    const login = vi.fn();
    const user = userEvent.setup();
    render(<GoogleLoginButton onGoogleLogin={login} />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard(key);
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
  });
});

it("redirects to Google and permits retry after Back restores the page", () => {
  const location = { href: "http://localhost:3000/" };
  const browserWindow = window;
  vi.stubGlobal("window", new Proxy(browserWindow, {
    get(target, property) {
      return property === "location"
        ? location
        : Reflect.get(target, property);
    },
  }));

  try {
    render(<Home />);
    expect(screen.getByRole("link", {
      name: "Skip to main content",
    })).toHaveAttribute("href", "#main-content");
    expect(
      screen.getByRole("heading", { level: 1 }),
    ).toBeInTheDocument();
    const button = screen.getByRole("button", {
      name: "Sign in with Google",
    });
    expect(screen.getByRole("button", {
      name: "Continue as Guest",
    })).toBeInTheDocument();
    fireEvent.click(button);
    expect(location.href).toBe("/api/auth/login?connection=google-oauth2");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // A normal pageshow must not unlock an active redirect.
    fireEvent(window, new PageTransitionEvent("pageshow"));
    expect(button).toBeDisabled();

    fireEvent(window, new PageTransitionEvent("pageshow", {
      persisted: true,
    }));
    const restoredButton = screen.getByRole("button", {
      name: "Sign in with Google",
    });
    expect(restoredButton).toBeEnabled();
    expect(restoredButton).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    // Verify the restored button starts another redirect and locks again.
    location.href = "http://localhost:3000/";
    fireEvent.click(restoredButton);
    expect(location.href).toBe("/api/auth/login?connection=google-oauth2");
    expect(restoredButton).toBeDisabled();
  } finally {
    vi.unstubAllGlobals();
  }
});
