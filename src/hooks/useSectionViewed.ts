import { useEffect, useRef } from 'react';
import { trackSectionViewed } from '../lib/analytics';

/** Fire once when a section scrolls into view. */
export function useSectionViewed(sectionId: string, section: string) {
  const tracked = useRef(false);

  useEffect(() => {
    tracked.current = false;
    const el = document.getElementById(sectionId);
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true;
          trackSectionViewed({ section });
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [sectionId, section]);
}
