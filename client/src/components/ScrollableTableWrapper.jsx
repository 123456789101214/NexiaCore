import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ScrollableTableWrapper({ children }) {
    const scrollRef = useRef(null);
    const animationFrame = useRef(null);
    
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    
    // UI states for shadows and buttons
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScrollability = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
        }
    };

    useEffect(() => {
        checkScrollability();
        window.addEventListener('resize', checkScrollability);
        return () => window.removeEventListener('resize', checkScrollability);
    }, [children]);

    // --- Smooth Drag to Scroll Logic ---
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
        
        // Disable CSS smooth scroll when dragging to prevent "jerking"
        if (scrollRef.current) {
            scrollRef.current.style.scrollBehavior = 'auto';
        }
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const x = e.pageX - scrollRef.current.offsetLeft;
        // Reduced multiplier to 1.2 for a more natural, 1:1 feel
        const walk = (x - startX) * 1.2; 

        // Use requestAnimationFrame for 60fps buttery smooth scrolling
        if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
        
        animationFrame.current = requestAnimationFrame(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollLeft = scrollLeft - walk;
            }
        });
    };

    // --- Button Scroll Logic ---
    const scrollByAmount = (amount) => {
        if (scrollRef.current) {
            // Enable CSS smooth scroll ONLY for button clicks
            scrollRef.current.style.scrollBehavior = 'smooth';
            scrollRef.current.scrollLeft += amount;
        }
    };

    return (
        <div className="relative group w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50">
            
            {/* Left Scroll Button & Shadow */}
            {canScrollLeft && (
                <>
                    <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none transition-opacity duration-300" />
                    <button 
                        onClick={() => scrollByAmount(-250)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label="Scroll Left"
                    >
                        <ChevronLeft size={20} />
                    </button>
                </>
            )}

            {/* Scrollable Container */}
            <div 
                ref={scrollRef}
                onScroll={checkScrollability}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={`w-full overflow-x-auto no-scrollbar transition-colors ${
                    isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
                }`}
            >
                <div className="min-w-max">
                    {children}
                </div>
            </div>

            {/* Right Scroll Button & Shadow */}
            {canScrollRight && (
                <>
                    <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none transition-opacity duration-300" />
                    <button 
                        onClick={() => scrollByAmount(250)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label="Scroll Right"
                    >
                        <ChevronRight size={20} />
                    </button>
                </>
            )}
        </div>
    );
}