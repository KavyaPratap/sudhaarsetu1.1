import * as React from 'react';
import Link from 'next/link';
import {
  ListOrdered,
  LogOut,
  Briefcase,
  PanelLeft,
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/app/login/actions';
import SudhaarSetuLogo from '@/components/SudhaarSetuLogo';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotificationBell from '@/components/NotificationBell';
import { redirect } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import BottomNavBar from '@/components/BottomNavBar';

async function WorkerHeader() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-muted/40 px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <SheetHeader>
            <SheetTitle className="sr-only">Worker Navigation</SheetTitle>
          </SheetHeader>
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/worker"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <SudhaarSetuLogo className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">SudhaarSetu Worker</span>
            </Link>
            <Link
              href="/worker"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <ListOrdered className="h-5 w-5" />
              Issue Feed
            </Link>
            <Link
              href="/worker/my-work"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Briefcase className="h-5 w-5" />
              My Work
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
      <div className="w-full flex-1" />
      <NotificationBell userId={user.id} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback>{user.full_name?.charAt(0) || 'W'}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <p>{user.full_name || 'Worker'}</p>
            <p className="text-xs font-normal text-muted-foreground">Worker</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">Profile Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={logout}>
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full text-left flex items-center">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'worker') {
    redirect('/');
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/worker" className="flex items-center gap-2 font-semibold">
              <SudhaarSetuLogo className="h-8 w-8 text-primary" />
              <span>Worker Panel</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <Link
                href="/worker"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <ListOrdered className="h-4 w-4" />
                Issue Feed
              </Link>
              <Link
                href="/worker/my-work"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Briefcase className="h-4 w-4" />
                My Work
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <UserIcon className="h-4 w-4" />
                My Profile
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <WorkerHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 mb-20 md:mb-0">
          {children}
        </main>
        <BottomNavBar activeView="feed" />
      </div>
    </div>
  );
}
