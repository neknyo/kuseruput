import Header from "./components/Header";
import Hero from "./components/Hero";
import CommitmentCountdown from "./components/CommitmentCountdown";
import Solusi from "./components/Solusi";
import TiliHelp from "./components/TiliHelp";
import { FRAME_W } from "./lib/frame";

const BG_SLICES = [1, 2, 3, 4].map((n) => `/bg/bg-${n}.webp`);

// Frame is 430 x 4432. Each section's aspect-ratio uses its slice of that height,
// so foreground blocks stay lined up with the wallpaper when the width shrinks.
const SECTIONS = [
  { id: "tim", h: 1200 },
  { id: "footer", h: 132 },
];

export default function App() {
  return (
    <div
      style={{ "--u": "calc(min(100vw, 430px) / 430)" }}
      className="relative isolate mx-auto w-full max-w-[430px] overflow-x-clip"
    >
      {/* wallpaper: decorative, behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 flex flex-col">
        {BG_SLICES.map((src) => (
          <img key={src} src={src} alt="" className="block w-full flex-1 object-fill" draggable={false} />
        ))}
      </div>

      <Header />

      <main className="flex flex-col">
        <Hero />
        <CommitmentCountdown />
        <Solusi />
        <TiliHelp />
        {SECTIONS.map(({ id, h }) => (
          <section
            key={id}
            id={id}
            style={{ aspectRatio: `${FRAME_W} / ${h}` }}
            className="flex w-full scroll-mt-0 flex-col items-center"
          />
        ))}
      </main>
    </div>
  );
}
