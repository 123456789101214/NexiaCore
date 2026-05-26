import React from 'react';
import { Sun, Moon } from 'lucide-react';
import useThemeStore from '../store/themeStore';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useThemeStore();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-500 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 overflow-hidden shadow-inner ${
                isDark ? 'bg-slate-800' : 'bg-sky-200'
            }`}
            aria-label="Toggle Dark Mode"
        >
            {/* 🌌 Dark Mode Background Elements (Stars) */}
            <span className={`absolute inset-0 transition-opacity duration-500 delay-100 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
                <span className="absolute top-2 left-3 h-1 w-1 rounded-full bg-white opacity-80 animate-pulse"></span>
                <span className="absolute top-6 left-5 h-0.5 w-0.5 rounded-full bg-white opacity-60"></span>
                <span className="absolute top-3 left-8 h-1.5 w-1.5 rounded-full bg-amber-100 opacity-90 animate-pulse delay-75"></span>
            </span>
            
            {/* ☁️ Light Mode Background Elements (Clouds) */}
            <span className={`absolute inset-0 transition-opacity duration-500 ${isDark ? 'opacity-0' : 'opacity-100'}`}>
                <span className="absolute bottom-1 right-2 h-2.5 w-6 rounded-full bg-white/60 blur-[1px]"></span>
                <span className="absolute bottom-2 right-5 h-3.5 w-5 rounded-full bg-white/80 blur-[1px]"></span>
            </span>

            {/* 🔘 The Sliding Thumb */}
            <span
                className={`absolute left-1 flex h-8 w-8 transform items-center justify-center rounded-full bg-white shadow-md transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.26,1.55)] ${
                    isDark ? 'translate-x-10 bg-slate-700' : 'translate-x-0'
                }`}
            >
                {/* Sun Icon */}
                <span 
                    className={`absolute transition-all duration-500 ${
                        isDark ? 'rotate-[-180deg] scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                    }`}
                >
                    <Sun size={18} className="text-amber-500 fill-amber-500/20" />
                </span>
                
                {/* Moon Icon */}
                <span 
                    className={`absolute transition-all duration-500 ${
                        isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-[180deg] scale-0 opacity-0'
                    }`}
                >
                    <Moon size={18} className="text-amber-300 fill-amber-300/20" />
                </span>
            </span>
        </button>
    );
};

export default ThemeToggle;