import { useNavigate, useLocation } from "react-router-dom";
import { Home, Users, Star, BookHeart, Image, Bell, CalendarHeart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  userId?: string;
  unreadCount?: number;
}

export const MobileNav = ({ userId, unreadCount = 0 }: MobileNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "首页" },
    { path: "/rating", icon: Star, label: "评分" },
    { path: "/weekend-plans", icon: CalendarHeart, label: "约会" },
    { path: "/wishlist", icon: MapPin, label: "愿望" },
    { path: "/diary", icon: BookHeart, label: "日记" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-3 relative",
                active && "text-primary"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "fill-current")} />
              <span className="text-xs">{item.label}</span>
              {item.path === "/approvals" && unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-xs flex items-center justify-center text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          );
        })}
        
        {/* Notifications button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/approvals")}
          className={cn(
            "flex flex-col items-center gap-1 h-auto py-2 px-3 relative",
            location.pathname === "/approvals" && "text-primary"
          )}
        >
          <Bell className={cn("h-5 w-5", location.pathname === "/approvals" && "fill-current")} />
          <span className="text-xs">通知</span>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-xs flex items-center justify-center text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
