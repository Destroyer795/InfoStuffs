import { useEffect, useRef, useState } from 'react';
import './CustomCursor.css';

const CustomCursor = () => {
  const innerRef = useRef(null);
  const outerRef1 = useRef(null);
  const outerRef2 = useRef(null);

  const mousePosition = useRef({ x: 0, y: 0 });
  const trail1 = useRef({ x: 0, y: 0 });
  const trail2 = useRef({ x: 0, y: 0 });

  const [visible, setVisible] = useState(false);
  const [hasFinePointer, setHasFinePointer] = useState(() => {
    if (typeof window === 'undefined') return false;
    
    // Check if the device has touchscreen capabilities
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isFine = window.matchMedia('(pointer: fine)').matches;
    
    // If it has touch capability, start as false until a mouse is explicitly moved/clicked
    if (hasTouch) return false;
    
    return isFine;
  });

  useEffect(() => {
    const handlePointer = (e) => {
      if (e.pointerType === 'touch') {
        setHasFinePointer(false);
      } else if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        setHasFinePointer(true);
      }
    };

    window.addEventListener('pointerdown', handlePointer, { passive: true });
    window.addEventListener('pointermove', handlePointer, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('pointermove', handlePointer);
    };
  }, []);

  useEffect(() => {
    if (hasFinePointer) {
      document.body.classList.add('has-fine-pointer');
    } else {
      document.body.classList.remove('has-fine-pointer');
    }
  }, [hasFinePointer]);

  useEffect(() => {
    if (!hasFinePointer) return;

    const move = (e) => {
      mousePosition.current = { x: e.clientX, y: e.clientY };
      setVisible(true);

      const target = e.target;
      
      const isInteractive = (() => {
        const computedStyle = window.getComputedStyle(target);
        if (computedStyle.cursor === 'pointer') return true;

        const tagName = target.tagName.toLowerCase();
        const interactiveTags = ['a', 'button', 'input', 'textarea', 'select', 'label'];
        if (interactiveTags.includes(tagName)) return true;

        const role = target.getAttribute('role');
        if (role === 'button' || role === 'combobox' || role === 'option') return true;

        if (target.closest('.cursor-hover-target')) return true;
        
        if (target.closest('.MuiSelect-select') || target.closest('.MuiInputBase-root')) return true;

        return false;
      })();

      if (isInteractive) {
        if (outerRef1.current) outerRef1.current.classList.add('cursor-hovering');
        if (outerRef2.current) outerRef2.current.classList.add('cursor-hovering');
      } else {
        if (outerRef1.current) outerRef1.current.classList.remove('cursor-hovering');
        if (outerRef2.current) outerRef2.current.classList.remove('cursor-hovering');
      }
    };

    const handleMouseOut = (e) => {
      if (!e.relatedTarget && !e.toElement) {
        setVisible(false);
      }
    };

    const handleMouseEnter = () => setVisible(true);

    const handleMouseDown = () => {
      if (outerRef1.current) {
        outerRef1.current.style.opacity = '1';
        outerRef2.current.style.opacity = '0.6';
        outerRef1.current.style.backgroundColor = 'var(--cursor-color)';
        outerRef2.current.style.transition = 'background-color 0.3s ease-out';
      }
    };

    const handleMouseUp = () => {
      if (outerRef1.current) {
        outerRef1.current.style.opacity = '0.2';
        outerRef2.current.style.opacity = '0.1';
        outerRef1.current.style.backgroundColor = 'transparent';
        outerRef2.current.style.transition = 'background-color 0.3s ease-out';
      }
    };

    document.addEventListener('mousemove', move);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', move);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [hasFinePointer]);

  useEffect(() => {
    if (!hasFinePointer) return;
    let animationFrameId;

    const followMouse = () => {
      trail1.current.x += (mousePosition.current.x - trail1.current.x) / 8;
      trail1.current.y += (mousePosition.current.y - trail1.current.y) / 8;

      trail2.current.x += (trail1.current.x - trail2.current.x) / 8;
      trail2.current.y += (trail1.current.y - trail2.current.y) / 8;

      if (visible) {
        if (innerRef.current) {
          innerRef.current.style.left = `${mousePosition.current.x}px`;
          innerRef.current.style.top = `${mousePosition.current.y}px`;
        }
        if (outerRef1.current) {
          outerRef1.current.style.left = `${trail1.current.x}px`;
          outerRef1.current.style.top = `${trail1.current.y}px`;
        }
        if (outerRef2.current) {
          outerRef2.current.style.left = `${trail2.current.x}px`;
          outerRef2.current.style.top = `${trail2.current.y}px`;
        }
      }

      animationFrameId = requestAnimationFrame(followMouse);
    };

    animationFrameId = requestAnimationFrame(followMouse);

    return () => cancelAnimationFrame(animationFrameId);
  }, [hasFinePointer, visible]);

  if (!hasFinePointer) return null;

  return (
    <>
      <div className="cursor-inner" ref={innerRef} style={{ display: visible ? 'block' : 'none' }}></div>
      <div className="cursor-outer1" ref={outerRef1} style={{ display: visible ? 'block' : 'none', opacity: 0.2 }}></div>
      <div className="cursor-outer2" ref={outerRef2} style={{ display: visible ? 'block' : 'none' }}></div>
    </>
  );
};

export default CustomCursor;