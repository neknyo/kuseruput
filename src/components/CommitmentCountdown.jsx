import { useEffect, useRef, useState } from "react";
import ChunkyButton from "./ChunkyButton";
import stickerSheet from "../assets/figma/something-is-coming-56.png";
import countdownRing from "../assets/figma/countdown-ring.svg";
import hubOrange from "../assets/figma/countdown-ellipse-11.svg";
import hubRed from "../assets/figma/countdown-ellipse-12.svg";
import { FRAME_W, u } from "../lib/frame";

const SIAP_H = 888;
const DAYS_LEFT = 7;
const DEG_PER_DAY = 30;
const SWEEP_MS = 3500;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useGauge() {
  const dialRef = useRef(null);
  const needleRef = useRef(null);
  const [day, setDay] = useState(() => (prefersReducedMotion() ? DAYS_LEFT : 1));

  useEffect(() => {
    const dial = dialRef.current;
    const needle = needleRef.current;
    const setNeedle = (value) => {
      needle.style.transform = `rotate(${(value - 1) * DEG_PER_DAY}deg)`;
    };

    if (prefersReducedMotion()) {
      setNeedle(DAYS_LEFT);
      return;
    }
    setNeedle(1);

    let raf;
    const play = () => {
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min((now - t0) / SWEEP_MS, 1);
        const value = 1 + (DAYS_LEFT - 1) * easeInOut(t);
        setNeedle(value);
        setDay(Math.round(value));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        play();
      },
      { threshold: 0.6 },
    );
    io.observe(dial);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return { dialRef, needleRef, day };
}

// Token-efficient, pure CSS confetti explosion
function Confetti() {
  const [active, setActive] = useState(false);

  // Calculate trajectory and size randomly just once on mount
  const dots = useRef(
    Array.from({ length: 80 }).map(() => ({
      color: Math.random() > 0.5 ? "#d5f554" : "#ff74c7",
      size: u(4 + Math.random() * 8), // Varies between 4 and 12
      tx: u((Math.random() - 0.5) * 350),
      ty: u((Math.random() - 0.5) * 350 - 60), // Slight upward bias
    }))
  ).current;

  useEffect(() => {
    // Delay slightly to ensure DOM mounts before triggering the CSS transition
    const timer = setTimeout(() => setActive(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (prefersReducedMotion()) return null;

  return (
    <div className="col-start-1 row-start-1 size-full pointer-events-none flex items-center justify-center z-20">
      {dots.map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full transition-all duration-5000 ease-out"
          style={{
            width: dot.size,
            height: dot.size,
            backgroundColor: dot.color,
            transform: active ? `translate(${dot.tx}, ${dot.ty}) scale(0)` : "translate(0px, 0px) scale(1)",
            opacity: active ? 0 : 1,
          }}
        />
      ))}
    </div>
  );
}

const teaBagStyle = {
  backgroundImage: `url(${stickerSheet})`,
  backgroundSize: "341% 455%",
  backgroundPosition: "12.3% 58.1%",
  backgroundRepeat: "no-repeat",
};

const hl = "box-decoration-clone px-1 text-[#502119]";
const body = { fontSize: u(13), lineHeight: u(15.5) };

export default function CommitmentCountdown() {
  const { dialRef, needleRef, day } = useGauge();

  return (
    <section
      id="siap-ikutan"
      style={{ aspectRatio: `${FRAME_W} / ${SIAP_H}`, paddingTop: u(82) }}
      className="flex w-full flex-col items-center text-[#502119]"
    >
      <h2 className="sr-only">Siap ikutan #SemingguTanpaTehCelup?</h2>

      <p style={{ ...body, width: u(222), marginLeft: u(140) }} className="self-start text-justify">
        Gerakan <mark className={`${hl} bg-[#d5f554]`}>#SemingguTanpaTehCelup</mark> adalah tantangan komitmen 7 hari
        buat ngajak kamu beralih dari kantong teh celup sintetis ke teh tubruk atau reusable tea infuser.
      </p>

      <p style={{ ...body, width: u(202), marginLeft: u(47), marginTop: u(27) }} className="self-start text-justify">
        Satu minggu tanpa kantong plastik sekali pakai berarti ratusan ribu partikel mikroplastik yang batal masuk ke
        tubuhmu. <mark className={`${hl} bg-[#ff74c7]`}>Dimulai dari cangkir pertamamu hari ini!</mark>
      </p>

      <div
        ref={dialRef}
        role="img"
        aria-label={`${day} hari`}
        style={{ width: u(254), height: u(254), marginTop: u(40) }}
        className="grid grid-cols-1 grid-rows-1 place-items-center rounded-full border-[length:calc(var(--u)*8)] border-[#682622] bg-[#532319] drop-shadow-[2px_5px_0_rgba(80,33,25,0.45)]"
      >
        <img
          src={countdownRing}
          alt=""
          style={{ width: u(224), marginTop: u(4) }}
          className="col-start-1 row-start-1 self-start"
        />

        {/* needle */}
        <div
          ref={needleRef}
          style={{ width: u(200) }}
          className="col-start-1 row-start-1 flex justify-start will-change-transform"
        >
          <span style={{ width: u(100), height: u(5) }} className="rounded-full bg-[#d32b2b]" />
        </div>

        <div className="col-start-1 row-start-1 grid place-items-center">
          <img src={hubOrange} alt="" style={{ width: u(48) }} className="col-start-1 row-start-1" />
          <img src={hubRed} alt="" style={{ width: u(24) }} className="col-start-1 row-start-1" />
        </div>

        <div className="col-start-1 row-start-1 flex flex-col items-center self-end text-white" style={{ marginBottom: u(24) }}>
          <span style={{ fontSize: u(32), lineHeight: 1 }} className="font-bold">
            {day}
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


        {day === DAYS_LEFT && <Confetti />}
      </div>

      <div style={{ marginTop: u(42) }}>
        <ChunkyButton
          as="a"
          w={174}
          href={`${import.meta.env.BASE_URL}Kartu_Komitmen_SemingguTanpaTehCelup.png`}
          download="Kartu_Komitmen_SemingguTanpaTehCelup.png"
        >
          AKU SIAP IKUTAN!
        </ChunkyButton>
      </div>

      <p style={{ ...body, width: u(345), marginTop: u(18) }} className="text-center">
        Yuk, ambil komitmenmu sekarang! Klik tombol diatas buat buktikan kamu siap lepas dari teh celup sintetis,
        dapet kartu progres kustom milikmu, foto dan tag @ku.seruput di IG Story!
      </p>
    </section>
  );
}
