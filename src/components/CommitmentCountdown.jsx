import ChunkyButton from "./ChunkyButton";
import stickerSheet from "../assets/figma/something-is-coming-56.png";
import countdownRing from "../assets/figma/countdown-ring.svg";
import hubOrange from "../assets/figma/countdown-ellipse-11.svg";
import hubRed from "../assets/figma/countdown-ellipse-12.svg";
import { FRAME_W, u } from "../lib/frame";

const SIAP_H = 888;

// Days left in the 7-day challenge. The needle sweeps from 9 o'clock (1) over the top to 3 o'clock (7).
const DAYS_LEFT = 7;
const needleAngle = (DAYS_LEFT - 1) * 30;

// Tea bag cropped from the sticker sheet
const teaBagStyle = {
  backgroundImage: `url(${stickerSheet})`,
  backgroundSize: "341% 455%",
  backgroundPosition: "12.3% 58.1%",
  backgroundRepeat: "no-repeat",
};

const hl = "box-decoration-clone px-1 text-[#502119]";
const body = { fontSize: u(13), lineHeight: u(15.5) };

export default function CommitmentCountdown() {
  return (
    <section
      id="siap-ikutan"
      style={{ aspectRatio: `${FRAME_W} / ${SIAP_H}`, paddingTop: u(82) }}
      className="flex w-full flex-col items-center text-[#502119]"
    >
      <h2 className="sr-only">Siap ikutan #SemingguTanpaTehCelup?</h2>

      {/* paragraph 1 sits in the right-hand gap of the wallpaper */}
      <p style={{ ...body, width: u(222), marginLeft: u(140) }} className="self-start text-justify">
        Gerakan <mark className={`${hl} bg-[#d5f554]`}>#SemingguTanpaTehCelup</mark> adalah tantangan komitmen 7 hari
        buat ngajak kamu beralih dari kantong teh celup sintetis ke teh tubruk atau reusable tea infuser.
      </p>

      <p style={{ ...body, width: u(202), marginLeft: u(47), marginTop: u(27) }} className="self-start text-justify">
        Satu minggu tanpa kantong plastik sekali pakai berarti ratusan ribu partikel mikroplastik yang batal masuk ke
        tubuhmu. <mark className={`${hl} bg-[#ff74c7]`}>Dimulai dari cangkir pertamamu hari ini!</mark>
      </p>

      {/* dial: every layer shares one grid cell, so nothing is absolutely positioned */}
      <div
        role="img"
        aria-label={`${DAYS_LEFT} hari tersisa`}
        style={{ width: u(254), height: u(254), marginTop: u(40) }}
        className="grid grid-cols-1 grid-rows-1 place-items-center rounded-full border-[length:calc(var(--u)*8)] border-[#682622] bg-[#532319] drop-shadow-[2px_5px_0_rgba(80,33,25,0.45)]"
      >
        <img
          src={countdownRing}
          alt=""
          style={{ width: u(224), marginTop: u(4) }}
          className="col-start-1 row-start-1 self-start"
        />

        {/* needle: a bar twice its length, rotated around the cell centre (= hub) */}
        <div
          style={{ width: u(200), transform: `rotate(${needleAngle}deg)` }}
          className="col-start-1 row-start-1 flex justify-start transition-transform duration-700"
        >
          <span style={{ width: u(100), height: u(5) }} className="rounded-full bg-[#d32b2b]" />
        </div>

        <div className="col-start-1 row-start-1 grid place-items-center">
          <img src={hubOrange} alt="" style={{ width: u(48) }} className="col-start-1 row-start-1" />
          <img src={hubRed} alt="" style={{ width: u(24) }} className="col-start-1 row-start-1" />
        </div>

        <div className="col-start-1 row-start-1 flex flex-col items-center self-end text-white" style={{ marginBottom: u(24) }}>
          <span style={{ fontSize: u(32), lineHeight: 1 }} className="font-bold">
            {DAYS_LEFT}
          </span>
          <span style={{ fontSize: u(15) }}>Hari</span>
        </div>

        <div
          aria-hidden
          style={{ width: u(141), height: u(141), transform: `translate(${u(100)}, ${u(76)}) rotate(152deg)` }}
          className="pointer-events-none col-start-1 row-start-1"
        >
          <div className="size-full" style={teaBagStyle} />
        </div>
      </div>

      <div style={{ marginTop: u(42) }}>
        <ChunkyButton w={174}>AKU SIAP IKUTAN!</ChunkyButton>
      </div>

      <p style={{ ...body, width: u(345), marginTop: u(18) }} className="text-center">
        Yuk, ambil komitmenmu sekarang! Klik tombol diatas buat buktikan kamu siap lepas dari teh celup sintetis,
        dapet kartu progres kustom milikmu, dan tag @ku.seruput di IG Story!
      </p>
    </section>
  );
}
