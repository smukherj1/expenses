"use client";
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation";

const links = [
    { name: "Home", href: "/" },
    { name: "Edit Tags", href: "/edit" },
];

export default function NavMenu() {
    const curPath = usePathname();
    return <NavigationMenu>
        <NavigationMenuList>
            {links.map((link) => {
                return <NavigationMenuItem key={link.href}>
                    <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), curPath == link.href && "bg-accent text-accent-foreground")}>
                        <Link href={link.href}>{link.name}</Link>
                    </NavigationMenuLink>
                </NavigationMenuItem>;
            })}
        </NavigationMenuList>
    </NavigationMenu>
}