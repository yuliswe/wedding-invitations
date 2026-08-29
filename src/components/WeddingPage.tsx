"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Disc3 } from "lucide-react";

const STORY_PHOTOS = [
  { src: "/assets/story-photo.webp", alt: "Yu and Jin" },
  { src: "/assets/photo-pei.jpeg", alt: "Yu and Jin on the red cliffs" },
  { src: "/assets/photo-lighthouse.jpeg", alt: "Yu and Jin at the lighthouse" },
  { src: "/assets/photo-closeup.jpeg", alt: "Yu and Jin, close up" },
  { src: "/assets/photo-peace.jpeg", alt: "Yu and Jin in the sun" },
  { src: "/assets/photo-newyear.jpeg", alt: "Yu and Jin at new year" },
  { src: "/assets/photo-bridge.jpeg", alt: "Yu and Jin on the stone bridge" },
];

const GALLERY_PHOTOS = Array.from({ length: 9 }, (_, i) => ({
  src: `/assets/g${i + 1}.jpeg`,
  alt: "Yu and Jin",
}));

const WEDDING_DATE = new Date("2026-09-15T13:00:00");
const RSVP_DEADLINE = "Please respond by Friday, September 4, 2026 — we need to book the bowling lanes.";

const CARD_TILTS = [0, -3.2, 2.6, -1.6, 3.4, -2.4, 1.9];
const TOTAL_CARDS = 7;

const GRAIN_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.62' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='150' height='150' filter='url(%23p)' opacity='0.42'/%3E%3C/svg%3E\")";

type DragState = {
  x: number;
  y: number;
  dx: number;
  axis: "x" | "y" | null;
  id?: number;
  hit: number;
};

export default function WeddingPage() {
  const [storyIndex, setStoryIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [countDisplay, setCountDisplay] = useState(0);
  const [opened, setOpened] = useState(false);
  const [revealed, setRevealed] = useState({
    story: false,
    schedule: false,
    gallery: false,
    details: false,
    rsvp: false,
  });

  const storyRef = useRef<HTMLElement>(null);
  const scheduleRef = useRef<HTMLElement>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLElement>(null);
  const rsvpRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const storyStackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const lightboxImgRef = useRef<HTMLImageElement>(null);
  const currentSectionRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);

  const storyIndexRef = useRef(0);
  const stackWRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const touchRef = useRef<DragState | null>(null);
  const envelopeLatchedRef = useRef(false);
  const trackCollapsedRef = useRef(false);
  const lastSectionLabelRef = useRef<string | null>(null);

  useEffect(() => {
    storyIndexRef.current = storyIndex;
  }, [storyIndex]);

  const fanStep = useCallback(() => {
    const el = storyStackRef.current;
    const cardW = el?.clientWidth ?? 300;
    const avail = (stackWRef.current || window.innerWidth) - 40;
    return Math.max(12, Math.round((avail - cardW) / 6));
  }, []);

  const computeCardStyle = useCallback(
    (i: number, dragDx: number) => {
      const idx = storyIndexRef.current;
      const depth = (i - idx + TOTAL_CARDS) % TOTAL_CARDS;
      const tilt = CARD_TILTS[i];
      const lift = depth * 4;
      const scale = 1 - depth * 0.02;
      const fan = depth * fanStep();
      const dx = (depth === 0 && dragDx ? dragDx : 0) + fan;
      const spin = depth === 0 && dragDx ? dragDx * 0.045 : 0;
      return (
        `transform:translate(${dx}px,${lift}px) rotate(${tilt + spin}deg) scale(${scale});` +
        `opacity:${depth === 6 ? 0.85 : 1};` +
        `z-index:${10 - depth};` +
        (dragDx
          ? ""
          : "transition:transform 0.34s var(--easing),opacity 0.34s var(--easing);")
      );
    },
    [fanStep],
  );

  const paintCards = useCallback(
    (dragDx: number) => {
      for (let i = 0; i < TOTAL_CARDS; i++) {
        const el = cardRefs.current[i];
        if (el) el.setAttribute("style", computeCardStyle(i, dragDx));
      }
    },
    [computeCardStyle],
  );

  const goStory = useCallback(
    (i: number) => {
      const next = ((i % TOTAL_CARDS) + TOTAL_CARDS) % TOTAL_CARDS;
      setStoryIndex(next);
      storyIndexRef.current = next;
      requestAnimationFrame(() => paintCards(0));
    },
    [paintCards],
  );

  const openLightbox = useCallback((src: string) => {
    setLightboxSrc(src);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxSrc(null);
  }, []);

  const openCardLightbox = useCallback(
    (index: number) => {
      const el = cardRefs.current[index];
      const img = el?.querySelector("img");
      if (img?.src) openLightbox(img.src);
    },
    [openLightbox],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    setPlaying((prev) => {
      const next = !prev;
      if (audio) {
        if (next) audio.play().catch(() => {});
        else audio.pause();
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc, closeLightbox]);

  useEffect(() => {
    const img = lightboxImgRef.current;
    if (img && lightboxSrc) img.src = lightboxSrc;
  }, [lightboxSrc]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOpened(true);
    }

    const daysLeft = Math.max(
      0,
      Math.ceil((WEDDING_DATE.getTime() - Date.now()) / 86400000),
    );
    const start = performance.now();
    const countStep = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setCountDisplay(Math.round((1 - Math.pow(1 - p, 3)) * daysLeft));
      if (p < 1) requestAnimationFrame(countStep);
    };
    requestAnimationFrame(countStep);

    const sections: [string, React.RefObject<HTMLElement | null>][] = [
      ["story", storyRef],
      ["schedule", scheduleRef],
      ["gallery", galleryRef],
      ["details", detailsRef],
      ["rsvp", rsvpRef],
    ];
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const key = entry.target.getAttribute("data-reveal-key");
            if (key)
              setRevealed((s) => ({ ...s, [key]: true }));
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    sections.forEach(([key, ref]) => {
      if (ref.current) {
        ref.current.setAttribute("data-reveal-key", key);
        revealObserver.observe(ref.current);
      }
    });

    const fit = () => {
      const stage = stageRef.current;
      const fitEl = fitRef.current;
      const card = cardRef.current;
      if (!stage || !fitEl || !card) return;
      const cs = getComputedStyle(stage);
      const avail =
        stage.clientHeight -
        parseFloat(cs.paddingTop) -
        parseFloat(cs.paddingBottom);
      const overhang = Math.max(30, Math.min(48, window.innerWidth * 0.07));
      fitEl.style.paddingBottom = "0px";
      const natural = card.offsetHeight + overhang + 20;
      const s = Math.min(1, avail / Math.max(1, natural));
      fitEl.style.paddingBottom = overhang + "px";
      fitEl.style.transform = `scale(${s.toFixed(4)})`;
    };
    fit();
    window.addEventListener("resize", fit);
    if (document.fonts?.ready) document.fonts.ready.then(fit);
    const fitRetry = setTimeout(fit, 400);

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let scrollTick: number | null = null;
    let collapseTimer: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      if (scrollTick) return;
      scrollTick = requestAnimationFrame(() => {
        scrollTick = null;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        if (progressRef.current)
          progressRef.current.style.width = `${(p * 100).toFixed(2)}%`;

        const track = trackRef.current;
        const card = cardRef.current;
        const flap = flapRef.current;
        if (reduce) {
          if (hintRef.current) hintRef.current.style.opacity = "0";
          return;
        }
        if (!track || !card || !flap) return;

        const rect = track.getBoundingClientRect();
        const span = Math.max(1, track.offsetHeight - window.innerHeight);
        const raw = Math.min(1, Math.max(0, -rect.top / span));

        if (!envelopeLatchedRef.current && raw >= 0.999)
          envelopeLatchedRef.current = true;

        if (
          envelopeLatchedRef.current &&
          !trackCollapsedRef.current
        ) {
          clearTimeout(collapseTimer);
          collapseTimer = setTimeout(() => {
            if (trackCollapsedRef.current || !trackRef.current) return;
            trackCollapsedRef.current = true;
            const t2 = trackRef.current;
            const before = t2.getBoundingClientRect().bottom;
            const prevBehavior =
              document.documentElement.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = "auto";
            t2.style.height = "100svh";
            const after = t2.getBoundingClientRect().bottom;
            window.scrollTo({
              top: window.scrollY - (before - after),
              behavior: "instant",
            });
            document.documentElement.style.scrollBehavior = prevBehavior;
          }, 180);
        }

        const t = envelopeLatchedRef.current ? 1 : raw;
        const seg = (x: number, a: number, b: number) => {
          const v = Math.min(1, Math.max(0, (x - a) / (b - a)));
          return v * v * (3 - 2 * v);
        };

        if (hintRef.current) {
          hintRef.current.style.opacity = String(Math.max(0, 1 - t / 0.12));
        }

        const fo = seg(t, 0.02, 0.55);
        flap.style.transform = `rotateX(${(-168 * fo).toFixed(1)}deg)`;
        flap.style.opacity = String(1 - fo * 0.38);
        flap.style.zIndex = "0";

        const co = seg(t, 0.12, 0.78);
        card.style.opacity = String(co);
        card.style.transform = `translateY(${(58 - 58 * co).toFixed(1)}px) scale(${(0.965 + 0.035 * co).toFixed(4)})`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const sectionLabels: [string, string][] = [
      ["story", "Our story"],
      ["schedule", "Schedule"],
      ["gallery", "Gallery"],
      ["details", "Good to know"],
      ["rsvp", "RSVP"],
    ];
    const trackCurrentSection = () => {
      const el = currentSectionRef.current;
      if (!el) return;
      let active: string | null = null;
      for (const [id, label] of sectionLabels) {
        const sec = document.getElementById(id);
        if (!sec) continue;
        const r = sec.getBoundingClientRect();
        if (r.top <= 90 && r.bottom > 90) {
          active = label;
          break;
        }
      }
      if (active !== lastSectionLabelRef.current) {
        lastSectionLabelRef.current = active;
        el.textContent = active || "";
        el.style.opacity = active ? "1" : "0";
      }
    };
    window.addEventListener("scroll", trackCurrentSection, { passive: true });
    trackCurrentSection();

    const audio = audioRef.current;
    if (audio) {
      const saved = parseFloat(
        localStorage.getItem("wedding-audio-position") || "0",
      );
      if (!isNaN(saved)) audio.currentTime = saved;

      const onPlay = () => setPlaying(true);
      const onPause = () => {
        setPlaying(false);
        localStorage.setItem(
          "wedding-audio-position",
          String(audio.currentTime),
        );
      };
      const onTime = () => {
        if (Math.floor(audio.currentTime) % 3 === 0)
          localStorage.setItem(
            "wedding-audio-position",
            String(audio.currentTime),
          );
      };
      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("timeupdate", onTime);

      return () => {
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("timeupdate", onTime);
        localStorage.setItem(
          "wedding-audio-position",
          String(audio.currentTime),
        );
      };
    }

    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", trackCurrentSection);
      if (scrollTick) cancelAnimationFrame(scrollTick);
      clearTimeout(fitRetry);
      clearTimeout(collapseTimer);
      revealObserver.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = storyStackRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const w = el.parentElement?.clientWidth ?? el.clientWidth;
      stackWRef.current = w;
      paintCards(0);
    });
    ro.observe(el);

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const fig =
        (e.target as HTMLElement)?.closest?.("figure") ?? null;
      let hit = storyIndexRef.current;
      for (let i = 0; i < TOTAL_CARDS; i++) {
        if (cardRefs.current[i] === fig) {
          hit = i;
          break;
        }
      }
      touchRef.current = { x: t.clientX, y: t.clientY, dx: 0, axis: null, hit };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - touchRef.current.x;
      const dy = t.clientY - touchRef.current.y;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (!touchRef.current.axis) {
        if (ax >= 8 && ay < ax * 2.5) touchRef.current.axis = "x";
        else if (ay >= 26 && ay > ax * 2.5) touchRef.current.axis = "y";
        else return;
      }
      if (touchRef.current.axis !== "x") return;
      if (e.cancelable) e.preventDefault();
      touchRef.current.dx = dx;
      paintCards(dx);
    };

    const onTouchEnd = () => {
      if (!touchRef.current) return;
      const { dx, axis, hit } = touchRef.current;
      touchRef.current = null;
      if (axis === null) {
        openCardLightbox(hit);
        return;
      }
      if (axis === "x" && Math.abs(dx) > 60) goStory(storyIndexRef.current + 1);
      else paintCards(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      ro.disconnect();
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [paintCards, goStory, openCardLightbox]);

  const onStackDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.button != null && e.button !== 0) return;
      const fig =
        (e.target as HTMLElement)?.closest?.("figure") ?? null;
      let hit = storyIndexRef.current;
      for (let i = 0; i < TOTAL_CARDS; i++) {
        if (cardRefs.current[i] === fig) {
          hit = i;
          break;
        }
      }
      dragRef.current = {
        x: e.clientX,
        y: e.clientY,
        dx: 0,
        axis: null,
        hit,
      };

      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.x;
        const dy = ev.clientY - dragRef.current.y;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (!dragRef.current.axis) {
          if (ax >= 6 && ay < ax * 2)
            dragRef.current.axis = "x";
          else if (ay >= 6 && ay >= ax * 2)
            dragRef.current.axis = "y";
          else return;
        }
        if (dragRef.current.axis !== "x") return;
        dragRef.current.dx = dx;
        paintCards(dx);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        if (!dragRef.current) return;
        const { dx } = dragRef.current;
        const moved = dragRef.current.axis !== null;
        const hitCard = dragRef.current.hit;
        dragRef.current = null;
        if (!moved) {
          openCardLightbox(hitCard);
          return;
        }
        if (Math.abs(dx) > 60) goStory(storyIndexRef.current + 1);
        else paintCards(0);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [paintCards, goStory, openCardLightbox],
  );

  const revealStyle = (key: keyof typeof revealed) =>
    revealed[key]
      ? { opacity: 1, transform: "translateY(0)", transition: "opacity 0.5s ease, transform 0.5s ease" }
      : { opacity: 0, transform: "translateY(14px)" };

  const storyDotStyle = (i: number) => {
    const on = storyIndex === i;
    return {
      width: on ? 18 : 7,
      height: 7,
      padding: 0,
      border: 0,
      borderRadius: 999,
      cursor: "pointer" as const,
      backgroundColor: on
        ? "var(--color-accent)"
        : "color-mix(in srgb, var(--color-text) 22%, transparent)",
      transition:
        "width var(--duration-fade) var(--easing), background var(--duration-fade) var(--easing)",
      boxSizing: "content-box" as const,
      borderTop: "calc((var(--tap) - 7px) / 2) solid transparent",
      borderBottom: "calc((var(--tap) - 7px) / 2) solid transparent",
      backgroundClip: "content-box" as const,
    };
  };

  const flapStyle: React.CSSProperties = {
    left: "calc(-1 * clamp(8px,2.2vw,14px))",
    right: "calc(-1 * clamp(8px,2.2vw,14px))",
    top: "clamp(18px,4vw,26px)",
    height: "clamp(62px,16vw,108px)",
    filter:
      "drop-shadow(0 2px 4px color-mix(in srgb, var(--color-neutral-900) 16%, transparent)) drop-shadow(0 1px 1px color-mix(in srgb, var(--color-neutral-900) 12%, transparent))",
    ...(opened
      ? { transform: "rotateX(-168deg)", opacity: 0.62, zIndex: 0 }
      : { transform: "rotateX(0deg)", opacity: 1, zIndex: 0 }),
  };

  const cardStyle: React.CSSProperties = {
    padding: "clamp(6px,1.6vw,9px)",
    ...(opened
      ? { transform: "translateY(0) scale(1)", opacity: 1 }
      : { transform: "translateY(58px) scale(0.965)", opacity: 0 }),
  };

  return (
    <div className="bg-[var(--surface-page)] text-[var(--text-primary)] min-h-dvh">
      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div
          onClick={closeLightbox}
          role="dialog"
          aria-modal
          aria-label="Photograph"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 cursor-zoom-out"
          style={{
            background: "color-mix(in srgb, var(--color-neutral-900) 88%, transparent)",
            animation: "ledger-fade var(--duration-fade) var(--easing) both",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={lightboxImgRef}
            alt="Photograph"
            className="max-w-full max-h-full object-contain rounded-[var(--radius-md)] shadow-[var(--shadow-lg)]"
          />
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Close"
            className="absolute top-4 right-4 w-[var(--tap)] h-[var(--tap)] inline-flex items-center justify-center bg-transparent rounded-[var(--radius-md)] text-[color:var(--color-neutral-100)] leading-none cursor-pointer"
            style={{
              border: "1px solid color-mix(in srgb, var(--color-neutral-100) 40%, transparent)",
              fontFamily: "var(--font-body)",
              fontSize: 20,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Hero / Envelope ── */}
      <section
        ref={trackRef}
        className="relative border-b border-[var(--border-hairline)]"
        style={{ height: "260vh" }}
      >
        <div
          ref={stageRef}
          className="sticky top-0 isolate flex flex-col justify-center overflow-hidden"
          style={{
            padding: "clamp(14px,3vh,34px) 20px",
            height: "100svh",
            animation: "ledger-rise var(--duration-rise) var(--easing) both",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/hero-illustration.webp"
            alt=""
            className="absolute inset-0 z-[-2] block w-full h-full object-cover"
            style={{ filter: "sepia(0.14) saturate(0.9)" }}
          />
          <div
            ref={fitRef}
            className="w-full origin-center will-change-transform"
          >
            <div
              className="relative w-full max-w-100 mx-auto"
              style={{ perspective: 1400 }}
            >
              {/* Envelope back */}
              <div
                className="absolute z-[1] overflow-hidden rounded-[var(--radius-sm)]"
                style={{
                  left: "calc(-1 * clamp(8px,2.2vw,14px))",
                  right: "calc(-1 * clamp(8px,2.2vw,14px))",
                  top: "clamp(18px,4vw,26px)",
                  bottom: "calc(-1 * clamp(30px,7vw,48px))",
                  background: "#7f1934",
                  border: "1px solid #5d1327",
                  boxShadow:
                    "0 18px 38px color-mix(in srgb, var(--color-neutral-900) 30%, transparent), 0 4px 10px color-mix(in srgb, var(--color-neutral-900) 20%, transparent)",
                }}
              >
                <div className="absolute inset-2.25 border-2 border-[#e6c489]" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/rose-floral-flourish.svg"
                  alt=""
                  className="absolute top-1 right-1 w-[64%] opacity-[0.92]"
                  style={{ transform: "translate(21.5%, 18%) rotate(-270deg) scaleX(-1)" }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/deco-stamp.svg"
                  alt=""
                  className="absolute bottom-2.5 left-2.5 w-[23%] opacity-[0.92]"
                  style={{ transform: "scaleX(-1)" }}
                />
              </div>

              {/* Double happiness + badge */}
              <div
                aria-hidden
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 z-[2] flex flex-col items-center gap-2.5 pointer-events-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/Chinese-Wedding-Symbol.svg"
                  alt="Double happiness"
                  className="block h-auto"
                  style={{ width: "clamp(90px,24vw,150px)" }}
                />
                <span
                  className="h-px"
                  style={{
                    width: "clamp(60px,16vw,104px)",
                    background: "color-mix(in srgb, var(--color-accent) 60%, transparent)",
                  }}
                />
                <span
                  className="uppercase text-[color:var(--color-accent-300)]"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: "clamp(9px,2.4vw,12px)",
                    letterSpacing: "0.34em",
                    textIndent: "0.34em",
                  }}
                >
                  Happy wedding
                </span>
              </div>

              {/* Envelope flap */}
              <div ref={flapRef} className="absolute origin-top [transform-style:preserve-3d]" style={flapStyle}>
                <div
                  className="absolute inset-0 bg-[var(--color-accent)]"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 40%, 76% 100%, 24% 100%, 0 40%)" }}
                />
                <div
                  className="absolute left-[1.5px] right-[1.5px] top-0 bottom-[1.5px] bg-[#761730] overflow-hidden"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 40%, 76% 100%, 24% 100%, 0 40%)" }}
                />
              </div>

              {/* Scroll hint */}
              <div
                ref={hintRef}
                aria-hidden
                className="absolute left-0 right-0 bottom-[4%] z-[2] flex flex-col items-center gap-3 pointer-events-none"
                style={opened ? { opacity: 0, visibility: "hidden" } : undefined}
              >
                <span
                  className="uppercase text-[color:var(--color-accent-200)]"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: "clamp(12px,3vw,15px)",
                    letterSpacing: "0.18em",
                  }}
                >
                  Scroll to open
                </span>
                <span
                  className="inline-flex items-center justify-center w-11 h-11 rounded-[var(--radius-lg)] text-[color:var(--color-accent-200)] leading-none"
                  style={{
                    border: "1.5px solid var(--color-accent-300)",
                    fontFamily: "var(--font-body)",
                    fontSize: 22,
                    animation: "scrollHint 1.8s ease-in-out infinite",
                  }}
                >
                  ↓
                </span>
              </div>

              {/* Invitation card */}
              <div ref={cardRef} className="relative z-[3] bg-[var(--color-neutral-100)] border border-[var(--border-hairline)] rounded-[var(--radius-sm)] shadow-[var(--shadow-sm)]" style={cardStyle}>
                <div
                  className="absolute inset-0 pointer-events-none rounded-[inherit] opacity-20"
                  style={{
                    mixBlendMode: "multiply",
                    backgroundImage: GRAIN_TEXTURE,
                  }}
                />
                <div
                  className="relative text-center border border-[var(--color-accent-300)]"
                  style={{ padding: "clamp(28px,6.5vw,46px) clamp(18px,5vw,34px) clamp(26px,5.5vw,42px)" }}
                >
                  <h6 className="text-[color:var(--text-accent)]">You are invited</h6>
                  <p
                    className="uppercase text-[color:var(--text-muted)] mt-1.5"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-caption)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    to the wedding of
                  </p>

                  <div className="flex items-center gap-3.5 my-6.5">
                    <span className="flex-1 h-px bg-[var(--color-accent-300)]" />
                    <span
                      className="leading-none text-[color:var(--color-accent)]"
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "var(--text-small)",
                      }}
                    >
                      ✦
                    </span>
                    <span className="flex-1 h-px bg-[var(--color-accent-300)]" />
                  </div>

                  <h1
                    className="m-0 pb-[0.12em]"
                    style={{
                      fontFamily: "'Pinyon Script', 'Newsreader', Georgia, serif",
                      fontWeight: 400,
                      fontSize: "clamp(44px,11vw,68px)",
                      lineHeight: 1.08,
                      letterSpacing: 0,
                    }}
                  >
                    Yu <span className="text-[color:var(--color-accent)]">&amp;</span>{" "}
                    Jin
                  </h1>

                  <p
                    className="text-[color:var(--text-primary)]"
                    style={{
                      fontSize: "clamp(15px,4vw,16px)",
                      lineHeight: 1.75,
                      maxWidth: "46ch",
                      margin: "20px auto 0",
                    }}
                  >
                    The paperwork happens at Waterloo City Hall. The real
                    celebration happens over strikes, spares, and a few gutter
                    balls at Bingemans. Everyone&rsquo;s invited to both.
                  </p>

                  <div className="flex flex-col items-center gap-1 mt-8 pt-6 border-t border-[var(--color-accent-300)]">
                    <span
                      className="leading-none text-[color:var(--color-accent)] [font-variant-numeric:tabular-nums_lining-nums]"
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 400,
                        fontSize: "clamp(38px,10vw,52px)",
                      }}
                    >
                      {countDisplay}
                    </span>
                    <span
                      className="uppercase text-[color:var(--text-secondary)]"
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-caption)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      days until the ceremony
                    </span>
                  </div>

                  <div className="flex gap-3 flex-wrap justify-center mt-7">
                    <a
                      href="#schedule"
                      className="inline-flex items-center justify-center min-h-[var(--tap)] px-5.5 no-underline text-[color:var(--text-primary)] bg-transparent border border-[var(--border-hairline)] rounded-[var(--radius-md)] hover-accent-border"
                      style={{
                        fontFamily: "var(--font-interactable)",
                        fontSize: "var(--text-control)",
                        fontWeight: 600,
                        transition: "border-color var(--duration-fade) var(--easing)",
                      }}
                    >
                      Read the schedule
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky nav ── */}
      <nav className="sticky top-0 z-20 flex items-center gap-[clamp(7px,2vw,12px)] px-4 min-h-11 bg-[var(--surface-page)] border-t border-b border-[var(--border-hairline)]">
        <span
          className="whitespace-nowrap flex-none leading-none inline-flex items-center self-center relative top-0.5"
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 500,
            fontSize: "clamp(15px,4vw,17px)",
            letterSpacing: "-0.01em",
          }}
        >
          Yu &amp; Jin
        </span>

        <div className="flex items-center gap-2">
          <Disc3
            size={34}
            strokeWidth={1.5}
            className="inline-flex flex-none"
            style={{
              color: playing ? "var(--color-accent)" : "var(--color-neutral-500)",
              transition: "color var(--duration-fade) var(--easing)",
              ...(playing ? { animation: "ledger-spin 3.6s linear infinite" } : {}),
            }}
          />
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause music" : "Play music"}
            className="inline-flex items-center justify-center w-7 h-7 p-0 bg-transparent border border-[var(--border-hairline)] rounded-[var(--radius-md)] text-[color:var(--color-accent)] cursor-pointer hover-state-bg"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <audio ref={audioRef} loop className="hidden" src="/assets/music.mp3" />
        </div>

        <span
          ref={currentSectionRef}
          className="flex-auto min-w-0 overflow-hidden text-ellipsis whitespace-nowrap uppercase text-[color:var(--text-secondary)] opacity-0"
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "var(--text-caption)",
            letterSpacing: "var(--tracking-overline)",
            transition: "opacity var(--duration-fade) var(--easing)",
          }}
        />

        <span
          ref={progressRef}
          aria-hidden
          className="absolute left-0 -bottom-px h-px w-0 bg-[var(--color-accent)]"
        />

        <a
          href="#rsvp"
          className="ml-auto flex-none whitespace-nowrap inline-flex items-center justify-center min-h-7.5 no-underline text-[color:var(--color-accent-700)] bg-transparent border border-[var(--color-accent)] rounded-[var(--radius-md)] hover-rsvp"
          data-rsvp-pulse
          style={{
            padding: "0 clamp(10px,2.5vw,14px)",
            fontFamily: "var(--font-interactable)",
            fontSize: "var(--text-control)",
            fontWeight: 600,
            animation: "rsvpPulse 1s var(--easing) infinite",
          }}
        >
          RSVP
        </a>
      </nav>

      {/* ── Our Story ── */}
      <section
        id="story"
        ref={storyRef}
        className="px-5 py-13 max-w-280 mx-auto"
        style={revealStyle("story")}
      >
        <h6 className="text-[color:var(--text-accent)] mb-3.5">
          Our story
        </h6>
        <h2
          className="m-0 mb-4.5"
          style={{ fontSize: "clamp(27px,6vw,32px)" }}
        >
          How we got here
        </h2>
        <p
          className="m-0 text-[color:var(--text-primary)]"
          style={{
            fontSize: "var(--text-body-size)",
            lineHeight: "var(--leading-body)",
            maxWidth: "var(--measure)",
          }}
        >
          We met on [how you met], and it took us about five minutes to realize
          we&rsquo;d found our favorite person to be ridiculous with. Somewhere
          between [a funny early memory] and a very good dog, we decided to make
          it official — twice, apparently, because one party clearly wasn&rsquo;t
          enough.
        </p>

        <div className="mt-7 w-screen ml-[calc(50%-50vw)] px-5 box-border">
          <div
            ref={storyStackRef}
            onPointerDown={onStackDown}
            className="relative aspect-[3/4] touch-pan-y cursor-zoom-in select-none"
            style={{ width: "clamp(200px,24vw,300px)" }}
          >
            {STORY_PHOTOS.map((photo, i) => (
              <figure
                key={i}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="absolute inset-0 m-0 p-2.5 bg-[var(--surface-raised)] border border-[var(--border-hairline)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] overflow-hidden origin-bottom"
                style={{ zIndex: 10 - i }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="block w-full h-full object-cover rounded-xs pointer-events-none"
                  style={{ filter: "sepia(0.1) saturate(0.94)" }}
                />
              </figure>
            ))}
          </div>

          <div className="relative z-20 flex items-center gap-3.5 mt-10">
            <div className="flex gap-1.75 items-center">
              {Array.from({ length: TOTAL_CARDS }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goStory(i)}
                  aria-label={`Photograph ${i + 1}`}
                  style={storyDotStyle(i)}
                />
              ))}
            </div>
            <span
              className="text-[color:var(--text-muted)] [font-variant-numeric:tabular-nums_lining-nums]"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-caption)",
              }}
            >
              {storyIndex + 1} / {TOTAL_CARDS}
            </span>
            <div className="ml-auto flex gap-1.5">
              {(["‹", "›"] as const).map((arrow, idx) => (
                <button
                  key={arrow}
                  type="button"
                  onClick={
                    idx === 0
                      ? () => goStory(storyIndex - 1)
                      : () => goStory(storyIndex + 1)
                  }
                  aria-label={
                    idx === 0 ? "Previous photograph" : "Next photograph"
                  }
                  className="w-[var(--tap)] h-[var(--tap)] p-0 inline-flex items-center justify-center bg-transparent border border-[var(--border-hairline)] rounded-[var(--radius-md)] text-[color:var(--text-secondary)] leading-none cursor-pointer"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 15,
                    transition: "border-color var(--duration-fade) var(--easing)",
                  }}
                >
                  {arrow}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <hr className="h-0 m-0 border-0 border-t border-[var(--border-hairline)]" />

      {/* ── Schedule ── */}
      <section
        id="schedule"
        ref={scheduleRef}
        className="px-5 py-13 max-w-280 mx-auto"
        style={revealStyle("schedule")}
      >
        <h6 className="text-[color:var(--text-accent)] mb-3.5">
          Schedule
        </h6>
        <h2
          className="m-0 mb-6"
          style={{ fontSize: "clamp(27px,6vw,32px)" }}
        >
          You are invited to two events
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          <div className="p-5.5 border border-[var(--border-hairline)] rounded-[var(--radius-md)] hover-accent-border">
            <h6 className="text-[color:var(--text-secondary)] mb-2.5">
              Event 1
            </h6>
            <h3
              className="m-0 mb-3.5"
              style={{ fontSize: "var(--text-h4)" }}
            >
              Wedding Ceremony
            </h3>
            <p
              className="m-0 mb-3.5 pb-3.5 [font-variant-numeric:tabular-nums_lining-nums]"
              style={{
                fontSize: "var(--text-small)",
                lineHeight: 1.7,
                borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
              }}
            >
              Tuesday, 15 September 2026
              <br />
              1:00 PM – 1:30 PM
              <br />
              Waterloo City Hall
              <br />
              100 Regina Street South, Waterloo, Ontario
            </p>
            <p
              className="m-0 text-[color:var(--text-secondary)]"
              style={{ fontSize: "var(--text-small)", lineHeight: 1.7 }}
            >
              The ceremony is held in City Hall. Please arrive at least 15
              minutes early and check in at the Legislative Services counter on
              the third level. City Hall is a scent-free facility.
            </p>
          </div>

          <div className="p-5.5 border border-[var(--border-hairline)] rounded-[var(--radius-md)] hover-accent-border">
            <h6 className="text-[color:var(--text-secondary)] mb-2.5">
              Event 2
            </h6>
            <h3
              className="m-0 mb-3.5"
              style={{ fontSize: "var(--text-h4)" }}
            >
              Bowling Party
            </h3>
            <p
              className="m-0 mb-3.5 pb-3.5 [font-variant-numeric:tabular-nums_lining-nums]"
              style={{
                fontSize: "var(--text-small)",
                lineHeight: 1.7,
                borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
              }}
            >
              Saturday, 19 September 2026
              <br />
              3:00 PM – 5:00 PM
              <br />
              Bingemans Bowling Lounge
              <br />
              Kitchener, Ontario
            </p>
            <p
              className="m-0 text-[color:var(--text-secondary)]"
              style={{ fontSize: "var(--text-small)", lineHeight: 1.7 }}
            >
              Bowling shoes, good snacks, and us as newlyweds. Bring your A-game
              or your sense of humor — one of the two.
              <br />
              <br />
              On the house: food and unlimited pops, 1 alcohol drink per guest.
            </p>
          </div>
        </div>
      </section>

      <hr className="h-0 m-0 border-0 border-t border-[var(--border-hairline)]" />

      {/* ── Gallery ── */}
      <section
        id="gallery"
        ref={galleryRef}
        className="px-5 py-13 max-w-280 mx-auto"
        style={revealStyle("gallery")}
      >
        <h6 className="text-[color:var(--text-accent)] mb-3.5">
          Gallery
        </h6>
        <h2
          className="m-0 mb-6"
          style={{ fontSize: "clamp(27px,6vw,32px)" }}
        >
          A few favourites
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
          {GALLERY_PHOTOS.map((photo, i) => (
            <figure
              key={i}
              className="m-0 p-2 bg-[var(--surface-raised)] border border-[var(--border-hairline)] rounded-[var(--radius-md)] cursor-zoom-in hover-accent-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={photo.alt}
                onClick={() => openLightbox(photo.src)}
                className="block w-full aspect-[3/4] object-cover rounded-xs"
                style={{ filter: "sepia(0.1) saturate(0.94)" }}
              />
            </figure>
          ))}
        </div>
      </section>

      <hr className="h-0 m-0 border-0 border-t border-[var(--border-hairline)]" />

      {/* ── Details ── */}
      <section
        id="details"
        ref={detailsRef}
        className="px-5 py-13 max-w-280 mx-auto"
        style={revealStyle("details")}
      >
        <h6 className="text-[color:var(--text-accent)] mb-3.5">
          Good to know
        </h6>
        <h2
          className="m-0 mb-6"
          style={{ fontSize: "clamp(27px,6vw,32px)" }}
        >
          Details
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          <div className="p-5.5 border border-[var(--border-hairline)] rounded-[var(--radius-md)]">
            <h3
              className="m-0 mb-2.5"
              style={{ fontSize: "var(--text-h5)" }}
            >
              What to wear
            </h3>
            <p
              className="m-0 text-[color:var(--text-secondary)]"
              style={{ fontSize: "var(--text-small)", lineHeight: 1.7 }}
            >
              Casual for both events — Yu &amp; Jin will be in shirts and jeans.
              If you suit up and look good in photos, you can beat them.
            </p>
          </div>
          <div className="p-5.5 border border-[var(--border-hairline)] rounded-[var(--radius-md)]">
            <h3
              className="m-0 mb-2.5"
              style={{ fontSize: "var(--text-h5)" }}
            >
              Dietary and accessibility
            </h3>
            <p
              className="m-0 text-[color:var(--text-secondary)]"
              style={{ fontSize: "var(--text-small)", lineHeight: 1.7 }}
            >
              Let us know about any allergies, dietary needs, or accessibility
              requirements in the reply form below and we&rsquo;ll take care of
              it.
            </p>
          </div>
        </div>
      </section>

      <hr className="h-0 m-0 border-0 border-t border-[var(--border-hairline)]" />

      {/* ── RSVP ── */}
      <section
        id="rsvp"
        ref={rsvpRef}
        className="px-5 pt-13 pb-18 max-w-280 mx-auto"
        style={revealStyle("rsvp")}
      >
        <h6 className="text-[color:var(--text-accent)] mb-3.5">RSVP</h6>
        <h2
          className="m-0 mb-2.5"
          style={{ fontSize: "clamp(27px,6vw,32px)" }}
        >
          Let us know which events you are going
        </h2>
        <p
          className="m-0 mb-7 text-[color:var(--text-secondary)]"
          style={{ fontSize: "var(--text-small)", lineHeight: 1.7 }}
        >
          {RSVP_DEADLINE}
        </p>

        <iframe
          src="https://app.youform.com/forms/aoufgkyy"
          title="RSVP form"
          loading="lazy"
          className="w-full block border border-[var(--border-hairline)] rounded-[var(--radius-md)] bg-transparent"
          style={{ height: "clamp(520px,78vh,760px)" }}
        />

        <p
          className="mt-4 text-[color:var(--text-secondary)]"
          style={{ fontSize: "var(--text-small)", lineHeight: 1.7 }}
        >
          Trouble with the form?{" "}
          <a
            href="https://app.youform.com/forms/aoufgkyy"
            target="_blank"
            rel="noopener"
          >
            Open it in a new tab
          </a>
          .
        </p>
      </section>

      {/* ── Footer ── */}
      <footer className="px-5 pb-14">
        <hr className="h-0 max-w-280 mx-auto mb-6 border-0 border-t border-[var(--border-hairline)]" />
        <p
          className="m-0"
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 500,
            fontSize: "var(--text-h5)",
          }}
        >
          Yu &amp; Jin
        </p>
        <h6 className="text-[color:var(--text-muted)] mt-2">
          September 2026 · Waterloo and Kitchener, Ontario
        </h6>
      </footer>
    </div>
  );
}
