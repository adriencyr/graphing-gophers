
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Keep the existing fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Website information
export const metadata = {
  title: "Graphing Gophers | Accessible STEM Learning",
  description:
    "Explore STEM graphs through sound and voice interaction.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen bg-[#171923] font-sans text-white antialiased">

        {/* Skip link for keyboard navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-5 focus:py-3 focus:font-bold focus:text-black focus:outline-4 focus:outline-offset-4 focus:outline-[#F0C8DF]"
        >
          Skip to main content
        </a>

        <div className="flex min-h-screen flex-col">

          {/* Shared header */}
          <header
            className="relative z-20 shrink-0 border-b border-white/20
              bg-[#171923] text-white"
          >
            <div className="mx-auto flex max-w-7xl items-center px-6 py-5 sm:px-10">
              <Link
                href="/"
                className="text-xl font-bold tracking-tight"
                aria-label="Graphing Gophers, homepage"
              >
                Graphing Gophers
                <span className="text-[#F0C8DF]">.</span>
              </Link>
            </div>
          </header>

          {/* Content of each page */}
          <main
            id="main-content"
            tabIndex={-1}
            className="relative isolate min-w-0 flex-1"
          >
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}

