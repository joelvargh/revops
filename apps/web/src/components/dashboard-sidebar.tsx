"use client";

import {
	ChevronsUpDown,
	ClipboardCheck,
	LayoutDashboard,
	LogOut,
	Map,
	Megaphone,
	Search,
	Settings,
	Shield,
	Target,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
	useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

const mainNav = [
	{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
	{ label: "Territory Map", href: "/dashboard/map", icon: Map },
	{ label: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
	{ label: "Review Queue", href: "/dashboard/review", icon: ClipboardCheck },
	{ label: "Research", href: "/dashboard/research", icon: Search },
	{ label: "Qualified Leads", href: "/dashboard/leads", icon: Target },
];

const secondaryNav = [
	{ label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar(props: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const { openMobile, setOpenMobile } = useSidebar();
	const isAdmin = session?.user?.role === "admin";

	const prevPathname = useRef(pathname);
	useEffect(() => {
		if (prevPathname.current !== pathname && openMobile) {
			setOpenMobile(false);
		}
		prevPathname.current = pathname;
	}, [pathname, openMobile, setOpenMobile]);

	const userName = session?.user?.name ?? "User";
	const userEmail = session?.user?.email ?? "";
	const initials = userName.slice(0, 2).toUpperCase();

	return (
		<Sidebar collapsible="offcanvas" variant="inset" {...props}>
			<SidebarHeader className="px-3 pt-3">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="h-auto rounded-xl border border-border/50 bg-white px-3 py-3 hover:bg-white/90"
							size="lg"
						>
							<Link href="/dashboard">
								<Image
									alt="Softnotions"
									className="shrink-0"
									height={28}
									src="/logo.svg"
									width={28}
								/>
								<div className="grid text-left leading-tight">
									<span className="font-semibold text-foreground text-sm">
										softnotions
									</span>
									<span className="text-muted-foreground text-xs">
										Lead Discovery
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent className="px-2">
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{mainNav.map((item) => (
								<SidebarMenuItem key={item.href}>
									<SidebarMenuButton
										asChild
										className="h-10 rounded-xl data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
										isActive={
											pathname === item.href ||
											(item.href !== "/dashboard" &&
												pathname.startsWith(item.href))
										}
										tooltip={item.label}
									>
										<Link href={item.href as never}>
											<item.icon />
											<span>{item.label}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup className="mt-auto pt-2">
					<SidebarGroupLabel className="px-2 text-[11px] text-muted-foreground uppercase tracking-wider">
						More
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{secondaryNav.map((item) => (
								<SidebarMenuItem key={item.href}>
									<SidebarMenuButton
										asChild
										className="h-10 rounded-xl data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
										isActive={pathname.startsWith(item.href)}
										tooltip={item.label}
									>
										<Link href={item.href as never}>
											<item.icon />
											<span>{item.label}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="p-3">
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									className="rounded-xl border border-border/50 bg-white data-[state=open]:bg-sidebar-accent"
									size="lg"
								>
									<Avatar className="size-8 rounded-xl">
										<AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-xs">
											{initials}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">{userName}</span>
										<span className="truncate text-muted-foreground text-xs">
											{userEmail}
										</span>
									</div>
									<ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="min-w-56 rounded-xl"
								side="right"
								sideOffset={4}
							>
								<DropdownMenuLabel className="font-normal">
									<div className="flex items-center gap-2 py-1 text-sm">
										<Avatar className="size-8 rounded-xl">
											<AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-xs">
												{initials}
											</AvatarFallback>
										</Avatar>
										<div className="grid leading-tight">
											<span className="font-medium">{userName}</span>
											<span className="text-muted-foreground text-xs">
												{userEmail}
											</span>
										</div>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{isAdmin && (
									<DropdownMenuItem onClick={() => router.push("/admin")}>
										<Shield className="mr-2 h-4 w-4" />
										Admin Panel
									</DropdownMenuItem>
								)}
								<DropdownMenuItem
									onClick={() => router.push("/dashboard/settings")}
								>
									<Settings className="mr-2 h-4 w-4" />
									Settings
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() =>
										authClient.signOut({
											fetchOptions: { onSuccess: () => router.push("/login") },
										})
									}
								>
									<LogOut className="mr-2 h-4 w-4" />
									Sign out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
