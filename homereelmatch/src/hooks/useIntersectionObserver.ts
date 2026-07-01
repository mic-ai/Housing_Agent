"use client";

import { useEffect, useRef } from "react";

export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep options stable — callers passing inline literals shouldn't re-trigger the effect
  const optionsRef = useRef(options);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) callback();
    }, optionsRef.current);

    observer.observe(el);
    return () => observer.disconnect();
  }, [callback]);

  return ref;
}
