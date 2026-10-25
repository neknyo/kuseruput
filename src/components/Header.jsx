import { useEffect, useState } from "react";
import stickerSheet from "../assets/figma/something-is-coming-56.png";
import logoVector from "../assets/figma/logo-vector.svg";

const NAV_LINKS = [
  { href: "#hero", label: "Beranda" },
  { href: "#siap-ikutan", label: "Siap Ikutan" },
  { href: "#solusi", label: "Solusinya" },
  { href: "#tolong", label: "Bantu Tili" },
  { href: "#tim", label: "Tim Kami" },
  { href: "#footer", label: "Kontak" },
];

// Green flower sticker, cropped out of the sticker sheet.
const flowerStyle = {
  backgroundImage: `url(${stickerSheet})`,
  backgroundSize: "429% 561%",
  backgroundPosition: "7.4% 97%",
  backgroundRepeat: "no-repeat",
};

const Bar = () => <span className="h-[6px] w-[32px] rounded-full bg-[#ff74c7]" />;

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* zero-height sticky rail: the pill overflows it, so the header takes no space in the page flow */}
      <div className="sticky top-0 z-30 h-0">
        <header className="px-5 pt-5">
          <div className="grid h-[58px] grid-cols-[auto_1fr_auto] items-center rounded-full bg-[#fef9e4] px-4 drop-shadow-[2px_4px_0_#f39835]">
            <a href="#hero" aria-label="Ku Seruput, ke atas" className="-ml-3 grid size-[56px] place-items-center">
              <span
                aria-hidden
                className="col-start-1 row-start-1 size-full rotate-[80deg]"
                style={flowerStyle}
              />
              <img src={logoVector} alt="" className="col-start-1 row-start-1 h-[26px] w-[17px]" />
            </a>
            <span />
            <button
              type="button"
              aria-label="Buka menu"
              aria-expanded={open}
              aria-controls="sidebar-nav"
              onClick={() => setOpen(true)}
              className="flex flex-col gap-[10px] transition-transform duration-200 hover:scale-110"
            >
              <Bar />
              <Bar />
              <Bar />
            </button>
          </div>
        </header>
      </div>

      {/* Sidebar overlay, clamped to the 430px column on desktop */}
      <div
        className={`fixed inset-y-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 overflow-hidden ${
          open ? "" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-[#2a0f0a]/60 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <nav
          id="sidebar-nav"
          className={`absolute inset-y-0 right-0 flex w-[75%] max-w-[300px] flex-col gap-2 bg-[#fef9e4] p-6 shadow-[-4px_0_0_#f39835] transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="mb-4 self-end text-3xl leading-none text-[#502119]"
          >
            &times;
          </button>
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="rounded-xl px-4 py-3 text-lg font-bold text-[#502119] transition-colors hover:bg-[#d5f554]"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
