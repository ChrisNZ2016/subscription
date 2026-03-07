import { useState, useEffect } from 'react';

interface FloatingCTAProps {
  visible: boolean;
  onGetStarted: () => void;
}

export function FloatingCTA({ visible, onGetStarted }: FloatingCTAProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }

    const handleScroll = () => {
      setShow(window.scrollY > 600);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visible]);

  if (!show) return null;

  return (
    <div className="floating-cta" role="complementary" aria-label="Quick action">
      <div className="floating-cta-inner">
        <p className="floating-cta-text">
          <strong>50% off your first box</strong>
          <span>Try our hypoallergenic kibble risk-free</span>
        </p>
        <button className="btn btn-primary" onClick={onGetStarted}>
          Build Your Plan
        </button>
      </div>
    </div>
  );
}
