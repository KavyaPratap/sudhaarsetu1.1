'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, BellRing, Package } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { markNotificationAsRead } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

type Notification = {
  id: string;
  title: string;
  description: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const router = useRouter();

  React.useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Notification[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    }, (error) => {
      if (error?.code === 'permission-denied') {
        console.warn('Notifications permission denied (check Firebase rules or authentication state).');
        return;
      }
      console.error('Error fetching notifications:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
    }
    router.push(notification.link);
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await Promise.all(unreadIds.map(id => markNotificationAsRead(id)));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? <BellRing className="h-5 w-5 animate-pulse" /> : <Bell className="h-5 w-5" />}
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex justify-between items-center p-4">
          <h4 className="font-medium leading-none">Notifications</h4>
          {unreadCount > 0 && <Button variant="link" size="sm" onClick={handleMarkAllAsRead}>Mark all as read</Button>}
        </div>
        <Separator />
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className="w-full text-left p-4 hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      !n.is_read && 'bg-primary'
                    )}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at || Date.now()), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center gap-2 text-center p-8">
              <Package className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          )}
        </div>
        <Separator />
        <div className="p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
