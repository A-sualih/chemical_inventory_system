import { useTheme } from '../../context/ThemeContext';
import '../../styles/ThemeToggle.css';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isPaper = theme === 'paper';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${isPaper ? 'is-light' : 'is-dark'} ${className}`}
      aria-label={isPaper ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isPaper ? 'Switch to Ink (dark)' : 'Switch to Paper (light)'}
    >
      <span className="theme-toggle-label">{isPaper ? 'Paper' : 'Ink'}</span>
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-icon theme-toggle-sun">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </span>
        <span className="theme-toggle-icon theme-toggle-moon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 14.3A8.5 8.5 0 019.7 3a7 7 0 1011.3 11.3z" />
          </svg>
        </span>
        <span className="theme-toggle-thumb" />
      </span>
    </button>
  );
}
