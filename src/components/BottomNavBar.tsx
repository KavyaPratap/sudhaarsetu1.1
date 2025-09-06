
'use client';

import * as React from 'react';
import { List, PlusCircle, Notebook, Briefcase, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/context/i18n-context';

interface BottomNavBarProps {
  activeView?: 'feed' | 'report' | 'my-reports' | 'my-work';
  setActiveView?: (view: 'feed' | 'report' | 'my-reports') => void;
}

export default function BottomNavBar({ activeView, setActiveView }: BottomNavBarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const isWorker = pathname.startsWith('/worker');
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
      return null; // Don't show the nav bar for admin
  }

  const citizenNavItems = [
    { name: 'feed', icon: List, label: t('Feed'), href: '/?view=feed' },
    { name: 'report', icon: PlusCircle, label: t('Report'), href: '/?view=report' },
    { name: 'my-reports', icon: Notebook, label: t('My Reports'), href: '/my-reports' },
  ];

  const workerNavItems = [
    { name: 'feed', icon: List, label: 'Feed', href: '/worker' },
    { name: 'my-work', icon: Briefcase, label: 'My Work', href: '/worker/my-work' },
    { name: 'my-reports', icon: UserIcon, label: t('Profile'), href: '/profile' },
  ];

  const navItems = isWorker ? workerNavItems : citizenNavItems;
  
  const currentPath = pathname.split('?')[0];

  const getIsActive = (item: typeof navItems[0]) => {
      // For citizen view with query params or path
      if (!isWorker) {
        if (item.name === 'my-reports') {
            return currentPath === '/my-reports';
        }
        return activeView === item.name;
      }
      // For worker view based on path
      if (item.href === '/worker' && currentPath === '/worker') return true;
      if (item.href === '/profile' && currentPath === '/profile') return true;
      return currentPath.startsWith(item.href) && item.href !== '/worker';
  }

  const handleCitizenNav = (itemName: 'feed' | 'report' | 'my-reports') => {
      if (itemName === 'my-reports') {
          // This is now a link, handled by the Link component
      } else if (setActiveView) {
          setActiveView(itemName);
      }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border md:hidden z-50">
      <div className="grid h-full max-w-lg grid-cols-3 mx-auto font-medium">
        {navItems.map(item => {
            const isActive = getIsActive(item);

            const content = (
              <>
                <item.icon className="w-6 h-6 mb-1 transition-transform group-hover:scale-110" />
                <span className="text-sm">{item.label}</span>
              </>
            );

            const className = cn(
              'inline-flex flex-col items-center justify-center px-5 hover:bg-muted group',
              {
                'text-primary': isActive,
                'text-muted-foreground': !isActive,
              }
            );

            if (setActiveView && (item.name === 'feed' || item.name === 'report')) {
                return (
                <button key={item.name} type="button" onClick={() => handleCitizenNav(item.name as 'feed' | 'report')} className={className}>
                    {content}
                </button>
                )
            }
            return (
                <Link key={item.name} href={item.href} className={className}>
                    {content}
                </Link>
            )
        })}
      </div>
    </nav>
  );
}
