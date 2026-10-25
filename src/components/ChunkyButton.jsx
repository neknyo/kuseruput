import { u } from "../lib/frame";

const TONES = {
  lime: "bg-[#d5f554] drop-shadow-[3px_4px_0_#502119]",
  orange: "bg-[#f39835] drop-shadow-[3px_4px_0_rgba(0,0,0,0.25)]",
};

// Chunky pill button used across sections. Renders a <button> by default; pass `as="a"` for links.
export default function ChunkyButton({ as: Tag = "button", tone = "lime", w, h = 49, fontSize = 15, children, ...props }) {
  return (
    <Tag
      {...(Tag === "button" && { type: "button" })}
      style={{ width: u(w), height: u(h) }}
      className={`flex items-center justify-center rounded-[11px] shadow-[inset_0_4px_0_0_rgba(255,116,199,0.46),inset_0_0_10.7px_0_#fef9e4] transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 ${TONES[tone]}`}
      {...props}
    >
      <span
        style={{ fontSize: u(fontSize) }}
        className="flex items-center gap-2 bg-gradient-to-r from-[#502119] via-[46.69%] via-[#d32b2b] to-black bg-clip-text text-transparent"
      >
        {children}
      </span>
    </Tag>
  );
}
