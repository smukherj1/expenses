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
    { name: "Edit", href: "/edit" },
];

export default function NavMenu() {
    const curPath = usePathname();
    return <NavigationMenu>
        <NavigationMenuList>
            {links.map((link) => {
                return <NavigationMenuItem key={link.href}>
                    <Link href={link.href} passHref>
                        <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), curPath == link.href && "bg-accent text-accent-foreground")}>
                            {link.name}
                        </NavigationMenuLink>
                    </Link>
                </NavigationMenuItem>;
            })}
        </NavigationMenuList>
    </NavigationMenu>
}