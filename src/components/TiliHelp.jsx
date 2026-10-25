import { Link } from "react-router-dom";
import ChunkyButton from "./ChunkyButton";
import tili from "../assets/figma/group-16-1.png";
import gamepadIcon from "../assets/figma/arrow-icon.svg";
import { FRAME_W, u } from "../lib/frame";

const TOLONG_H = 770;

export default function TiliHelp() {
  return (
    <section
      id="tolong"
      style={{ aspectRatio: `${FRAME_W} / ${TOLONG_H}`, paddingTop: u(249) }}
      className="flex w-full flex-col items-center text-[#502119]"
    >
      {/* the pink/lime title stickers and the crumpled-paper frame are baked into the wallpaper */}
      <h2 className="sr-only">Tolong!!!! Tili membutuhkan bantuanmu!!</h2>

      <img
        src={tili}
        alt="Tili, si daun teh yang sedih"
        style={{ width: u(174) }}
        className="block h-auto select-none"
        draggable={false}
      />

      <p style={{ width: u(300), marginTop: u(64), fontSize: u(13), lineHeight: u(16) }} className="text-center">
        Tili si daun teh terjebak di dasar cangkir yang penuh serbuan mikroplastik! Yuk, bantu Tili memanjat setinggi
        mungkin sebelum terkejar partikel plastik jahat!
        <br />
        <br />
        Mainkan game <mark className="bg-[#ff74c7] px-1 font-bold text-[#502119]">Bebas Celup</mark> dan selamatkan
        tili dari mikroplastik yang ada di dalam seduhan teh celup
      </p>

      <div style={{ marginTop: u(31) }}>
        <ChunkyButton as={Link} to="/bebascelup" w={166} fontSize={16}>
          Bantu Tili!!
          <img src={gamepadIcon} alt="" style={{ width: u(22) }} />
        </ChunkyButton>
      </div>
    </section>
  );
}
