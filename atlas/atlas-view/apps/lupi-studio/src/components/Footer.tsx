import { Link } from 'react-router';
import { Atom, Github, Twitter, MessageCircle } from 'lucide-react';

const productLinks = [
  { label: 'Studio', to: '/studio' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'API Docs', to: '/mcp' },
  { label: 'Changelog', to: '#' },
];

const resourceLinks = [
  { label: 'Documentation', to: '#' },
  { label: 'Tutorials', to: '#' },
  { label: 'Community', to: '#' },
  { label: 'GitHub', to: 'https://github.com/alexwelcing/lupine', external: true },
];

const connectLinks = [
  { label: 'Twitter / X', to: 'https://twitter.com', external: true },
  { label: 'Discord', to: 'https://discord.com', external: true },
  { label: 'GitHub Discussions', to: 'https://github.com/alexwelcing/lupine/discussions', external: true },
];

export default function Footer() {
  const renderLink = (link: { label: string; to: string; external?: boolean }) => {
    if (link.external) {
      return (
        <a
          key={link.label}
          href={link.to}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm"
        >
          {link.label}
        </a>
      );
    }
    return (
      <Link
        key={link.label}
        to={link.to}
        className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm"
      >
        {link.label}
      </Link>
    );
  };

  return (
    <footer className="w-full bg-void-black border-t border-[rgba(255,255,255,0.06)]">
      <div className="max-w-content mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2">
              <Atom className="w-6 h-6 text-lupi-violet" />
              <span className="font-display text-lg font-medium text-white">LUPI</span>
            </Link>
            <p className="text-sm text-[rgba(255,255,255,0.6)]">
              The MCP for atomic view generation.
            </p>
            <a
              href="https://github.com/alexwelcing/lupine"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-3">
            <h4 className="font-body text-sm font-medium text-white uppercase tracking-wider mb-1">Product</h4>
            {productLinks.map(renderLink)}
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-3">
            <h4 className="font-body text-sm font-medium text-white uppercase tracking-wider mb-1">Resources</h4>
            {resourceLinks.map(renderLink)}
          </div>

          {/* Connect */}
          <div className="flex flex-col gap-3">
            <h4 className="font-body text-sm font-medium text-white uppercase tracking-wider mb-1">Connect</h4>
            {connectLinks.map(renderLink)}
            <div className="flex items-center gap-3 mt-2">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href="https://github.com/alexwelcing/lupine" target="_blank" rel="noopener noreferrer" className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-content mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-caption text-[rgba(255,255,255,0.3)]">
            &copy; {new Date().getFullYear()} LUPI. All rights reserved.
          </p>
          <p className="text-caption text-[rgba(255,255,255,0.3)]">
            Built on open research. Licensed under MIT.
          </p>
        </div>
      </div>
    </footer>
  );
}
