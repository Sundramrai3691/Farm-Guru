import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Header from '../components/Header';

// Mock the analytics module
vi.mock('../lib/analytics', () => ({
  analytics: {
    track: vi.fn(),
  },
}));

// Mock the i18n module
vi.mock('../lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

const HeaderWrapper = () => (
  <BrowserRouter>
    <Header />
  </BrowserRouter>
);

describe('Header Component', () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = '';
  });

  afterEach(() => {
    // Clean up
    document.documentElement.className = '';
  });

  it('renders header with logo and navigation', () => {
    render(<HeaderWrapper />);
    
    // Check if logo is present
    expect(screen.getByText('Farm-Guru')).toBeInTheDocument();
    
    // Check if navigation links are present
    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.getByText('query')).toBeInTheDocument();
    expect(screen.getByText('weather')).toBeInTheDocument();
  });

  it('toggles dark mode when theme button is clicked', () => {
    render(<HeaderWrapper />);
    
    // Find theme toggle button (sun/moon icon)
    const themeButton = screen.getByRole('button', { name: /toggle/i });
    
    // Initially should not have dark class
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    
    // Click theme toggle
    fireEvent.click(themeButton);
    
    // Should now have dark class
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    // Click again to toggle back
    fireEvent.click(themeButton);
    
    // Should not have dark class
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('opens mobile menu when hamburger is clicked', () => {
    render(<HeaderWrapper />);
    
    // Find mobile menu toggle button
    const mobileMenuButton = screen.getByRole('button', { name: /toggle sidebar/i });
    
    // Click to open mobile menu
    fireEvent.click(mobileMenuButton);
    
    // Mobile menu should be visible (check for mobile-specific navigation)
    const mobileNavLinks = screen.getAllByText('home');
    expect(mobileNavLinks.length).toBeGreaterThan(1); // Desktop + mobile versions
  });

  it('renders language toggle button', () => {
    render(<HeaderWrapper />);
    
    // Check if language toggle is present
    const languageButton = screen.getByText('EN');
    expect(languageButton).toBeInTheDocument();
  });
});