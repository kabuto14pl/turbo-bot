"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTouchGestures = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const react_1 = require("react");
const useTouchGestures = (handlers) => {
    const ref = (0, react_1.useRef)(null);
    const [touchStart, setTouchStart] = (0, react_1.useState)(null);
    const [isLongPress, setIsLongPress] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const element = ref.current;
        if (!element)
            return;
        let longPressTimer;
        const handleTouchStart = (e) => {
            const touch = e.touches[0];
            const startTime = Date.now();
            setTouchStart({
                x: touch.clientX,
                y: touch.clientY,
                time: startTime
            });
            setIsLongPress(false);
            // Start long press timer
            longPressTimer = setTimeout(() => {
                setIsLongPress(true);
                handlers.onLongPress?.();
            }, 500);
        };
        const handleTouchMove = (e) => {
            // Cancel long press if user moves finger
            clearTimeout(longPressTimer);
            setIsLongPress(false);
        };
        const handleTouchEnd = (e) => {
            clearTimeout(longPressTimer);
            if (!touchStart || isLongPress)
                return;
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStart.x;
            const deltaY = touch.clientY - touchStart.y;
            const deltaTime = Date.now() - touchStart.time;
            const minSwipeDistance = 50;
            const maxSwipeTime = 300;
            // Check for tap
            if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 200) {
                handlers.onTap?.();
                return;
            }
            // Check for swipe
            if (deltaTime < maxSwipeTime) {
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                    // Horizontal swipe
                    if (deltaX > 0) {
                        handlers.onSwipeRight?.();
                    }
                    else {
                        handlers.onSwipeLeft?.();
                    }
                }
                else if (Math.abs(deltaY) > minSwipeDistance) {
                    // Vertical swipe
                    if (deltaY > 0) {
                        handlers.onSwipeDown?.();
                    }
                    else {
                        handlers.onSwipeUp?.();
                    }
                }
            }
            setTouchStart(null);
        };
        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: true });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });
        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            clearTimeout(longPressTimer);
        };
    }, [handlers, touchStart, isLongPress]);
    return ref;
};
exports.useTouchGestures = useTouchGestures;
