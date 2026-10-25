import ProductViewer3D from "./ProductViewer3D";
import { FRAME_W, u } from "../lib/frame";

const SOLUSI_H = 887;

export default function Solusi() {
  return (
    <section
      id="solusi"
      style={{ aspectRatio: `${FRAME_W} / ${SOLUSI_H}`, paddingTop: u(207) }}
      className="flex w-full flex-col items-center"
    >
      <h2 className="sr-only">Solusinya?!</h2>

      <p style={{ width: u(250), fontSize: u(13), lineHeight: u(16.5) }} className="text-center text-white">
        ini dia jawaban praktisnya! <strong>Se-Teh!</strong> Portable Tea Infuser dari Ku SERUPUT
        <br />
        <br />
        dirancang khusus biar kamu tetap bisa nikmatin racikan teh tubruk murni di mana aja tanpa ribet.
      </p>

      <div
        style={{ width: u(282), height: u(435), marginTop: u(43), padding: u(10), borderRadius: u(26) }}
        className="bg-[#f5b878] shadow-[0_6px_0_rgba(80,33,25,0.15)]"
      >
        <ProductViewer3D className="size-full overflow-hidden bg-white [border-radius:calc(var(--u)*16)]" />
      </div>

      <p
        style={{ width: u(290), marginTop: u(21), fontSize: u(13), lineHeight: u(16.5) }}
        className="text-center text-[#502119]"
      >
        Putar model 3D di atas ini dengan jarimu untuk melihat detail desainnya dari segala sisi, atau klik tombol AR
        buat "menaruh" tumbler ini langsung di atas mejamu!
      </p>
    </section>
  );
}
