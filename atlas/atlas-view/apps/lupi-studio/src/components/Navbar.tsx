import { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router';
import { Menu, X, Atom, Sun } from 'lucide-react';

const navLinks = [
  { label: 'Studio', path: '/studio' },
  { label: 'Compare', path: '/compare' },
  { label: 'Home', path: '/home' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'MCP Workbench', path: '/mcp/workbench' },
  { label: 'MCP Docs', path: '/mcp' },
  { label: 'About', path: '/about' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const toggleMobile = useCallback(() => setMobileOpen(prev => !prev), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const isActive = (path: string) => {
    if (path === '/studio') return location.pathname === '/' || location.pathname.startsWith('/studio');
    if (path === '/mcp') return location.pathname === '/mcp';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[rgba(5,5,8,0.8)] backdrop-blur-nav border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-content mx-auto h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Atom className="w-7 h-7 text-lupi-violet" />
            <span className="font-display text-lg font-medium tracking-tight text-white">
              LUPI
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg font-body text-[13px] font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? 'text-lupi-violet bg-[rgba(123,92,255,0.1)]'
                    : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle theme"
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <Sun className="w-4 h-4" />
            </button>
            <Link
              to="/studio"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-lupi-violet text-white font-body text-button rounded-full hover:bg-[#8B6CFF] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-glow-violet"
            >
              Launch Studio
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={toggleMobile}
              aria-label="Toggle menu"
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-void-black/95 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col items-center justify-center h-full gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={closeMobile}
                className={`text-2xl font-display transition-colors ${
                  isActive(link.path) ? 'text-lupi-violet' : 'text-white hover:text-lupi-violet-light'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/studio"
              onClick={closeMobile}
              className="mt-6 px-8 py-3 bg-lupi-violet text-white font-body text-button rounded-full hover:bg-[#8B6CFF] transition-all duration-200"
            >
              Launch Studio
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
