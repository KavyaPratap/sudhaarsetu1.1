import * as React from 'react';
import Link from 'next/link';
import {
  ListOrdered,
  LogOut,
  Building,
  LineChart,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { logout } from '@/app/login/actions';
import SudhaarSetuLogo from '@/components/SudhaarSetuLogo';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotificationBell from '@/components/NotificationBell';
import { redirect } from 'next/navigation';

async function AdminHeader() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col">
            <SheetHeader>
              <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
            </SheetHeader>
            <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold mb-4">
              <SudhaarSetuLogo className="h-6 w-6 text-primary" />
              <span>Admin Panel</span>
            </Link>
            <nav className="grid gap-2 text-lg font-medium">
              <Link href="/admin" className="text-muted-foreground hover:text-foreground flex items-center gap-3">
                <ListOrdered className="h-5 w-5" /> All Issues
              </Link>
              <Link href="/admin/departments" className="text-muted-foreground hover:text-foreground flex items-center gap-3">
                <Building className="h-5 w-5" /> Departments
              </Link>
              <Link href="/admin/analytics" className="text-muted-foreground hover:text-foreground flex items-center gap-3">
                <LineChart className="h-5 w-5" /> Analytics
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      <div className="w-full flex-1" />
      <NotificationBell userId={user.id} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback>{user.full_name?.charAt(0) || 'A'}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <p>{user.full_name || 'Admin'}</p>
            <p className="text-xs font-normal text-muted-foreground">Administrator</p>
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <SudhaarSetuLogo className="h-8 w-8 text-primary" />
              <span>SudhaarSetu Admin</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <ListOrdered className="h-4 w-4" />
                All Issues
              </Link>
              <Link
                href="/admin/departments"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Building className="h-4 w-4" />
                Departments
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <LineChart className="h-4 w-4" />
                Analytics
              </Link>
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Card>
              <CardHeader className="p-2 pt-0 md:p-4">
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>
                  Contact support for any questions about the admin panel.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
                <Button size="sm" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <AdminHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
