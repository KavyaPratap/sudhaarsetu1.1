
'use client';

import * as React from 'react';
import { List, PlusCircle, Notebook } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/context/i18n-context';

interface BottomNavBarProps {
  activeView?: 'feed' | 'report' | 'my-reports';
  setActiveView?: (view: 'feed' | 'report') => void;
}

export default function BottomNavBar({ activeView, setActiveView }: BottomNavBarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { name: 'feed', icon: List, label: t('Feed'), href: '/?view=feed' },
    { name: 'report', icon: PlusCircle, label: t('Report'), href: '/?view=report' },
    { name: 'my-reports', icon: Notebook, label: t('My Reports'), href: '/my-reports' },
  ];
  
  const currentView = activeView || pathname.split('/')[1] || 'feed';

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border md:hidden z-50">
      <div className="grid h-full max-w-lg grid-cols-3 mx-auto font-medium">
        {navItems.map(item => {
            const isLink = item.href.startsWith('/');
            const isActive = isLink ? pathname === item.href.split('?')[0] && (item.name === 'my-reports' || activeView === item.name) : currentView === item.name;

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
                <button key={item.name} type="button" onClick={() => setActiveView(item.name as 'feed' | 'report')} className={className}>
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
