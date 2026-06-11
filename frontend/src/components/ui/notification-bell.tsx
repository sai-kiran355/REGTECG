import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { apiClient } from "../../api/client";
import { useAuthStore } from "../../store/authStore";

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await apiClient.get("/api/v1/chat/unread-count");
      const unread = response.data?.unread_count ?? 0;
      setCount(unread);
    } catch (error) {
      console.error("Failed to fetch notification unread count:", error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCount(0);
      return;
    }

    // Fetch immediately on mount
    fetchUnreadCount();

    // Poll every 5 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount]);

  const handleClick = () => {
    // Reset local count to 0 for instant visual response
    setCount(0);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative h-9 w-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors shadow-none"
      onClick={handleClick}
      aria-label="Notifications"
    >
      <Bell size={16} strokeWidth={2} aria-hidden="true" />
      {count > 0 && (
        <Badge className="absolute -top-1.5 left-full min-w-5 -translate-x-1/2 px-1 py-0.5 flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold rounded-full border border-white">
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Button>
  );
}
