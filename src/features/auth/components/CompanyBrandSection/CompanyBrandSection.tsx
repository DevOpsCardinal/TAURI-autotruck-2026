import { useState, useEffect, useRef } from 'react';
import styles from './CompanyBrandSection.module.css';

const SLIDE_INTERVAL_MS = 6000;

interface CompanyBrandSectionProps {
  logoSrc: string;
  images: string[];
  companyName: string;
  tagline: string;
}

export function CompanyBrandSection({
  logoSrc,
  images,
  companyName,
  tagline,
}: CompanyBrandSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, SLIDE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [images.length]);

  return (
    <div className={styles.panel}>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          className={`${styles.slide} ${i === activeIndex ? styles.slideActive : ''}`}
        />
      ))}
      <div className={styles.overlay} />
      <div className={styles.content}>
        <img src={logoSrc} alt={`Logo ${companyName}`} className={styles.logo} />
        <h1 className={styles.companyName}>{companyName}</h1>
        <hr className={styles.divider} />
        <p className={styles.tagline}>{tagline}</p>
      </div>
    </div>
  );
}
