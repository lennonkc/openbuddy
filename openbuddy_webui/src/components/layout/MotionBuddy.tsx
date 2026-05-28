import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "@/styles/motion-buddy.css";
import { useEventStream, useAgentState } from "@/lib/useEventStream";

gsap.registerPlugin(useGSAP);

const HEART =
  "M0,-2 C0,-2 -5,-7 -5,-9.5 C-5,-12 -2.5,-13.5 0,-11 C2.5,-13.5 5,-12 5,-9.5 C5,-7 0,-2 0,-2 Z";
const STAR =
  "M0,-7 L1.8,-2.2 L6.7,-2.2 L2.8,1 L4.1,6.2 L0,3 L-4.1,6.2 L-2.8,1 L-6.7,-2.2 L-1.8,-2.2 Z";

const SPARKS = [
  { cx: 10, cy: 10, dx: -15, dy: -20 },
  { cx: 120, cy: 8, dx: 15, dy: -18 },
  { cx: 5, cy: 60, dx: -20, dy: -5 },
  { cx: 125, cy: 55, dx: 18, dy: -8 },
  { cx: 15, cy: 110, dx: -12, dy: 15 },
  { cx: 118, cy: 115, dx: 14, dy: 12 },
  { cx: 65, cy: 2, dx: 0, dy: -20 },
  { cx: 40, cy: 5, dx: -10, dy: -18 },
  { cx: 95, cy: 3, dx: 8, dy: -16 },
];

const RAYS = [0, 40, 80, 130, 170, 210, 250, 300, 340].map((a) => {
  const rad = (a * Math.PI) / 180;
  const cx = 65,
    cy = 58;
  return {
    x1: cx + 55 * Math.cos(rad),
    y1: cy + 55 * Math.sin(rad),
    tx2: cx + 80 * Math.cos(rad),
    ty2: cy + 80 * Math.sin(rad),
    ttx2: cx + 75 * Math.cos(rad),
    tty2: cy + 75 * Math.sin(rad),
  };
});

const ERROR_XS = [
  { x: 20, y: 15 },
  { x: 110, y: 20 },
  { x: 15, y: 95 },
  { x: 115, y: 100 },
];

function eyeColors(s: string) {
  if (s === "listening") return { m: "#FFB0C8", h: "#FFB0C8" };
  if (s === "thinking") return { m: "#FDE68A", h: "#FDE68A" };
  if (s === "error") return { m: "#ef4444", h: "#ef4444" };
  return { m: "#FFEF76", h: "#E1EA89" };
}

export function MotionBuddy() {
  const containerRef = useRef<HTMLDivElement>(null);
  const events = useEventStream();
  const raw = useAgentState(events);
  const state = raw === "disconnected" ? "idle" : raw;
  const eye = eyeColors(state);

  useGSAP(
    () => {
      const c = containerRef.current;
      if (!c) return;

      if (state === "idle") {
        gsap.to(".mb-ra", { rotation: 6, svgOrigin: "116 42", duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".mb-la", { rotation: -6, svgOrigin: "30 55", duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.4 });
        gsap.to(".mb-ll", { rotation: 8, svgOrigin: "42 98", duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".mb-rl", { rotation: -7, svgOrigin: "90 96", duration: 2.5, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.6 });
        const blink = gsap.timeline({ repeat: -1, repeatDelay: 3 });
        blink
          .to(".mb-le", { scaleY: 0.08, svgOrigin: "64 54", duration: 0.1 }, 0)
          .to(".mb-re", { scaleY: 0.08, svgOrigin: "100 48", duration: 0.1 }, 0)
          .to(".mb-le", { scaleY: 1, svgOrigin: "64 54", duration: 0.1 }, 0.14)
          .to(".mb-re", { scaleY: 1, svgOrigin: "100 48", duration: 0.1 }, 0.14);
      }

      if (state === "listening") {
        c.querySelectorAll<SVGCircleElement>(".mb-wave").forEach((w, i) => {
          gsap.timeline({ repeat: -1 })
            .set(w, { attr: { r: 25 }, opacity: 0.5 }, 0)
            .to(w, { attr: { r: 70 }, opacity: 0, duration: 1, ease: "power1.out" })
            .delay(i * 0.35);
        });
        gsap.to(".mb-hl", { scale: 1.2, svgOrigin: "63 62", duration: 0.5, ease: "back.out(2)", yoyo: true, repeat: -1, repeatDelay: 0.3 });
        gsap.to(".mb-hr", { scale: 1.2, svgOrigin: "99 56", duration: 0.5, ease: "back.out(2)", yoyo: true, repeat: -1, repeatDelay: 0.3, delay: 0.1 });
        const tl = gsap.timeline({ repeat: -1 });
        tl.to(".mb-w", { y: -10, scaleX: 1.02, scaleY: 1.04, svgOrigin: "65 120", duration: 0.4 })
          .to(".mb-w", { y: 0, scaleX: 1, scaleY: 1, svgOrigin: "65 120", duration: 0.4, ease: "bounce.out" })
          .to(".mb-ra", { rotation: -20, svgOrigin: "116 42", duration: 0.35, ease: "back.out(2)" }, 0)
          .to(".mb-ra", { rotation: 0, svgOrigin: "116 42", duration: 0.35 }, 0.4)
          .to(".mb-la", { rotation: 12, svgOrigin: "30 55", duration: 0.35 }, 0)
          .to(".mb-la", { rotation: 0, svgOrigin: "30 55", duration: 0.35 }, 0.4)
          .to(".mb-ll", { rotation: -5, svgOrigin: "42 98", duration: 0.2 }, 0)
          .to(".mb-ll", { rotation: 0, svgOrigin: "42 98", duration: 0.2 }, 0.2)
          .to(".mb-rl", { rotation: -5, svgOrigin: "90 96", duration: 0.2 }, 0.4)
          .to(".mb-rl", { rotation: 0, svgOrigin: "90 96", duration: 0.2 }, 0.6);
      }

      if (state === "thinking") {
        c.querySelectorAll<SVGCircleElement>(".mb-spark").forEach((el, i) => {
          const s = SPARKS[i];
          gsap.timeline({ repeat: -1, delay: i * 0.28 })
            .set(el, { opacity: 0.8, x: 0, y: 0 })
            .to(el, { x: s.dx, y: s.dy, opacity: 0, duration: 1.2, ease: "power1.out" });
        });
        gsap.to(".mb-sl", { scale: 1, svgOrigin: "64 54", duration: 0.4, ease: "back.out(2)", yoyo: true, repeat: -1, repeatDelay: 0.4 });
        gsap.to(".mb-sr", { scale: 1, svgOrigin: "100 48", duration: 0.4, ease: "back.out(2)", yoyo: true, repeat: -1, repeatDelay: 0.4, delay: 0.1 });
        gsap.to(".mb-w", { rotation: 3, svgOrigin: "65 90", duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".mb-ra", { rotation: -18, svgOrigin: "116 42", duration: 2.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".mb-la", { rotation: 5, svgOrigin: "30 55", duration: 2.8, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.3 });
      }

      if (state === "speaking") {
        const rays = c.querySelectorAll<SVGLineElement>(".mb-ray");
        const rtl = gsap.timeline({ repeat: -1 });
        rays.forEach((ln, i) => {
          const r = RAYS[i];
          rtl.set(ln, { attr: { x2: r.x1, y2: r.y1 }, opacity: 0.7 }, i * 0.06)
            .to(ln, { attr: { x2: r.tx2, y2: r.ty2 }, duration: 0.2, ease: "power2.out" }, i * 0.06)
            .to(ln, { opacity: 0, duration: 0.4 }, i * 0.06 + 0.2);
        });
        rays.forEach((ln, i) => {
          const r = RAYS[i];
          rtl.set(ln, { attr: { x2: r.x1, y2: r.y1 }, opacity: 0.6 }, 1 + i * 0.06)
            .to(ln, { attr: { x2: r.ttx2, y2: r.tty2 }, duration: 0.2, ease: "power2.out" }, 1 + i * 0.06)
            .to(ln, { opacity: 0, duration: 0.35 }, 1 + i * 0.06 + 0.2);
        });
        const tl = gsap.timeline({ repeat: -1 });
        tl.to(".mb-w", { rotation: -2, y: -3, svgOrigin: "65 120", duration: 0.8, ease: "power1.inOut" })
          .to(".mb-w", { rotation: -1, y: 0, svgOrigin: "65 120", duration: 0.8, ease: "power1.inOut" })
          .to(".mb-ra", { rotation: -22, svgOrigin: "116 42", duration: 0.5, ease: "back.out(1.5)" }, 0)
          .to(".mb-ra", { rotation: -10, svgOrigin: "116 42", duration: 0.5 }, 0.5)
          .to(".mb-ra", { rotation: -25, svgOrigin: "116 42", duration: 0.4, ease: "back.out(1.5)" }, 1)
          .to(".mb-ra", { rotation: -8, svgOrigin: "116 42", duration: 0.4 }, 1.2)
          .to(".mb-la", { rotation: 6, svgOrigin: "30 55", duration: 0.8 }, 0)
          .to(".mb-la", { rotation: 3, svgOrigin: "30 55", duration: 0.8 }, 0.8)
          .to(".mb-hd", { y: 1, svgOrigin: "70 12", duration: 0.4 }, 0.3)
          .to(".mb-hd", { y: 0, svgOrigin: "70 12", duration: 0.4 }, 0.7)
          .to(".mb-hd", { y: 1.5, svgOrigin: "70 12", duration: 0.3 }, 1.1)
          .to(".mb-hd", { y: 0, svgOrigin: "70 12", duration: 0.3 }, 1.3);
      }

      if (state === "error") {
        c.querySelectorAll<SVGCircleElement>(".mb-ering").forEach((el, i) => {
          gsap.timeline({ repeat: -1, delay: i * 1.2 })
            .set(el, { attr: { r: 20 }, opacity: 0.5 })
            .to(el, { attr: { r: 65 }, opacity: 0, duration: 1.8, ease: "power1.out" });
        });
        c.querySelectorAll<SVGGElement>(".mb-ex").forEach((el, i) => {
          gsap.to(el, { opacity: 0.5, duration: 0.3, yoyo: true, repeat: -1, delay: i * 0.4, ease: "steps(1)" });
        });
        gsap.to(".mb-w", { x: 3, svgOrigin: "65 65", duration: 0.06, ease: "steps(1)", yoyo: true, repeat: -1 });
        gsap.to(".mb-ra", { rotation: 12, svgOrigin: "116 42", duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".mb-la", { rotation: -10, svgOrigin: "30 55", duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.3 });
        gsap.to(".mb-ll", { rotation: 4, svgOrigin: "42 98", duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".mb-rl", { rotation: -3, svgOrigin: "90 96", duration: 1, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.4 });
        gsap.to(".mb-le", { scaleY: 0.08, svgOrigin: "64 54", duration: 0.1, yoyo: true, repeat: -1, repeatDelay: 0.15 });
        gsap.to(".mb-re", { scaleY: 0.08, svgOrigin: "100 48", duration: 0.1, yoyo: true, repeat: -1, repeatDelay: 0.15, delay: 0.08 });
      }
    },
    { scope: containerRef, dependencies: [state] },
  );

  return (
    <div ref={containerRef} className="motion-buddy">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" overflow="visible" aria-hidden="true">
        <defs>
          <linearGradient id="mb-ga" x1="1.27" x2="36.74" y1="64.92" y2="55.84" gradientUnits="userSpaceOnUse">
            <stop stopColor="#33C0B1" offset=".362" /><stop stopColor="#2DAEA5" offset="1" />
          </linearGradient>
          <linearGradient id="mb-gb" x1="82.91" x2="98.32" y1="96.1" y2="96.1" gradientUnits="userSpaceOnUse">
            <stop stopColor="#249A93" offset="0" /><stop stopColor="#249B94" offset="1" />
          </linearGradient>
        </defs>

        {state === "listening" && [0, 1, 2].map((i) => (
          <circle key={i} className="mb-wave" cx="65" cy="65" r="20" fill="none" stroke="#93c5fd" strokeWidth="2" opacity="0" />
        ))}
        {state === "thinking" && SPARKS.map((s, i) => (
          <circle key={i} className="mb-spark" cx={s.cx} cy={s.cy} r={2.5 + (i % 3) * 0.5} fill="#fbbf24" opacity="0" />
        ))}
        {state === "speaking" && RAYS.map((r, i) => (
          <line key={i} className="mb-ray" x1={r.x1} y1={r.y1} x2={r.x1} y2={r.y1} stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" opacity="0" />
        ))}
        {state === "error" && (
          <>
            {[0, 1].map((i) => (
              <circle key={i} className="mb-ering" cx="65" cy="65" r="20" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0" />
            ))}
            {ERROR_XS.map((p, i) => (
              <g key={i} className="mb-ex" opacity="0">
                <line x1={p.x - 4} y1={p.y - 4} x2={p.x + 4} y2={p.y + 4} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                <line x1={p.x + 4} y1={p.y - 4} x2={p.x - 4} y2={p.y + 4} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </g>
            ))}
          </>
        )}

        <g className="mb-w">
          <g className="mb-ra">
            <path fill="#4CD5C3" d="m116.2 38.7 10.4 4.3-10.4 2-5.2-0.7 1.6-7.3 3.6 1.7z" />
            <path fill="#28B0A4" d="m116.2 45.1 9.8-1.9c0.8-0.2 2.5-0.2 2.7 0.8l-0.2 14.6c0 2.3-1.9 4.7-4.1 5l-9.4 1.5-0.5-19.8 1.7-0.2z" />
          </g>
          <g className="mb-hd">
            <path fill="#28B0A4" d="m109.4 9.6-18.7-6.3c-1.5-0.5-3.2-0.7-5.1-0.5l-51.3 7.4c-1.9 0.3-3.8 1.5-5.7 2.9l20.7 8.8 39.2-0.5 20.9-11.8z" />
          </g>
          <g>
            <path fill="#4CD5C3" d="m28.6 12.9c-2.2 2.2-3.9 5.6-4.3 9.2v28.8l24.5 7.7 0.5-37.2-20.7-8.5z" />
            <path fill="#28B0A4" d="m50.2 20.9c-2.1 2.3-4.7 6.3-4.7 10.1v56.9c0 6.3 3.8 11.9 9.6 11.5l-23.2-8.5c-4-1.6-7.6-5.4-7.6-12.5v-56.1c0.2-3.4 1.9-7.2 4.3-9.4l20.2 8.3 1.4-0.3z" />
          </g>
          <g className="mb-la">
            <path fill="url(#mb-ga)" d="m24.3 49.4-19.4 3.4c-2.1 0.3-3.7 3.1-3.7 5.8v11.1c0 1.7 0.9 3.8 2.6 4.6l10.1 3.9c0.5 0.2 0.7 0.2 1.4 0l19-3.1 2.4-21.6-12.4-4.1z" />
            <path fill="#41CDBB" d="m17 57.8 18.5-3.4c2.4-0.4 4.1 0.7 4.1 3.2v12.8c0 2.4-1.5 4.7-3.9 5.2l-19.4 3c-1.7 0-3.1-1.1-3.1-3v-12.3c0-2.4 1.6-5 3.8-5.5z" />
          </g>
          <g>
            <path fill="#44CEBC" d="m105.6 9.4-50.3 7.4c-5.3 0.9-9.8 7.5-9.8 13.1v58c0 6.5 3.8 11.9 10.1 11.5l50.7-8.7c4.8-0.9 9.9-5.7 9.9-12.3v-59.2c0-6.1-4.3-10.4-10.6-9.8z" />
          </g>
          <g className="mb-rl">
            <path fill="#4CD5C3" d="m94.3 102.6-4.3 0.9-16.1-7.2 9.1-1.3 7.2 1.5 4.1 6.1z" />
            <path fill="#28B0A4" d="m98.3 94.6 10.9 5.2-14.9 2.8-5.3-2.8 1-0.7 8.3-4.5z" />
            <path fill="#28B0A4" d="m73.9 96.3v13.5l15.6 8 19.7-3.9v-14.1l-19.7 3.7-15.6-7.2z" />
            <path fill="#FCD757" d="m73.9 109.8v4.5l15.6 7.5 19.7-3.9v-4l-19.7 3.9-15.6-8z" />
            <path fill="url(#mb-gb)" d="m83 96.5 6.5 3.3 8.8-1.8v-5.8l-15.3 2.6v1.7z" />
            <path fill="#4CD5C3" d="m89.5 103.5v14.3l19.7-3.9v-14.1l-19.7 3.7z" />
          </g>
          <g className="mb-ll">
            <path fill="#4CD5C3" d="m29.1 101.1 16-2.9 4.9 9.7-4.9 1.1-16-7.6v-0.3z" />
            <path fill="#28B0A4" d="m45.1 104.9 4.9 3 14.4-2.8-10.5-5.2-8.8 1.9v3.1z" />
            <path fill="#249A93" d="m38.4 93.5v8.3l6.7 3.1 8.8-1.6v-3.9l-15.5-5.9z" />
            <path fill="#28B0A4" d="m29.1 101.3v14.3l16 7.5 19.3-3.8v-14.2l-19.3 3.9-16-7.7z" />
            <path fill="#FCD757" d="m29.1 115.6v3.8l16 8.1 19.3-4.1v-4.1l-19.3 3.8-16-7.5z" />
            <path fill="#44CEBC" d="m45.1 109v14.1l19.3-3.8v-14.2l-19.3 3.9z" />
          </g>
          <g className="mb-le">
            <path fill={eye.m} d="m61.1 39.5 8-1.1c1.4-0.2 2.1 0.7 2.1 2.3v26.6c0 1.5-1.2 3.1-2.9 3.4l-7.5 1.4c-1.6 0.2-3.1-0.7-3.1-3.1v-24.5c0-2.6 1.9-4.5 3.4-5z" />
            <path fill={eye.h} d="m68.8 38.4-0.2 28c0 1.4-0.7 2.4-2.4 2.7l-7.5 1.3c0.5 1.3 1.4 1.9 3.3 1.5l6.3-1c1.5-0.2 2.9-1.7 2.9-3.4v-26.6c0-1.6-0.9-2.7-2.4-2.5z" />
            {state === "listening" && <path className="mb-hl" fill="#FF6B9D" d={HEART} transform="translate(63,62) scale(0.01)" />}
            {state === "thinking" && <path className="mb-sl" fill="#f59e0b" d={STAR} transform="translate(64,54) scale(0.01)" />}
          </g>
          <g className="mb-re">
            <path fill={eye.m} d="m96.7 33.4 7.5-1.1c1.4-0.2 2.6 0.9 2.6 2.5v26.1c0 1.9-1.2 3.5-2.9 3.8l-7 1.4c-1.7 0-3.6-1-3.6-3.5v-25.4c0-1.9 1.4-3.5 3.4-3.8z" />
            <path fill={eye.h} d="m104.2 32.3v27.2c0 1.5-0.7 2.4-2.2 2.7l-8.2 1.9c0.5 1.3 1.9 2.3 3.1 2l7-1.4c1.7-0.3 2.9-1.5 2.9-3.8v-26.1c0-1.6-1.2-2.7-2.6-2.5z" />
            {state === "listening" && <path className="mb-hr" fill="#FF6B9D" d={HEART} transform="translate(99,56) scale(0.01)" />}
            {state === "thinking" && <path className="mb-sr" fill="#f59e0b" d={STAR} transform="translate(100,48) scale(0.01)" />}
          </g>
        </g>
      </svg>
    </div>
  );
}
