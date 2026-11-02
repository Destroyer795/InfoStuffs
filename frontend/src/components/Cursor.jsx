import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import './CustomCursor.css';

/**
 * Custom Cursor for InfoStuffs
 * - Default / Normal / Hover: Bespoke geometric hardware dart with precision tip (Stealth Prism)
 * - Split-Pane Dragging Action: Seamlessly delegates to the authentic system grab/grabbing hand cursor
 * - Strictly Monochromatic / High-Contrast: Adapts to Dark and Light modes
 * - Smaller Devices & Touch: Completely suppressed (< 1024px, phones, tablets)
 */
const CustomCursor = () => {
  const theme = useTheme();
  const isDark = theme?.palette?.mode === 'dark';

  const containerRef = useRef(null);

  const [visible, setVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  // Check if device is a desktop with a fine pointer and viewport >= 1024px
  const [isEligibleDevice, setIsEligibleDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isDesktopWidth = window.innerWidth >= 1024;
    const isFinePointer = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return isDesktopWidth && isFinePointer && !hasTouch;
  });

  // Handle dynamic screen resizing & touch/pen interactions
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkEligibility = () => {
      const isDesktopWidth = window.innerWidth >= 1024;
      const isFinePointer = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
      setIsEligibleDevice(isDesktopWidth && isFinePointer);
    };

    const handlePointerDown = (e) => {
      if (e.pointerType === 'touch') {
        setIsEligibleDevice(false);
      } else if (e.pointerType === 'mouse' && window.innerWidth >= 1024) {
        setIsEligibleDevice(true);
      }
    };

    window.addEventListener('resize', checkEligibility);
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener('resize', checkEligibility);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  // Manage root and body classes
  useEffect(() => {
    if (isEligibleDevice) {
      document.documentElement.classList.add('has-fine-pointer');
      document.body.classList.add('has-fine-pointer');
    } else {
      document.documentElement.classList.remove('has-fine-pointer');
      document.body.classList.remove('has-fine-pointer');
      document.documentElement.classList.remove('cursor-text-mode');
      document.body.classList.remove('cursor-text-mode');
    }

    return () => {
      document.documentElement.classList.remove('has-fine-pointer');
      document.body.classList.remove('has-fine-pointer');
      document.documentElement.classList.remove('cursor-text-mode');
      document.body.classList.remove('cursor-text-mode');
    };
  }, [isEligibleDevice]);

  // Main interaction listeners
  useEffect(() => {
    if (!isEligibleDevice) return;

    const isInteractiveElement = (target) => {
      if (!target || target === document.body || target === document.documentElement) return false;

      if (target.matches && target.matches('input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], input[type="file"], label')) {
        return true;
      }

      if (target.closest('.cursor-hover-target')) return true;
      if (target.closest('a, button, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"]')) return true;
      if (target.closest('.MuiButtonBase-root, .MuiChip-root, .MuiSwitch-root, .MuiMenuItem-root, .MuiSelect-select')) return true;

      const style = window.getComputedStyle(target);
      if (style.cursor === 'pointer' || style.cursor === 'col-resize' || style.cursor === 'grab') return true;

      return false;
    };

    const isTextElement = (target) => {
      if (!target || target === document.body || target === document.documentElement) return false;

      if (target.closest('button, [role="button"], a, [role="link"], .MuiButtonBase-root, .MuiChip-root')) {
        return false;
      }

      if (target.matches && target.matches('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, [contenteditable="true"], [contenteditable=""]')) {
        return true;
      }

      if (target.closest('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, [contenteditable="true"], .rc-md-editor .editor-container .input, .rc-md-editor .editor-container .section')) {
        return true;
      }

      if (target.closest('.selectable-text')) return true;

      return false;
    };

    const updateTextMode = (inText) => {
      setIsTextMode(inText);
      if (inText) {
        document.documentElement.classList.add('cursor-text-mode');
        document.body.classList.add('cursor-text-mode');
      } else {
        document.documentElement.classList.remove('cursor-text-mode');
        document.body.classList.remove('cursor-text-mode');
      }
    };

    let isMouseDown = false;

    // Fast 1:1 hardware position updater
    const updatePosition = (x, y) => {
      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-3px, -3px)`;
      }
    };

    const handlePointerMove = (e) => {
      const { clientX: x, clientY: y } = e;

      updatePosition(x, y);

      if (!visible) setVisible(true);

      const target = e.target;

      const hasSelection = (() => {
        const selection = window.getSelection();
        return !!(selection && !selection.isCollapsed && selection.toString().trim().length > 0);
      })();

      const isActivelySelecting = isMouseDown && hasSelection;
      setIsSelecting(isActivelySelecting);

      const isGrabTarget = !!(target && target.closest && target.closest('.cursor-grab-target'));
      if (isGrabTarget) {
        document.body.classList.add('cursor-grab-hover');
      } else {
        document.body.classList.remove('cursor-grab-hover');
      }

      if (isTextElement(target) && !isMouseDown) {
        updateTextMode(true);
        setIsHovering(false);
      } else if (isInteractiveElement(target)) {
        updateTextMode(false);
        setIsHovering(true);
      } else {
        updateTextMode(false);
        setIsHovering(false);
      }
    };

    const handlePointerDown = (e) => {
      isMouseDown = true;
      setIsClicking(true);

      document.documentElement.classList.add('is-mouse-down');
      document.body.classList.add('is-mouse-down');

      const selection = window.getSelection();
      const hasSelection = !!(selection && !selection.isCollapsed && selection.toString().trim().length > 0);
      setIsSelecting(hasSelection);
      updateTextMode(false);

      if (e.clientX !== undefined && e.clientY !== undefined) {
        updatePosition(e.clientX, e.clientY);
      }
    };

    const handlePointerUp = () => {
      isMouseDown = false;
      setIsClicking(false);
      setIsSelecting(false);

      document.documentElement.classList.remove('is-mouse-down');
      document.body.classList.remove('is-mouse-down');
      document.body.classList.remove('cursor-grab-hover');

      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (isTextElement(active)) {
          updateTextMode(true);
        } else {
          updateTextMode(false);
        }
      });
    };

    const handleMouseLeave = (e) => {
      if (
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        setVisible(false);
        updateTextMode(false);
      }
    };

    const handleMouseEnter = () => {
      setVisible(true);
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const hasSelection = !!(selection && !selection.isCollapsed && selection.toString().trim().length > 0);
      setIsSelecting(hasSelection && isMouseDown);

      if (!hasSelection) {
        const active = document.activeElement;
        if (!isTextElement(active)) {
          updateTextMode(false);
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        updateTextMode(false);
      }
    };

    const handleFocusOut = () => {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!isTextElement(active)) {
          updateTextMode(false);
        }
      });
    };

    const handleWheel = () => {
      if (!isMouseDown && !isTextElement(document.activeElement)) {
        updateTextMode(false);
      }
    };

    // Multi-layer capture listeners guarantees ZERO freeze across any drag
    window.addEventListener('mousemove', handlePointerMove, { passive: true, capture: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true, capture: true });
    document.addEventListener('mousemove', handlePointerMove, { passive: true, capture: true });
    document.addEventListener('pointermove', handlePointerMove, { passive: true, capture: true });

    window.addEventListener('mousedown', handlePointerDown, { capture: true });
    window.addEventListener('pointerdown', handlePointerDown, { capture: true });

    window.addEventListener('mouseup', handlePointerUp, { capture: true });
    window.addEventListener('pointerup', handlePointerUp, { capture: true });
    window.addEventListener('pointercancel', handlePointerUp, { capture: true });

    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('focusout', handleFocusOut, { capture: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove, { capture: true });
      window.removeEventListener('pointermove', handlePointerMove, { capture: true });
      document.removeEventListener('mousemove', handlePointerMove, { capture: true });
      document.removeEventListener('pointermove', handlePointerMove, { capture: true });

      window.removeEventListener('mousedown', handlePointerDown, { capture: true });
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });

      window.removeEventListener('mouseup', handlePointerUp, { capture: true });
      window.removeEventListener('pointerup', handlePointerUp, { capture: true });
      window.removeEventListener('pointercancel', handlePointerUp, { capture: true });

      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('focusout', handleFocusOut, { capture: true });
      window.removeEventListener('wheel', handleWheel);
      document.removeEventListener('selectionchange', handleSelectionChange);
      updateTextMode(false);
    };
  }, [isEligibleDevice, visible]);

  if (!isEligibleDevice) return null;

  const isHidden = !visible || (isTextMode && !isSelecting);

  return (
    <div
      ref={containerRef}
      className={`vault-cursor-wrapper ${isDark ? 'vault-cursor-dark' : 'vault-cursor-light'} ${isHovering ? 'is-hovering' : ''} ${isClicking ? 'is-clicking' : ''} ${isSelecting ? 'is-selecting' : ''}`}
      style={{
        opacity: isHidden ? 0 : 1,
        visibility: isHidden ? 'hidden' : 'visible'
      }}
      aria-hidden="true"
    >
      {/* Stealth Prism: Default geometric dart cursor */}
      <svg
        className="vault-cursor-svg"
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Precision Dart Pointer */}
        <path
          className="prism-body"
          d="M 3 3 L 19 9 L 12 12 L 9 19 Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill={isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)'}
        />
        {/* Inner Core Notch */}
        <polygon
          className="prism-core"
          points="6,6 12,8 8,12"
          fill="currentColor"
          opacity="0.3"
        />
      </svg>
    </div>
  );
};

export default CustomCursor;
