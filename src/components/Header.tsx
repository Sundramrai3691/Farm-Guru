import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  MoonIcon, 
  SunIcon, 
  Bars3Icon,
  XMarkIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/i18n';
import { analytics } from '@/lib/analytics';

const Header = () => {
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { t, language, setLanguage } = useTranslation();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    analytics.track('theme_toggled', { theme: newIsDark ? 'dark' : 'light' });
  };

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'hi' : 'en';
    setLanguage(newLanguage);
    analytics.track('language_changed', { language: newLanguage });
  };

  const handleNavClick = (page: string, label: string) => {
    analytics.track('nav_clicked', { page, label });
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { href: '/', label: t('home') },
    { href: '/query', label: t('query') },
    { href: '/weather', label: t('weather') },
    { href: '/market', label: t('market') },
    { href: '/schemes', label: t('schemes') },
    { href: '/community', label: t('community') },
  ];

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border backdrop-blur-md"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-3 hover:scale-105 transition-transform"
          onClick={() => analytics.track('logo_clicked')}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary-dark rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">FG</span>
          </div>
          <span className="font-bold text-xl text-foreground hidden sm:block">
            Farm-Guru
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-2 rounded-radius text-sm font-medium transition-all duration-200 relative ${
                location.pathname === link.href
                  ? 'text-primary bg-primary/10'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => handleNavClick(link.href, link.label)}
            >
              {link.label}
              {location.pathname === link.href && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-radius"
                  initial={false}
                  transition={{ duration: 0.2 }}
                />
              )}
            </Link>
          ))}
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="hidden sm:flex items-center gap-1 text-foreground/80 hover:text-foreground"
          >
            <GlobeAltIcon className="w-4 h-4" />
            <span className="text-xs font-medium">{language.toUpperCase()}</span>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="hidden sm:flex text-foreground/80 hover:text-foreground"
          >
            {isDark ? (
              <SunIcon className="w-4 h-4" />
            ) : (
              <MoonIcon className="w-4 h-4" />
            )}
          </Button>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-foreground/80 hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="w-5 h-5" />
            ) : (
              <Bars3Icon className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden glass-card border-t border-glass-border"
        >
          <nav className="container mx-auto px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => handleNavClick(link.href, link.label)}
                className={`block px-4 py-3 rounded-radius text-sm font-medium transition-colors ${
                  location.pathname === link.href
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground/80 hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile controls */}
            <div className="flex items-center gap-2 px-4 pt-2 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="flex items-center gap-2 text-foreground/80 hover:text-foreground"
              >
                <GlobeAltIcon className="w-4 h-4" />
                <span>{language === 'en' ? 'हिंदी' : 'English'}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="flex items-center gap-2 text-foreground/80 hover:text-foreground"
              >
                {isDark ? (
                  <>
                    <SunIcon className="w-4 h-4" />
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <MoonIcon className="w-4 h-4" />
                    <span>Dark</span>
                  </>
                )}
              </Button>
            </div>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Header;