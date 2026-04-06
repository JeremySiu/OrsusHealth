import { useMemo, useState } from 'react';
import {
  Bell,
  ClipboardPenLine,
  CreditCard,
  FileText,
  LineChart,
  LogOut,
  MoreVertical,
  Settings2,
  TrendingUp,
  User,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

function initialsFromName(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const PAGES = [
  { id: 'assessment', label: 'New Assessment', icon: ClipboardPenLine },
  { id: 'trends', label: 'My Trends', icon: TrendingUp },
  { id: 'reports', label: 'My Reports', icon: FileText },
];

export function DashboardAppSidebar({
  displayName,
  email,
  avatarUrl,
  activeId = 'overview',
  onActiveIdChange,
  onSignOut,
}) {
  const initials = useMemo(() => initialsFromName(displayName), [displayName]);

  const handleSelect = (id) => {
    if (onActiveIdChange) onActiveIdChange(id);
  };

  return (
    <Sidebar variant="floating" collapsible="offcanvas">
      <SidebarHeader className="gap-0 border-b border-sidebar-border" style={{ paddingTop: '2rem', paddingBottom: '2rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        <div className="flex items-center gap-4">
          <img
            src="/BooHooLogo.png"
            alt=""
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-lg object-contain"
          />
          <span
            className="truncate text-[26px] font-bold tracking-tight text-sidebar-foreground"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            OrsusHealth
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-0">
        <SidebarGroup className="py-2" style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeId === 'overview'}
                  onClick={() => handleSelect('overview')}
                  className="h-11 px-3 text-[14.5px]"
                >
                  <LineChart className="size-[18px] stroke-[1.75]" />
                  <span>Dashboard Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-3" style={{ marginTop: '2rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
          <SidebarGroupLabel className="mb-2 h-auto px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Pages
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {PAGES.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeId === item.id}
                      onClick={() => handleSelect(item.id)}
                      className="h-11 px-3 text-[14.5px]"
                    >
                      <Icon className="size-[18px] stroke-[1.75]" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-0 border-t border-sidebar-border" style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1.5rem' }}>
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeId === 'settings'}
              onClick={() => handleSelect('settings')}
              className="h-11 px-3 text-[14.5px]"
            >
              <Settings2 className="size-[18px] stroke-[1.75]" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-auto min-h-12 gap-3 py-2.5 px-3 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-9 rounded-full">
                    {avatarUrl ? (
                      <AvatarImage
                        src={avatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-full text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-snug">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {email}
                    </span>
                  </div>
                  <MoreVertical className="size-4 shrink-0 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 min-w-56 rounded-xl p-1 shadow-lg border border-border/60"
                side="right"
                align="end"
                sideOffset={14}
              >
                <DropdownMenuLabel className="p-2 font-normal">
                  <div className="flex items-center gap-3 text-left">
                    <Avatar className="size-10 rounded-full border border-border/50">
                      {avatarUrl ? (
                        <AvatarImage
                          src={avatarUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                      <AvatarFallback className="rounded-full text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 flex-1 gap-0.5 leading-snug">
                      <span className="truncate text-sm font-semibold">
                        {displayName}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <div className="flex flex-col gap-0.5 px-0.5">
                  <DropdownMenuItem className="gap-2.5 py-2 text-[13px] rounded-md">
                    <User className="size-4 stroke-[2] text-muted-foreground" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2.5 py-2 text-[13px] rounded-md">
                    <CreditCard className="size-4 stroke-[2] text-muted-foreground" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2.5 py-2 text-[13px] rounded-md">
                    <Bell className="size-4 stroke-[2] text-muted-foreground" />
                    Notifications
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator className="my-1" />
                <div className="px-0.5 pb-0.5">
                  <DropdownMenuItem
                    className="gap-2.5 py-2 text-[13px] rounded-md text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-500 dark:focus:bg-red-500/10 dark:focus:text-red-400"
                    onSelect={() => onSignOut()}
                  >
                    <LogOut className="size-4 stroke-[2]" />
                    Log out
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
