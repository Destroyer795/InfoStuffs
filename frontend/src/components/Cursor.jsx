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

useEffect(() => {
const move = (e) => {
    mousePosition.current = { x: e.clientX, y: e.clientY };
    setVisible(true);

    const tag = e.target.tagName.toLowerCase();
    if (tag === 'a' || tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'label' || tag === 'svg' || tag === 'img' || tag === 'video' || e.target.closest('.cursor-hover-target')) {
        if (outerRef1.current) {
        outerRef1.current.classList.add('cursor-hovering');
        }
        if (outerRef2.current) {
        outerRef2.current.classList.add('cursor-hovering');
        }
    } else {
        if (outerRef1.current) {
        outerRef1.current.classList.remove('cursor-hovering');
        }
        if (outerRef2.current) {
        outerRef2.current.classList.remove('cursor-hovering');
        }
    }
};

const handleMouseOut = (e) => {
    if (!e.relatedTarget && !e.toElement) {
    setVisible(false);
    }
};

const handleMouseEnter = () => {
    setVisible(true);
};

const handleMouseDown = () => {
    if (outerRef1.current) {
    outerRef1.current.style.opacity = '1';
    outerRef2.current.style.opacity = '0.6';
    outerRef1.current.style.backgroundColor = 'rgba(255, 108, 216, 1)'
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
}, []);

useEffect(() => {
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
}, [visible]);

return (
<>
    <div
        className="cursor-inner"
        ref={innerRef}
        style={{ display: visible ? 'block' : 'none' }}
    ></div>
    <div
        className="cursor-outer1"
        ref={outerRef1}
        style={{ display: visible ? 'block' : 'none', opacity: 0.2 }}
    ></div>
    <div
        className="cursor-outer2"
        ref={outerRef2}
        style={{ display: visible ? 'block' : 'none' }}
    ></div>
</>
);
};

export default CustomCursor;