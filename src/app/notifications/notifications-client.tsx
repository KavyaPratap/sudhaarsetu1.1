'use client';

import * as React from 'react';
import { Loader2, BellRing, BellOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNavBar from '@/components/BottomNavBar';
import { Card, CardContent } from '@/components/ui/card';
import { markNotificationAsRead } from '@/app/actions';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';
import { useI18n } from '@/context/i18n-context';

type Notification = {
  id: string;
  title: string;
  description: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsClient({
  initialNotifications,
  profile,
}: {
  initialNotifications: Notification[];
  profile: UserProfile;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications);
  const { t } = useI18n();

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      await markNotificationAsRead(notification.id);
    }
    router.push(notification.link);
  };

  return (
    <>
      <Header user={profile} t={t} />
      <main className="container mx-auto px-4 py-8 mb-20 md:mb-0">
        <h1 className="text-3xl font-bold tracking-tight mb-6">{t('Notifications')}</h1>
        {notifications.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'w-full text-left p-4 hover:bg-muted/50 block',
                      !notification.is_read && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          'mt-1 h-2 w-2 shrink-0 rounded-full',
                          !notification.is_read && 'bg-primary animate-pulse'
                        )}
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{t(notification.title)}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t(notification.description)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.created_at || Date.now()), { addSuffix: true })}
                        </p>
                      </div>
                      <BellRing className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <BellOff className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">{t('All Caught Up')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('You have no new notifications.')}
            </p>
          </Card>
        )}
      </main>
      <BottomNavBar activeView="my-reports" />
    </>
  );
}
