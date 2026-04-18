import { useEffect } from 'react';

/**
 * Adds `.is-visible` to elements with `.animate-on-scroll` or `.animate-stagger`
 * when they enter the viewport.
 */
export function useScrollAnimation() {
  useEffect(() => {
    const selectors = '.animate-on-scroll, .animate-stagger';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '40px 0px -20px 0px' },
    );

    const observe = () => {
      document.querySelectorAll(selectors).forEach((el) => observer.observe(el));
    };

    // Use rAF to ensure DOM is painted before observing
    const raf = requestAnimationFrame(() => {
      observe();
    });

    // Re-scan after a brief delay to catch dynamically rendered sections
    const timer = setTimeout(observe, 400);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);
}
