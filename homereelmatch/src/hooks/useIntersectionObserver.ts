"use client";

import { useEffect, useRef } from "react";

export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) callback();
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [callback, options]);

  return ref;
}
