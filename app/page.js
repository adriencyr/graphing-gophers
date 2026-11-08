import GoogleSignIn from "../components/GoogleSignIn";

export default function Home() {
  return (
    <div
      className="relative min-h-screen bg-[#171923] text-white"
      style={{
        backgroundImage: "url('/graph-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center right",
      }}
    >
      {/* Gradient for readable text */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(15,17,25,0.78)_0%,rgba(15,17,25,0.40)_50%,rgba(15,17,25,0.10)_100%)]"
      />

      {/* Keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-black focus:outline-4 focus:outline-offset-4 focus:outline-[#F0C8DF]"
      >
        Skip to main content
      </a>

      {/* Welcome section */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-70px)] max-w-7xl items-center px-6 py-12 sm:px-10">
        {/* Compact, subtle content panel */}
        <section className="w-full max-w-md rounded-xl border border-white/15 bg-[#14181F]/55 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-sm sm:p-8">
          {/* Main heading */}
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-[34px]">
            Hear the Graph.
            <span className="mt-2 block text-[#F0C8DF]">
              Understand the Data.
            </span>
          </h1>

          {/* Short description */}
          <p className="mt-5 text-base leading-7 text-white">
            Explore STEM graphs through sound and voice.
          </p>

          {/* Navigation */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="min-h-12 rounded-lg border border-white bg-white px-5 py-3 text-sm font-semibold text-[#171923] transition-colors hover:bg-[#F3E7EE] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#F0C8DF]"
            >
              Continue as Guest
            </button>

            <div className="min-w-0 sm:flex-1">
              <GoogleSignIn />
            </div>
          </div>

          {/* Guest information */}
          <p className="mt-5 text-sm text-white/85">
            Guest work won&apos;t be saved.
          </p>
        </section>
      </div>
    </div>
  );
}
