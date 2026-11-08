import GoogleSignIn from "../components/GoogleSignIn";

export default function Home() {
  return (
    <div
      className="relative min-h-[calc(100svh-70px)] bg-[#171923] text-white"
      style={{
        backgroundImage: "url('/graph-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center right",
      }}
    >
      {/* Gradient for readable text */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(15,17,25,0.78) 0%, " +
            "rgba(15,17,25,0.40) 50%, rgba(15,17,25,0.10) 100%)",
        }}
      />

      <div
        className="relative z-10 mx-auto flex min-h-[calc(100vh-70px)]
          max-w-7xl items-center px-6 py-12 sm:px-10"
      >
        <section
          aria-labelledby="welcome-heading"
          className="w-full max-w-md rounded-xl border border-white/15
            bg-[#14181F]/55 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.18)]
            backdrop-blur-sm sm:p-8"
        >
          <h1
            id="welcome-heading"
            className="text-3xl font-semibold leading-tight tracking-tight
              sm:text-[34px]"
          >
            Hear the Graph.
            <span className="mt-2 block text-[#F0C8DF]">
              Understand the Data.
            </span>
          </h1>

          <p className="mt-5 text-base leading-7 text-white">
            Explore STEM graphs through sound and voice.
          </p>

          <div className="mt-7 grid grid-cols-2 items-start gap-2 sm:gap-3">
            <button
              type="button"
              className="min-h-12 rounded-lg border border-white bg-white
                px-2 py-2 text-xs font-semibold text-[#171923] sm:text-sm
                transition-colors hover:bg-[#F3E7EE] focus-visible:outline-4
                focus-visible:outline-offset-4 focus-visible:outline-[#F0C8DF]"
            >
              Continue as Guest
            </button>

            <GoogleSignIn />
          </div>

          <p className="mt-5 text-sm text-white/85">
            Guest work won&apos;t be saved.
          </p>
        </section>
      </div>
    </div>
  );
}
