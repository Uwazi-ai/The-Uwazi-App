import { useEffect, useRef, useState, useCallback } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Hook that triggers a reveal animation when an element enters the viewport.
 * Once revealed, it stays visible (no re-trigger by default).
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const { threshold = 0.15, rootMargin = "0px 0px -40px 0px", once = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}

/**
 * Component-friendly wrapper: returns className string for scroll-reveal animations.
 * Usage: <div ref={ref} className={revealClass} />
 */
export function useRevealClass<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions & { delay?: number } = {}
) {
  const { delay = 0, ...rest } = options;
  const { ref, isVisible } = useScrollReveal<T>(rest);

  const className = isVisible
    ? "opacity-100 translate-y-0 transition-all duration-700 ease-out"
    : "opacity-0 translate-y-6 transition-all duration-700 ease-out";

  const style = delay > 0 ? { transitionDelay: `${delay}ms` } : undefined;

  return { ref, className, style, isVisible };
}
