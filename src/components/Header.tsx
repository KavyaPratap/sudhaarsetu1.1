
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Award, LogOut, User, PlusCircle } from 'lucide-react';
import SudhaarSetuLogo from './SudhaarSetuLogo';
import { Button } from './ui/button';
import { logout } from '@/app/login/actions';
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';


interface HeaderProps {
  user: UserProfile | null;
  t: (key: string) => string;
}

export default function Header({ user, t }: HeaderProps) {
  const userName = user?.full_name || 'Citizen';
  const userAvatar = user?.avatar_url || '';
  const homeUrl = user?.role === 'admin' ? '/admin' : '/';

  return (
    <header className="bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href={homeUrl}>
              <SudhaarSetuLogo className="h-10 w-10 text-primary" />
            </Link>
            <h1 className="text-2xl font-bold text-primary font-headline tracking-tight">
              <Link href={homeUrl}>{t('SudhaarSetu')}</Link>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             <Button asChild className="hidden md:flex">
                <Link href="/?view=report">
                    <PlusCircle className="mr-2" />
                    {t('Report Issue')}
                </Link>
             </Button>

            {user && <NotificationBell userId={user.id} />}

            <LanguageSwitcher />

            <Card className="hidden sm:flex items-center gap-2 p-2 bg-accent/20 border-accent/50">
              <Award className="h-5 w-5 text-accent" />
              <span className="font-bold text-primary">{user?.points ?? 0}</span>
              <span className="text-sm text-muted-foreground">{t('Points')}</span>
            </Card>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar>
                            <AvatarImage src={userAvatar} alt={userName} />
                            <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || 'No email'}
                        </p>
                    </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                         <Link href="/profile">
                            <User className="mr-2 h-4 w-4" />
                            <span>{t('Profile')}</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <form action={logout}>
                        <DropdownMenuItem asChild>
                            <button type="submit" className="w-full text-left">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>{t('Log out')}</span>
                            </button>
                        </DropdownMenuItem>
                    </form>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
