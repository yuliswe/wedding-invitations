"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Disc3 } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

const STORY_PHOTOS = [
  { src: `${BASE}/assets/story-photo.webp`, alt: "Yu and Jin" },
  { src: `${BASE}/assets/photo-pei.jpeg`, alt: "Yu and Jin on the red cliffs" },
  { src: `${BASE}/assets/photo-lighthouse.jpeg`, alt: "Yu and Jin at the lighthouse" },
  { src: `${BASE}/assets/photo-closeup.jpeg`, alt: "Yu and Jin, close up" },
  { src: `${BASE}/assets/photo-peace.jpeg`, alt: "Yu and Jin in the sun" },
  { src: `${BASE}/assets/photo-newyear.jpeg`, alt: "Yu and Jin at new year" },
  { src: `${BASE}/assets/photo-bridge.jpeg`, alt: "Yu and Jin on the stone bridge" },
];

const GALLERY_PHOTOS = Array.from({ length: 9 }, (_, i) => ({
  src: `${BASE}/assets/g${i + 1}.jpeg`,
  alt: "Yu and Jin",
}));

const WEDDING_DATE = new Date("2026-09-15T13:00:00");
const RSVP_DEADLINE = "Please respond by Friday, September 4, 2026 - we need to book the bowling lanes.";

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
  const fadeRef = useRef<number | null>(null);
  const gestureJustFiredRef = useRef(false);
  const progressRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const storyStackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const lightboxImgRef = useRef<HTMLImageElement>(null);
  const currentSectionRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLButtonElement>(null);
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

  const startFadeIn = useCallback((audio: HTMLAudioElement) => {
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    audio.volume = 0;
    audio.play().catch(() => {});
    setPlaying(true);
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 4000);
      audio.volume = p;
      if (p < 1) fadeRef.current = requestAnimationFrame(step);
      else fadeRef.current = null;
    };
    fadeRef.current = requestAnimationFrame(step);
  }, []);

  const togglePlay = useCallback(() => {
    if (gestureJustFiredRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      startFadeIn(audio);
    } else {
      audio.pause();
      if (fadeRef.current) { cancelAnimationFrame(fadeRef.current); fadeRef.current = null; }
      setPlaying(false);
    }
  }, [startFadeIn]);

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
    // Reveal sections as they scroll into view. Uses a scroll listener
    // instead of IntersectionObserver because iOS Safari can miss
    // observer callbacks after the envelope track collapses and the
    // scroll position is adjusted mid–smooth-scroll.
    const revealedSet = new Set<string>();
    const checkReveals = () => {
      for (const [key, ref] of sections) {
        if (revealedSet.has(key) || !ref.current) continue;
        const r = ref.current.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.88) {
          revealedSet.add(key);
          setRevealed((s) => ({ ...s, [key]: true }));
        }
      }
    };
    window.addEventListener("scroll", checkReveals, { passive: true });
    checkReveals();

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

    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", trackCurrentSection);
      window.removeEventListener("scroll", checkReveals);
      if (scrollTick) cancelAnimationFrame(scrollTick);
      clearTimeout(fitRetry);
      clearTimeout(collapseTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Auto-play with fade-in on first user interaction. iOS Safari
    // requires touchend or click; touchstart does not qualify.
    let started = false;
    const gestures = ["touchend", "pointerup", "click", "keydown"];
    const onGesture = () => {
      if (started || !audio.paused) return;
      started = true;
      gestures.forEach(e => window.removeEventListener(e, onGesture, true));
      // Suppress togglePlay in the same event so the button click
      // doesn't immediately pause what the gesture just started.
      gestureJustFiredRef.current = true;
      queueMicrotask(() => { gestureJustFiredRef.current = false; });
      startFadeIn(audio);
    };
    gestures.forEach(e => window.addEventListener(e, onGesture, { capture: true }));

    const onPause = () => setPlaying(false);
    audio.addEventListener("pause", onPause);

    return () => {
      gestures.forEach(e => window.removeEventListener(e, onGesture, true));
      audio.removeEventListener("pause", onPause);
    };
  }, [startFadeIn]);

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
    left: "calc(-1 * clamp(0.5rem,2.2vw,0.875rem))",
    right: "calc(-1 * clamp(0.5rem,2.2vw,0.875rem))",
    top: "clamp(1.125rem,4vw,1.625rem)",
    height: "clamp(3.875rem,16vw,6.75rem)",
    filter:
      "drop-shadow(0 0.125rem 0.25rem color-mix(in srgb, var(--color-neutral-900) 16%, transparent)) drop-shadow(0 1px 1px color-mix(in srgb, var(--color-neutral-900) 12%, transparent))",
    ...(opened
      ? { transform: "rotateX(-168deg)", opacity: 0.62, zIndex: 0 }
      : { transform: "rotateX(0deg)", opacity: 1, zIndex: 0 }),
  };

  const cardStyle: React.CSSProperties = {
    padding: "clamp(0.375rem,1.6vw,0.5625rem)",
    ...(opened
      ? { transform: "translateY(0) scale(1)", opacity: 1 }
      : { transform: "translateY(3.625rem) scale(0.965)", opacity: 0 }),
  };

  return (
    <div className="bg-surface-page text-text-primary min-h-dvh">
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
            className="max-w-full max-h-full object-contain rounded-md shadow-lg"
          />
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Close"
            className="absolute top-4 right-4 w-tap h-tap inline-flex items-center justify-center bg-transparent rounded-md text-neutral-100 leading-none cursor-pointer font-body"
            style={{
              border: "1px solid color-mix(in srgb, var(--color-neutral-100) 40%, transparent)",
              fontSize: "1.25rem",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Hero / Envelope ── */}
      <section
        ref={trackRef}
        className="relative border-b border-border-hairline h-[260vh]"
      >
        <div
          ref={stageRef}
          className="sticky top-0 isolate flex flex-col justify-center overflow-hidden"
          style={{
            padding: "clamp(0.875rem,3vh,2.125rem) 1.25rem",
            height: "100svh",
            animation: "ledger-rise var(--duration-rise) var(--easing) both",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${BASE}/assets/hero-illustration.webp`}
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
              style={{ perspective: "87.5rem" }}
            >
              {/* Envelope back */}
              <div
                className="absolute z-[1] overflow-hidden rounded-sm"
                style={{
                  left: "calc(-1 * clamp(0.5rem,2.2vw,0.875rem))",
                  right: "calc(-1 * clamp(0.5rem,2.2vw,0.875rem))",
                  top: "clamp(1.125rem,4vw,1.625rem)",
                  bottom: "calc(-1 * clamp(1.875rem,7vw,3rem))",
                  background: "#7f1934",
                  border: "1px solid #5d1327",
                  boxShadow:
                    "0 1.125rem 2.375rem color-mix(in srgb, var(--color-neutral-900) 30%, transparent), 0 0.25rem 0.625rem color-mix(in srgb, var(--color-neutral-900) 20%, transparent)",
                }}
              >
                <div className="absolute inset-2.25 border-2 border-[#e6c489]" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BASE}/assets/rose-floral-flourish.svg`}
                  alt=""
                  className="absolute top-1 right-1 w-[64%] opacity-[0.92]"
                  style={{ transform: "translate(21.5%, 18%) rotate(-270deg) scaleX(-1)" }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BASE}/assets/deco-stamp.svg`}
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
                  src={`${BASE}/assets/Chinese-Wedding-Symbol.svg`}
                  alt="Double happiness"
                  className="block h-auto"
                  style={{ width: "clamp(5.625rem,24vw,9.375rem)" }}
                />
                <span
                  className="h-px"
                  style={{
                    width: "clamp(3.75rem,16vw,6.5rem)",
                    background: "color-mix(in srgb, var(--color-accent) 60%, transparent)",
                  }}
                />
                <span
                  className="uppercase text-accent-300 font-body font-semibold"
                  style={{
                    fontSize: "clamp(0.5625rem,2.4vw,0.75rem)",
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
                  className="absolute inset-0 bg-accent"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 40%, 76% 100%, 24% 100%, 0 40%)" }}
                />
                <div
                  className="absolute left-[1.5px] right-[1.5px] top-0 bottom-[1.5px] bg-[#761730] overflow-hidden"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 40%, 76% 100%, 24% 100%, 0 40%)" }}
                />
              </div>

              {/* Scroll hint */}
              <button
                ref={hintRef}
                type="button"
                aria-label="Open invitation"
                className="absolute left-0 right-0 bottom-[4%] z-[4] flex flex-col items-center gap-3 bg-transparent border-none cursor-pointer"
                style={opened ? { opacity: 0, visibility: "hidden", pointerEvents: "none" } : undefined}
                onClick={() => {
                  const track = trackRef.current;
                  if (!track) return;
                  window.scrollTo({ top: track.offsetTop + track.offsetHeight - window.innerHeight, behavior: "smooth" });
                }}
              >
                <span
                  className="uppercase text-accent-200 font-body font-semibold"
                  style={{
                    fontSize: "clamp(0.75rem,3vw,0.9375rem)",
                    letterSpacing: "0.18em",
                  }}
                >
                  Scroll to open
                </span>
                <span
                  className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-accent-200 leading-none font-body"
                  style={{
                    border: "1.5px solid var(--color-accent-300)",
                    fontSize: "1.375rem",
                    animation: "scrollHint 1.8s ease-in-out infinite",
                  }}
                >
                  ↓
                </span>
              </button>

              {/* Invitation card */}
              <div ref={cardRef} className="relative z-[3] bg-neutral-100 border border-border-hairline rounded-sm shadow-sm" style={cardStyle}>
                <div
                  className="absolute inset-0 pointer-events-none rounded-[inherit] opacity-20"
                  style={{
                    mixBlendMode: "multiply",
                    backgroundImage: GRAIN_TEXTURE,
                  }}
                />
                <div
                  className="relative text-center border border-border-accent-300"
                  style={{ padding: "clamp(1.75rem,6.5vw,2.875rem) clamp(1.125rem,5vw,2.125rem) clamp(1.625rem,5.5vw,2.625rem)" }}
                >
                  <h6 className="text-text-accent">You are invited</h6>
                  <p
                    className="uppercase text-text-muted mt-1.5 text-xs tracking-[0.08em] font-body"
                  >
                    to the wedding of
                  </p>

                  <div className="flex items-center gap-3.5 my-6.5">
                    <span className="flex-1 h-px bg-accent-300" />
                    <span
                      className="leading-none text-accent text-sm font-heading"
                    >
                      ✦
                    </span>
                    <span className="flex-1 h-px bg-accent-300" />
                  </div>

                  <h1
                    className="m-0 pb-[0.12em]"
                    style={{
                      fontFamily: "'Pinyon Script', 'Newsreader', Georgia, serif",
                      fontWeight: 400,
                      fontSize: "clamp(2.75rem,11vw,4.25rem)",
                      lineHeight: 1.08,
                      letterSpacing: 0,
                    }}
                  >
                    Yu <span className="text-accent">&amp;</span>{" "}
                    Jin
                  </h1>

                  <p
                    className="text-text-primary"
                    style={{
                      fontSize: "clamp(0.9375rem,4vw,1rem)",
                      lineHeight: 1.75,
                      maxWidth: "46ch",
                      margin: "1.25rem auto 0",
                    }}
                  >
                    The paperwork happens at Waterloo City Hall. The real
                    celebration happens over strikes, spares, and a few gutter
                    balls at Bingemans. Everyone&rsquo;s invited to both.
                  </p>

                  <div className="flex flex-col items-center gap-1 mt-8 pt-6 border-t border-border-accent-300">
                    <span
                      className="leading-none text-accent [font-variant-numeric:tabular-nums_lining-nums] font-heading"
                      style={{
                        fontWeight: 400,
                        fontSize: "clamp(2.375rem,10vw,3.25rem)",
                      }}
                    >
                      {countDisplay}
                    </span>
                    <span
                      className="uppercase text-text-secondary text-xs tracking-[0.08em] font-body"
                    >
                      days until the ceremony
                    </span>
                  </div>

                  <div className="flex gap-3 flex-wrap justify-center mt-7">
                    <a
                      href="#schedule"
                      className="inline-flex items-center justify-center min-h-tap px-5.5 no-underline text-text-primary bg-transparent border border-border-hairline rounded-md hover-accent-border text-control font-semibold font-interactable"
                      style={{
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
      <nav className="sticky top-0 z-20 flex items-center gap-[clamp(0.4375rem,2vw,0.75rem)] px-4 min-h-11 bg-surface-page border-t border-b border-border-hairline">
        <span
          className="whitespace-nowrap flex-none leading-none inline-flex items-center self-center relative top-0.5 font-heading font-medium"
          style={{
            fontSize: "clamp(0.9375rem,4vw,1.0625rem)",
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
            className="inline-flex items-center justify-center w-7 h-7 p-0 bg-transparent border border-border-hairline rounded-md text-accent cursor-pointer hover-state-bg"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <audio ref={audioRef} loop className="hidden" src={`${BASE}/assets/music.mp3`} preload="auto" />
        </div>

        <span
          ref={currentSectionRef}
          className="flex-auto min-w-0 overflow-hidden text-ellipsis whitespace-nowrap uppercase text-text-secondary opacity-0 font-body font-semibold text-xs tracking-overline"
          style={{
            transition: "opacity var(--duration-fade) var(--easing)",
          }}
        />

        <span
          ref={progressRef}
          aria-hidden
          className="absolute left-0 -bottom-px h-px w-0 bg-accent"
        />

        <a
          href="#rsvp"
          className="ml-auto flex-none whitespace-nowrap inline-flex items-center justify-center min-h-7.5 no-underline text-accent-700 bg-transparent border border-accent rounded-md hover-rsvp font-interactable text-control font-semibold"
          data-rsvp-pulse
          style={{
            padding: "0 clamp(0.625rem,2.5vw,0.875rem)",
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
        <h6 className="text-text-accent mb-3.5">
          Our story
        </h6>
        <h2
          className="mb-4.5"
          style={{ fontSize: "clamp(1.6875rem,6vw,2rem)" }}
        >
          How we got here
        </h2>
        <p
          className="m-0 text-text-primary text-base leading-body max-w-measure"
        >
          We&rsquo;re getting married! 💍 ❤️
          <br /><br />
          Our story began with a road trip we were planning to Tobermory, never
          knowing it would lead us somewhere far more beautiful.
          <br /><br />
          We fell in love in the golden days of August, and somewhere between
          then and now, the trails of Kitchener and Waterloo became part of our
          story. We wandered through endless paths, stayed beneath skies filled
          with stars, made wishes on shooting stars, and stood together beneath
          the glow of the Northern Lights.
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
                className="absolute inset-0 m-0 p-2.5 bg-surface-raised border border-border-hairline rounded-md shadow-sm overflow-hidden origin-bottom"
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
              className="text-text-muted [font-variant-numeric:tabular-nums_lining-nums] font-body text-xs"
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
                  className="w-tap h-tap p-0 inline-flex items-center justify-center bg-transparent border border-border-hairline rounded-md text-text-secondary leading-none cursor-pointer font-body"
                  style={{
                    fontSize: "0.9375rem",
                    transition: "border-color var(--duration-fade) var(--easing)",
                  }}
                >
                  {arrow}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p
          className="mt-7 text-text-primary text-base leading-body max-w-measure"
        >
          So many ordinary days became unforgettable memories. So many little
          adventures became a life we now call our own.
          <br /><br />
          And now, we&rsquo;re ready to begin the next chapter of our story
          — together, as husband and wife. ❤️
          <br /><br />
          We&rsquo;ll officially sign our marriage papers at Waterloo City Hall
          on September 15th.
          <br /><br />
          And on September 19th, we&rsquo;ll celebrate with an after-party,
          surrounded by the people we love.
          <br /><br />
          We&rsquo;d be so happy to have our friends there to witness this
          beautiful moment and celebrate with us as we begin forever. 🥂 ✨
        </p>
      </section>

      <hr className="h-0 m-0 border-0 border-t border-border-hairline" />

      {/* ── Schedule ── */}
      <section
        id="schedule"
        ref={scheduleRef}
        className="px-5 py-13 max-w-280 mx-auto"
        style={revealStyle("schedule")}
      >
        <h6 className="text-text-accent mb-3.5">
          Schedule
        </h6>
        <h2
          className="mb-6"
          style={{ fontSize: "clamp(1.6875rem,6vw,2rem)" }}
        >
          You are invited to two events
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          <div className="p-5.5 border border-border-hairline rounded-md hover-accent-border">
            <h6 className="text-text-secondary mb-2.5">
              Event 1
            </h6>
            <h3
              className="mb-3.5 text-h4"
            >
              Wedding Ceremony
            </h3>
            <p
              className="mb-3.5 pb-3.5 [font-variant-numeric:tabular-nums_lining-nums] text-sm leading-[1.7]"
              style={{
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
              className="m-0 text-text-secondary text-sm leading-[1.7]"
            >
              The ceremony is held in City Hall. Please arrive at least 15
              minutes early and check in at the Legislative Services counter on
              the third level. City Hall is a scent-free facility.
            </p>
          </div>

          <div className="p-5.5 border border-border-hairline rounded-md hover-accent-border">
            <h6 className="text-text-secondary mb-2.5">
              Event 2
            </h6>
            <h3
              className="mb-3.5 text-h4"
            >
              Bowling Party
            </h3>
            <p
              className="mb-3.5 pb-3.5 [font-variant-numeric:tabular-nums_lining-nums] text-sm leading-[1.7]"
              style={{
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
              className="m-0 text-text-secondary text-sm leading-[1.7]"
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

      <hr className="h-0 m-0 border-0 border-t border-border-hairline" />

      {/* ── Gallery ── */}
      <section
        id="gallery"
        ref={galleryRef}
        className="px-5 py-13 max-w-280 mx-auto"
        style={revealStyle("gallery")}
      >
        <h6 className="text-text-accent mb-3.5">
          Gallery
        </h6>
        <h2
          className="mb-6"
          style={{ fontSize: "clamp(1.6875rem,6vw,2rem)" }}
        >
          A few favourites
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
          {GALLERY_PHOTOS.map((photo, i) => (
            <figure
              key={i}
              className="m-0 p-2 bg-surface-raised border border-border-hairline rounded-md cursor-zoom-in hover-accent-border"
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

      <hr className="h-0 m-0 border-0 border-t border-border-hairline" />

      {/* ── Details ── */}
      <section
        id="details"
        ref={detailsRef}
        className="px-5 py-13 max-w-280 mx-auto"
        style={revealStyle("details")}
      >
        <h6 className="text-text-accent mb-3.5">
          Good to know
        </h6>
        <h2
          className="mb-6"
          style={{ fontSize: "clamp(1.6875rem,6vw,2rem)" }}
        >
          Details
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          <div className="p-5.5 border border-border-hairline rounded-md">
            <h3
              className="mb-2.5 text-h5"
            >
              What to wear
            </h3>
            <p
              className="m-0 text-text-secondary text-sm leading-[1.7]"
            >
              Casual for both events — Yu &amp; Jin will be in shirts and jeans.
              If you suit up and look good in photos, you can beat them.
            </p>
          </div>
          <div className="p-5.5 border border-border-hairline rounded-md">
            <h3
              className="mb-2.5 text-h5"
            >
              Dietary and accessibility
            </h3>
            <p
              className="m-0 text-text-secondary text-sm leading-[1.7]"
            >
              Let us know about any allergies, dietary needs, or accessibility
              requirements in the reply form below and we&rsquo;ll take care of
              it.
            </p>
          </div>
        </div>
      </section>

      <hr className="h-0 m-0 border-0 border-t border-border-hairline" />

      {/* ── RSVP ── */}
      <section
        id="rsvp"
        ref={rsvpRef}
        className="px-5 pt-13 pb-18 max-w-280 mx-auto"
        style={revealStyle("rsvp")}
      >
        <h6 className="text-text-accent mb-3.5">RSVP</h6>
        <h2
          className="mb-2.5"
          style={{ fontSize: "clamp(1.6875rem,6vw,2rem)" }}
        >
          Let us know which events you are going
        </h2>
        <p
          className="mb-7 text-text-secondary text-sm leading-[1.7]"
        >
          {RSVP_DEADLINE}
        </p>

        <iframe
          src="https://app.youform.com/forms/aoufgkyy"
          title="RSVP form"
          loading="lazy"
          className="w-full block border border-border-hairline rounded-md bg-transparent"
          style={{ height: "clamp(520px,78vh,760px)" }}
        />

        <p
          className="mt-4 text-text-secondary text-sm leading-[1.7]"
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
        <hr className="h-0 max-w-280 mx-auto mb-6 border-0 border-t border-border-hairline" />
        <p
          className="m-0 text-h5 font-heading font-medium"
        >
          Yu &amp; Jin
        </p>
        <h6 className="text-text-muted mt-2">
          September 2026 · Waterloo and Kitchener, Ontario
        </h6>
      </footer>
    </div>
  );
}
