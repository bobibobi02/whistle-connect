import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ThemeToggle = () => {
  const { setTheme, theme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    // Simple toggle between light and dark
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className={cn(
            "relative overflow-hidden transition-colors",
            "hover:bg-primary/10 hover:text-primary"
          )}
        >
          <Sun className={cn(
            "h-5 w-5 transition-all duration-300",
            resolvedTheme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          )} />
          <Moon className={cn(
            "absolute h-5 w-5 transition-all duration-300",
            resolvedTheme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          )} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ThemeToggle;
