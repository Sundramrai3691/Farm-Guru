import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';
import { analytics } from '@/lib/analytics';

const Footer = () => {
  const { t, language } = useTranslation();

  const quickLinks = [
    { href: '/about', label: t('about') },
    { href: '/schemes', label: t('schemes') },
    { href: '/weather', label: t('weather') },
    { href: '/market', label: t('market') },
  ];

  const handleLinkClick = (href: string, label: string) => {
    analytics.track('footer_link_clicked', { href, label });
  };

  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.footer
      variants={footerVariants}
      initial="hidden"
      animate="visible"
      className="hidden md:block glass-enhanced border-t border-glass-border mt-auto"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary-dark rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">FG</span>
              </div>
              <span className="font-bold text-xl text-foreground">Farm-Guru</span>
            </div>
            <p className="text-foreground/70 text-sm max-w-md leading-relaxed">
              {language === 'en' 
                ? 'AI-powered agricultural assistant helping farmers make informed decisions with expert guidance and real-time data.'
                : 'AI-संचालित कृषि सहायक जो किसानों को विशेषज्ञ मार्गदर्शन और वास्तविक समय डेटा के साथ सूचित निर्णय लेने में मदद करता है।'
              }
            </p>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={itemVariants}>
            <h3 className="font-semibold mb-4 text-foreground">
              {language === 'en' ? 'Quick Links' : 'त्वरित लिंक'}
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    onClick={() => handleLinkClick(link.href, link.label)}
                    className="text-foreground/70 hover:text-primary transition-colors text-sm link-underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div variants={itemVariants}>
            <h3 className="font-semibold mb-4 text-foreground">
              {language === 'en' ? 'Contact' : 'संपर्क'}
            </h3>
            <div className="space-y-2 text-sm text-foreground/70">
              <p>Email: support@farm-guru.ai</p>
              <p>Helpline: 1800-FARM-GURU</p>
              <p>
                {language === 'en' 
                  ? 'Available 24/7 for farmers'
                  : 'किसानों के लिए 24/7 उपलब्ध'
                }
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <motion.div 
          variants={itemVariants}
          className="mt-8 pt-6 border-t border-border/30 flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <p className="text-xs text-foreground/60">
            © 2025 Farm-Guru. All rights reserved. Built with 💚 for farmers.
          </p>
          <div className="flex items-center gap-4 text-xs text-foreground/60">
            <Link 
              to="/privacy" 
              className="hover:text-primary transition-colors"
              onClick={() => analytics.track('footer_legal_clicked', { page: 'privacy' })}
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms" 
              className="hover:text-primary transition-colors"
              onClick={() => analytics.track('footer_legal_clicked', { page: 'terms' })}
            >
              Terms of Service
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.footer>
  );
};

export default Footer;