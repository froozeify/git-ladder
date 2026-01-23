/**
 * ThemeManager Class
 * 
 * Handles theme switching between light and dark modes.
 * Persists preference to localStorage and respects system preference.
 */
class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('themeToggle');
        this.storageKey = 'git-ladder-theme';
        
        this.init();
    }

    /**
     * Initialize theme based on stored preference or system preference
     */
    init() {
        // Check for stored preference
        const storedTheme = localStorage.getItem(this.storageKey);
        
        if (storedTheme) {
            this.setTheme(storedTheme);
        }
        // If no stored preference, let CSS handle system preference
        
        // Bind toggle event
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggle());
        }
        
        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
            // Only auto-switch if user hasn't set a preference
            if (!localStorage.getItem(this.storageKey)) {
                // CSS handles this automatically, but we might need to refresh charts
                window.dispatchEvent(new CustomEvent('themechange'));
            }
        });
    }

    /**
     * Get current theme
     * @returns {string} 'light' or 'dark'
     */
    getTheme() {
        const explicit = document.documentElement.getAttribute('data-theme');
        if (explicit) return explicit;
        
        // Check system preference
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    /**
     * Set theme
     * @param {string} theme - 'light' or 'dark'
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.storageKey, theme);
        
        // Dispatch event for other components (like charts) to react
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }

    /**
     * Toggle between light and dark themes
     */
    toggle() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
}

// Initialize theme manager immediately to prevent flash
window.ThemeManager = ThemeManager;
const themeManager = new ThemeManager();
