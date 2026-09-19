import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import './CustomScrollbar.css';

/**
 * Custom Monochromatic Vault Scrollbar
 * - Replaces native browser scrollbars with custom DOM elements
 * - Completely avoids Chromium's native scrollbar OS arrow cursor
 * - Works 100% seamlessly with Stealth Prism custom cursor
 * - Supports both vertical and horizontal scrolling
 * - Dynamic & responsive: dynamically hides when content fits, shows when overflowing
 * - Fully responsive across device widths
 */
const CustomScrollbar = ({ 
  targetRef, 
  global = false, 
  horizontal = false,
  watch, 
  className = '' 
}) => {
  const theme = useTheme();
  const isDark = theme?.palette?.mode === 'dark';

  const trackRef = useRef(null);
  const thumbRef = useRef(null);

  const [hasScroll, setHasScroll] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Drag tracking state
  const dragInfo = useRef({
    startX: 0,
    startY: 0,
    startScroll: 0,
    scrollRatio: 1,
    active: false,
  });

  const getTarget = useCallback(() => {
    if (global || !targetRef) {
      return typeof document !== 'undefined' ? (document.scrollingElement || document.documentElement) : null;
    }
    return targetRef.current;
  }, [global, targetRef]);

  // Synchronize thumb size and position with target scroll dimensions
  const updateThumb = useCallback(() => {
    const target = getTarget();
    if (!target) return;

    if (horizontal) {
      const scrollWidth = target.scrollWidth;
      const clientWidth = target.clientWidth;
      const scrollLeft = target.scrollLeft;

      const canScroll = scrollWidth > clientWidth + 2;
      setHasScroll(canScroll);

      const track = trackRef.current;
      const thumb = thumbRef.current;
      if (!track || !thumb || !canScroll) return;

      const trackWidth = track.clientWidth;
      if (trackWidth <= 0) return;

      // Proportional thumb width with a 24px minimum
      const thumbWidth = Math.max(24, Math.min(trackWidth - 4, (clientWidth / scrollWidth) * trackWidth));
      thumb.style.width = `${thumbWidth}px`;

      const maxScroll = scrollWidth - clientWidth;
      const maxTrack = trackWidth - thumbWidth;

      if (maxScroll > 0 && maxTrack > 0) {
        const scrollRatio = maxScroll / maxTrack;
        dragInfo.current.scrollRatio = scrollRatio;

        const thumbLeft = Math.max(0, Math.min(maxTrack, (scrollLeft / maxScroll) * maxTrack));
        thumb.style.transform = `translate3d(${thumbLeft}px, 0, 0)`;
      } else {
        thumb.style.transform = 'translate3d(0, 0, 0)';
      }
      return;
    }

    // Vertical mode
    let scrollHeight = 0;
    let clientHeight = 0;
    let scrollTop = 0;

    if (global || !targetRef) {
      const doc = document.documentElement;
      const body = document.body;
      scrollHeight = Math.max(
        doc ? doc.scrollHeight : 0,
        body ? body.scrollHeight : 0
      );
      clientHeight = window.innerHeight || (doc ? doc.clientHeight : 0);
      scrollTop = window.scrollY || window.pageYOffset || (doc ? doc.scrollTop : 0) || (body ? body.scrollTop : 0);
    } else {
      scrollHeight = target.scrollHeight;
      clientHeight = target.clientHeight;
      scrollTop = target.scrollTop;
    }

    const canScroll = scrollHeight > clientHeight + 2;
    setHasScroll(canScroll);

    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb || !canScroll) return;

    const trackHeight = track.clientHeight;
    if (trackHeight <= 0) return;

    // Calculate proportional thumb height with a 32px minimum
    const thumbHeight = Math.max(32, Math.min(trackHeight - 8, (clientHeight / scrollHeight) * trackHeight));
    thumb.style.height = `${thumbHeight}px`;

    const maxScroll = scrollHeight - clientHeight;
    const maxTrack = trackHeight - thumbHeight;

    if (maxScroll > 0 && maxTrack > 0) {
      const scrollRatio = maxScroll / maxTrack;
      dragInfo.current.scrollRatio = scrollRatio;

      const thumbTop = Math.max(0, Math.min(maxTrack, (scrollTop / maxScroll) * maxTrack));
      thumb.style.transform = `translate3d(0, ${thumbTop}px, 0)`;
    } else {
      thumb.style.transform = 'translate3d(0, 0, 0)';
    }
  }, [getTarget, global, horizontal, targetRef]);

  // Respond to watch changes (e.g. route changes, data updates, category pill changes)
  useEffect(() => {
    updateThumb();
    const t1 = setTimeout(updateThumb, 50);
    const t2 = setTimeout(updateThumb, 200);
    const t3 = setTimeout(updateThumb, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [watch, updateThumb]);

  // Set up event listeners (scroll, resize, mutation)
  useEffect(() => {
    const cleanups = [];
    let isDisposed = false;

    const attach = () => {
      if (isDisposed) return;
      const target = getTarget();
      if (!target) {
        // Retry shortly in case ref attaches after initial render
        const timer = setTimeout(attach, 50);
        cleanups.push(() => clearTimeout(timer));
        return;
      }

      const handleScroll = () => {
        requestAnimationFrame(updateThumb);
      };

      if (global || !targetRef) {
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });
        window.addEventListener('load', handleScroll, { passive: true });
        cleanups.push(() => {
          window.removeEventListener('scroll', handleScroll);
          window.removeEventListener('resize', handleScroll);
          window.removeEventListener('load', handleScroll);
        });
      } else {
        target.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });
        cleanups.push(() => {
          target.removeEventListener('scroll', handleScroll);
          window.removeEventListener('resize', handleScroll);
        });
      }

      // Monitor size changes
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(updateThumb);
        });
        if (global || !targetRef) {
          if (document.body) resizeObserver.observe(document.body);
          if (document.documentElement) resizeObserver.observe(document.documentElement);
        } else {
          resizeObserver.observe(target);
          if (target.firstElementChild) {
            resizeObserver.observe(target.firstElementChild);
          }
        }
        cleanups.push(() => resizeObserver.disconnect());
      }

      // Monitor content changes (note additions, filter changes, markdown updates, chips)
      if (typeof MutationObserver !== 'undefined') {
        const mutationObserver = new MutationObserver(() => {
          requestAnimationFrame(updateThumb);
        });
        const observeTarget = (global || !targetRef) ? document.body : target;
        if (observeTarget) {
          mutationObserver.observe(observeTarget, {
            childList: true,
            subtree: true,
            characterData: true,
          });
          cleanups.push(() => mutationObserver.disconnect());
        }
      }

      updateThumb();
      const t1 = setTimeout(updateThumb, 50);
      const t2 = setTimeout(updateThumb, 150);
      const t3 = setTimeout(updateThumb, 350);
      const t4 = setTimeout(updateThumb, 700);
      const t5 = setTimeout(updateThumb, 1200);
      cleanups.push(
        () => clearTimeout(t1),
        () => clearTimeout(t2),
        () => clearTimeout(t3),
        () => clearTimeout(t4),
        () => clearTimeout(t5)
      );
    };

    attach();

    return () => {
      isDisposed = true;
      cleanups.forEach((c) => c());
    };
  }, [getTarget, global, horizontal, targetRef, updateThumb]);

  // Handle Dragging
  const handleThumbMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const target = getTarget();
    if (!target) return;

    if (horizontal) {
      const startScroll = target.scrollLeft;
      dragInfo.current = {
        ...dragInfo.current,
        startX: e.clientX,
        startScroll,
        active: true,
      };

      setIsDragging(true);
      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent) => {
        if (!dragInfo.current.active) return;
        const deltaX = moveEvent.clientX - dragInfo.current.startX;
        const newScroll = dragInfo.current.startScroll + deltaX * dragInfo.current.scrollRatio;
        target.scrollLeft = Math.max(0, newScroll);
      };

      const handleMouseUp = () => {
        dragInfo.current.active = false;
        setIsDragging(false);
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return;
    }

    // Vertical drag
    let startScroll = 0;
    if (global || !targetRef) {
      startScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || (document.body ? document.body.scrollTop : 0);
    } else {
      startScroll = target.scrollTop;
    }

    dragInfo.current = {
      ...dragInfo.current,
      startY: e.clientY,
      startScroll,
      active: true,
    };

    setIsDragging(true);
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent) => {
      if (!dragInfo.current.active) return;
      const deltaY = moveEvent.clientY - dragInfo.current.startY;
      const newScroll = dragInfo.current.startScroll + deltaY * dragInfo.current.scrollRatio;

      if (global || !targetRef) {
        window.scrollTo(0, Math.max(0, newScroll));
      } else {
        target.scrollTop = Math.max(0, newScroll);
      }
    };

    const handleMouseUp = () => {
      dragInfo.current.active = false;
      setIsDragging(false);
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Handle Track Click (jump to position)
  const handleTrackClick = (e) => {
    if (e.target === thumbRef.current) return;
    const track = trackRef.current;
    const target = getTarget();
    if (!track || !target) return;

    if (horizontal) {
      const rect = track.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const trackWidth = track.clientWidth;
      if (trackWidth <= 0) return;

      const scrollWidth = target.scrollWidth;
      const clientWidth = target.clientWidth;
      const targetScroll = (clickX / trackWidth) * scrollWidth - clientWidth / 2;
      target.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      return;
    }

    // Vertical click
    const rect = track.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = track.clientHeight;
    if (trackHeight <= 0) return;

    let scrollHeight = 0;
    let clientHeight = 0;
    if (global || !targetRef) {
      const doc = document.documentElement;
      const body = document.body;
      scrollHeight = Math.max(doc ? doc.scrollHeight : 0, body ? body.scrollHeight : 0);
      clientHeight = window.innerHeight || (doc ? doc.clientHeight : 0);
    } else {
      scrollHeight = target.scrollHeight;
      clientHeight = target.clientHeight;
    }

    const targetScroll = (clickY / trackHeight) * scrollHeight - clientHeight / 2;

    if (global || !targetRef) {
      window.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    } else {
      target.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  };

  const orientationClass = horizontal ? 'is-horizontal' : 'is-vertical';

  return (
    <div
      ref={trackRef}
      className={`vault-scrollbar-track ${orientationClass} cursor-hover-target ${global ? 'is-global' : ''} ${isDark ? 'vault-scrollbar-dark' : 'vault-scrollbar-light'} ${hasScroll ? 'is-visible' : ''} ${className}`}
      onClick={handleTrackClick}
      aria-hidden="true"
    >
      <div
        ref={thumbRef}
        className={`vault-scrollbar-thumb ${orientationClass} cursor-hover-target ${isDragging ? 'is-dragging' : ''}`}
        onMouseDown={handleThumbMouseDown}
      />
    </div>
  );
};

export default CustomScrollbar;
