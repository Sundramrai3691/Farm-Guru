import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  HomeIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  UsersIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UsersIcon as UsersIconSolid,
  UserIcon as UserIconSolid
} from '@heroicons/react/24/solid';
import { useTranslation } from '@/lib/i18n';

const BottomTabs = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const tabs = [
    {
      href: '/',
      label: t('home'),
      icon: HomeIcon,
      activeIcon: HomeIconSolid,
    },
    {
      href: '/query',
      label: t('query'),
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassIconSolid,
    },
    {
      href: '/market',
      label: t('market'),
      icon: ChartBarIcon,
      activeIcon: ChartBarIconSolid,
    },
    {
      href: '/community',
      label: t('community'),
      icon: UsersIcon,
      activeIcon: UsersIconSolid,
    },
    {
      href: '/profile',
      label: t('profile'),
      icon: UserIcon,
      activeIcon: UserIconSolid,
    },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-glass-border safe-area-bottom"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          const Icon = isActive ? tab.activeIcon : tab.icon;

          return (
            <Link
              key={tab.href}
              to={tab.href}
              className="flex flex-col items-center justify-center min-w-0 flex-1 px-1 py-2 relative"
            >
              <motion.div
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-radius-lg transition-colors ${
                  isActive 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="bottomActiveTab"
                    className="absolute inset-0 bg-primary/10 rounded-radius-lg"
                    initial={false}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.div>
              
              <span 
                className={`text-xs mt-1 font-medium truncate max-w-full ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomTabs;