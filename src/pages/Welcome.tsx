import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import uwaziPinwheel from '@/assets/uwazi-pinwheel.png'

const SLIDES = [
  {
    id: 0,
    eyebrow: 'CIVIC INTELLIGENCE PLATFORM',
    icon: '🏛️',
    headline: 'BUILD YOUR\nCIVIC FREEDOM.',
    sub: 'UWAZI is your all-in-one civic companion — nonpartisan, AI-powered, and built around your community.',
    statNum: '40K+',
    statLabel: 'elected offices up for election in 2026',
    accent: '#9bd34b',
    bg: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(155,211,75,0.12) 0%, transparent 65%), radial-gradient(ellipse 50% 70% at 70% 30%, rgba(155,211,75,0.05) 0%, transparent 70%)',
    peekLabel: 'Platform',
  },
  {
    id: 1,
    eyebrow: 'FEATURE 1 OF 4 · ASK UWAZI',
    icon: '💬',
    headline: 'ASK ANYTHING\nABOUT YOUR GOVT.',
    sub: 'Get instant, nonpartisan answers to any civic question — how a bill works, who your reps voted for, what your rights are.',
    statNum: '100%',
    statLabel: 'nonpartisan, every answer, every time',
    accent: '#9bd34b',
    bg: 'radial-gradient(ellipse 80% 60% at 15% 55%, rgba(155,211,75,0.1) 0%, transparent 65%), radial-gradient(ellipse 40% 60% at 75% 25%, rgba(155,211,75,0.04) 0%, transparent 60%)',
    peekLabel: 'Ask AI',
  },
  {
    id: 2,
    eyebrow: 'FEATURE 2 OF 4 · LEARN & EARN',
    icon: '📚',
    headline: 'EARN XP.\nRAISE YOUR SCORE.',
    sub: 'Short Duolingo-style civic lessons. Build streaks, unlock badges, and raise your Civic Literacy Score — one lesson at a time.',
    statNum: '13+',
    statLabel: 'civic lesson tracks built for your community',
    accent: '#3b82f6',
    bg: 'radial-gradient(ellipse 80% 60% at 15% 55%, rgba(59,130,246,0.1) 0%, transparent 65%), radial-gradient(ellipse 40% 60% at 75% 25%, rgba(59,130,246,0.04) 0%, transparent 60%)',
    peekLabel: 'Learn',
  },
  {
    id: 3,
    eyebrow: 'FEATURE 3 OF 4 · VOTING HUB',
    icon: '🗳️',
    headline: 'NEVER MISS\nYOUR VOTE.',
    sub: 'See your candidates, find your polling place, track your ballot, and build a voting plan. Everything you need to show up.',
    statNum: '103',
    statLabel: 'days until the next primary in your area',
    accent: '#f97316',
    bg: 'radial-gradient(ellipse 80% 60% at 15% 55%, rgba(249,115,22,0.1) 0%, transparent 65%), radial-gradient(ellipse 40% 60% at 75% 25%, rgba(249,115,22,0.04) 0%, transparent 60%)',
    peekLabel: 'Vote',
  },
  {
    id: 4,
    eyebrow: 'FEATURE 4 OF 4 · LEGISLATION',
    icon: '📄',
    headline: 'FOLLOW THE BILLS\nTHAT AFFECT YOU.',
    sub: 'Track real bills in Congress. Get plain-language summaries, see how legislation affects your ZIP code, and watch the votes that matter.',
    statNum: '10+',
    statLabel: 'live federal bills tracked and summarized right now',
    accent: '#14b8a6',
    bg: 'radial-gradient(ellipse 80% 60% at 15% 55%, rgba(20,184,166,0.1) 0%, transparent 65%), radial-gradient(ellipse 40% 60% at 75% 25%, rgba(20,184,166,0.04) 0%, transparent 60%)',
    peekLabel: 'Laws',
  },
]

const DURATION = 4500

export default function Welcome() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()

  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [direction, setDirection] = useState(1)

  const goToSlide = useCallback(
    (idx: number) => {
      setDirection(idx > current ? 1 : -1)
      setCurrent(idx)
      setProgress(0)
      setPaused(true)
      setTimeout(() => setPaused(false), 8000)
    },
    [current],
  )

  const advance = useCallback(() => {
    setDirection(1)
    setCurrent((prev) => (prev + 1) % SLIDES.length)
    setProgress(0)
  }, [])

  useEffect(() => {
    if (paused || shouldReduceMotion) return
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + (50 / DURATION) * 100
        if (next >= 100) {
          advance()
          return 0
        }
        return next
      })
    }, 50)
    return () => clearInterval(interval)
  }, [paused, shouldReduceMotion, advance])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToSlide(Math.min(SLIDES.length - 1, current + 1))
      if (e.key === 'ArrowLeft') goToSlide(Math.max(0, current - 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, goToSlide])

  const slide = SLIDES[current]

  return (
    <>
      <style>{`@keyframes gridScroll { from { background-position: 0 0; } to { background-position: 48px 48px; } }`}</style>
      <div className="min-h-screen w-full bg-[#0a0a0a] text-white flex flex-col lg:flex-row">
        {/* ─── LEFT PANEL ─── */}
        <div
          className="relative flex-1 min-h-[60vh] lg:min-h-screen overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Animated background gradient */}
          <motion.div
            key={`bg-${slide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
            className="absolute inset-0"
            style={{ background: slide.bg }}
          />

          {/* Scrolling grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              animation: shouldReduceMotion ? 'none' : 'gridScroll 24s linear infinite',
            }}
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }}
          />

          {/* Slide content */}
          <div className="relative z-10 h-full flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-16 lg:py-0">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={slide.id}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ opacity: 0, y: d > 0 ? 24 : -24 }),
                  center: { opacity: 1, y: 0 },
                  exit: (d: number) => ({ opacity: 0, y: d > 0 ? -16 : 16 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: 'easeOut' }}
                className="max-w-2xl"
              >
                <div
                  className="text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] mb-6"
                  style={{ color: slide.accent }}
                >
                  {slide.eyebrow}
                </div>

                <div className="text-5xl sm:text-6xl mb-6">{slide.icon}</div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[0.95] tracking-tight whitespace-pre-line mb-6">
                  {slide.headline}
                </h1>

                <p className="text-base sm:text-lg text-white/60 leading-relaxed max-w-xl mb-10">
                  {slide.sub}
                </p>

                <div
                  className="inline-flex items-center gap-4 py-4 px-5 rounded-2xl border bg-white/[0.03] mb-6"
                  style={{ borderColor: `${slide.accent}33` }}
                >
                  <div className="text-3xl sm:text-4xl font-black" style={{ color: slide.accent }}>
                    {slide.statNum}
                  </div>
                  <div className="text-xs sm:text-sm text-white/60 max-w-[200px] leading-snug">
                    {slide.statLabel}
                  </div>
                </div>

                {/* Inline primary CTA — always visible alongside the story */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigate('/signup')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#9bd34b] hover:bg-[#aee06a] text-black font-bold text-sm transition-colors shadow-[0_8px_24px_-8px_rgba(155,211,75,0.5)]"
                  >
                    Sign up free →
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-white/70 hover:text-white text-sm font-semibold transition-colors"
                  >
                    I have an account
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide nav */}
          <div className="absolute bottom-8 left-8 sm:left-12 lg:left-20 right-8 sm:right-12 lg:right-20 z-20 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1 rounded-full transition-all duration-500 cursor-pointer ${
                    i === current
                      ? 'w-7 bg-[#9bd34b]'
                      : i < current
                        ? 'w-1.5 bg-[#9bd34b]/40'
                        : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToSlide(Math.max(0, current - 1))}
                disabled={current === 0}
                aria-label="Previous slide"
                className="w-9 h-9 rounded-full border border-white/[0.07] bg-white/[0.04] flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToSlide(Math.min(SLIDES.length - 1, current + 1))}
                disabled={current === SLIDES.length - 1}
                aria-label="Next slide"
                className="w-9 h-9 rounded-full border border-white/[0.07] bg-white/[0.04] flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div className="w-full lg:w-[440px] lg:min-h-screen border-t lg:border-t-0 lg:border-l border-white/[0.07] bg-[#0a0a0a] flex items-center">
          <div className="w-full px-8 sm:px-10 py-10 lg:py-14 space-y-7">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img src={uwaziPinwheel} alt="UWAZI" className="w-8 h-8 object-contain" />
              <span className="text-sm font-bold tracking-wide">UWAZI.AI</span>
            </div>

            {/* Feature peek cards */}
            <div className="grid grid-cols-5 gap-1.5">
              {SLIDES.map((s, i) => (
                <motion.button
                  key={s.id}
                  onClick={() => goToSlide(i)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all duration-200 cursor-pointer ${
                    i === current
                      ? 'border-[#9bd34b]/40 bg-[#9bd34b]/[0.07]'
                      : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="text-[9px] font-semibold tracking-wide text-white/60">
                    {s.peekLabel}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight whitespace-pre-line">
                {`YOUR CIVIC JOURNEY\nSTARTS HERE.`}
              </h2>
              <p className="text-sm text-white/50 leading-relaxed whitespace-pre-line">
                {`Free to join. Nonpartisan by design.\nBuilt for your community.`}
              </p>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-white/60">
                ✓ Always free
              </span>
              <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-white/60">
                ✓ 100% nonpartisan
              </span>
              <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-white/60">
                ✓ No credit card required
              </span>
            </div>

            {/* Slide sync dots */}
            <div className="flex items-center gap-1">
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                    i === current ? 'bg-[#9bd34b]' : i < current ? 'bg-[#9bd34b]/30' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* CTA buttons */}
            <div className="space-y-2.5">
              <div className="relative">
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full py-3.5 bg-[#9bd34b] hover:bg-[#aee06a] text-black font-bold rounded-xl text-sm transition-colors overflow-hidden relative"
                >
                  Get Started — It's Free →
                  <div
                    className="absolute bottom-0 left-0 h-0.5 bg-black/30 transition-[width] duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </button>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] hover:border-white/15 text-white/60 hover:text-white rounded-xl text-sm transition-all"
              >
                I already have an account
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.07]" />

            {/* Legal */}
            <p className="text-[10px] text-white/35 leading-relaxed whitespace-pre-line">
              {`By continuing you agree to our `}
              <a href="/terms" className="underline hover:text-white/60">
                Terms
              </a>
              {` and `}
              <a href="/privacy" className="underline hover:text-white/60">
                Privacy Policy
              </a>
              {`.\nYour civic data is never sold. Ever.`}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
