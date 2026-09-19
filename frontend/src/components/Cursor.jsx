import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import './CustomCursor.css';

/**
 * Stealth Prism Custom Cursor for InfoStuffs
 * - Bespoke geometric hardware dart with true precision tip (Teenage Engineering inspired)
 * - Strictly Monochromatic: Crisp pure white in Dark Mode, solid jet black in Light Mode
 * - Normal: Minimalist angular dart with precision tip and subtle negative-space core
 * - Hover: Sleek focus scale and core fill
 * - Click: Sharp mechanical snap with solid fill recoil
 * - Text Selection: Seamlessly hides cursor ONLY when actively hovering real inputs or selecting text
 * - Keyboard / Enter / Dialog close: Auto-exits text mode immediately when Enter is pressed or input loses focus
 * - Scrollbars: Preserves custom cursor smoothly over native and themed scrollbars
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

      // Text fields are text targets, not link targets (unless button/checkbox)
      if (target.matches && target.matches('input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], input[type="file"], label')) {
        return true;
      }

      if (target.closest('.cursor-hover-target')) return true;
      if (target.closest('a, button, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"]')) return true;
      if (target.closest('.MuiButtonBase-root, .MuiChip-root, .MuiSwitch-root, .MuiMenuItem-root, .MuiSelect-select')) return true;

      const style = window.getComputedStyle(target);
      if (style.cursor === 'pointer') return true;

      return false;
    };

    // Specific detector for genuine text inputs/areas (avoids style.cursor === 'text' feedback loop)
    const isTextElement = (target) => {
      if (!target || target === document.body || target === document.documentElement) return false;

      // Interactive components (buttons, links, chips, tabs) take precedence
      if (target.closest('button, [role="button"], a, [role="link"], .MuiButtonBase-root, .MuiChip-root')) {
        return false;
      }

      // Check if target is a genuine text input or editable field
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

    // Track whether user is actively dragging to select text
    let isMouseDown = false;

    const handleMouseMove = (e) => {
      const { clientX: x, clientY: y } = e;

      // 1:1 hardware accelerated movement (zero input lag, tip positioned at cursor coordinates)
      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-3px, -3px)`;
      }

      if (!visible) setVisible(true);

      const target = e.target;

      // Only hide the cursor when actively dragging to select text (mousedown + moving)
      // or when hovering genuine text input fields
      const isActivelySelecting = isMouseDown && (() => {
        const selection = window.getSelection();
        return selection && !selection.isCollapsed && selection.toString().trim().length > 0;
      })();

      if (isTextElement(target)) {
        updateTextMode(true);
        setIsHovering(false);
      } else if (isActivelySelecting) {
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

    const handleMouseDown = () => {
      isMouseDown = true;
      setIsClicking(true);
    };

    const handleMouseUp = () => {
      isMouseDown = false;
      setIsClicking(false);

      // Bring cursor back after finishing a text selection drag
      // (unless the mouse is still over a genuine text input)
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!isTextElement(active)) {
          updateTextMode(false);
        }
      });
    };

    // Only hide if the cursor truly exits the window boundaries (not when touching a scrollbar)
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
      const hasSelection = selection && !selection.isCollapsed && selection.toString().trim().length > 0;

      if (hasSelection && isMouseDown) {
        // Only enter text mode if actively dragging
        updateTextMode(true);
      } else if (!hasSelection) {
        // Selection collapsed (e.g. clicked away) — exit text mode if not in a text input
        const active = document.activeElement;
        if (!isTextElement(active)) {
          updateTextMode(false);
        }
      }
      // If hasSelection && !isMouseDown: selection exists passively (user finished selecting)
      // Keep cursor visible — don't hide it
    };

    // When hitting Enter or Escape (e.g. submitting vault password, closing modal), exit text mode immediately
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        updateTextMode(false);
      }
    };

    // When an input loses focus (e.g. modal closed, tabbed away), verify activeElement
    const handleFocusOut = () => {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!isTextElement(active)) {
          updateTextMode(false);
        }
      });
    };

    // When scrolling, if not actively selecting or in an input, ensure text mode isn't stuck
    const handleWheel = () => {
      if (!isMouseDown && !isTextElement(document.activeElement)) {
        updateTextMode(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true, capture: true });
    window.addEventListener('mousedown', handleMouseDown, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('focusout', handleFocusOut, { capture: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mousedown', handleMouseDown, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
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

  const isHidden = !visible || isTextMode;

  return (
    <div
      ref={containerRef}
      className={`vault-cursor-wrapper ${isDark ? 'vault-cursor-dark' : 'vault-cursor-light'} ${isHovering ? 'is-hovering' : ''} ${isClicking ? 'is-clicking' : ''}`}
      style={{
        opacity: isHidden ? 0 : 1,
        visibility: isHidden ? 'hidden' : 'visible'
      }}
      aria-hidden="true"
    >
      <svg className="vault-cursor-svg" width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
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