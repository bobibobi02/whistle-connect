import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const FloatingActionButton = () => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <Link
      to="/create"
      className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
      aria-label="Create new post"
    >
      <Plus className="h-6 w-6" />
    </Link>
  );
};

export default FloatingActionButton;
