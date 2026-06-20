import { useEffect } from 'react';

/** Scroll to the URL hash target after async page content has mounted. */
export function useHashScroll(ready: boolean) {
  useEffect(() => {
    if (!ready) return;

    const id = window.location.hash.replace(/^#/, '');
    if (!id) return;

    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView();
    });
  }, [ready]);
}
