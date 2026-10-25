import ChunkyButton from "./ChunkyButton";
import instagramIcon from "../assets/figma/icon-social-vectorized.svg";
import { FRAME_W, u } from "../lib/frame";

const HERO_H = 555;

export default function Hero() {
  return (
    <section
      id="hero"
      style={{ aspectRatio: `${FRAME_W} / ${HERO_H}`, paddingTop: u(368) }}
      className="flex w-full flex-col items-center"
    >
      {/* the logo artwork is baked into the wallpaper */}
      <h1 className="sr-only">Ku Seruput</h1>

      <p
        style={{ width: u(350), fontSize: u(12.5), lineHeight: u(15.5) }}
        className="text-center text-[#fef9e4]"
      >
        Hai! kami, <mark className="bg-[#d5f554] px-1 font-bold text-[#502119]">KU SERUPUT!</mark>{" "} <br/>
        <mark className="bg-[#ff74c7] px-1 font-bold text-[#502119]">KU SERUPUT</mark> adalah merupakan inisiatif
        gerakan edukasi dari Tim 'Dikebut Dua Hari' (FSRD ITB), Finalis LIDM 2026 Divisi Poster Digital Pendidikan.
      </p>

      <div style={{ marginTop: u(37) }}>
        <ChunkyButton
          as="a"
          tone="orange"
          w={190}
          fontSize={13}
          href="https://www.instagram.com/ku.seruput/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ikuti Perjalanan Kami!
          <img src={instagramIcon} alt="" style={{ width: u(22), height: u(22) }} />
        </ChunkyButton>
      </div>
    </section>
  );
}
