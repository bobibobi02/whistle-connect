import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ThemeToggle = () => {
  const { setTheme, theme } = useTheme();

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  const handleThemeChange = (value: "light" | "dark" | "system") => {
    if (value === theme) return;
    
    setTheme(value);
    
    const labels = { light: "Light", dark: "Dark", system: "System" };
    toast({
      title: "Theme updated",
      description: `Switched to ${labels[value]} mode`,
      duration: 2000,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={cn(
            "relative overflow-hidden transition-colors",
            "hover:bg-primary/10 hover:text-primary"
          )}
        >
          <Sun className={cn(
            "h-5 w-5 transition-all duration-300",
            theme === "light" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0 absolute"
          )} />
          <Moon className={cn(
            "h-5 w-5 transition-all duration-300",
            theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0 absolute"
          )} />
          <Monitor className={cn(
            "h-5 w-5 transition-all duration-300",
            theme === "system" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0 absolute"
          )} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border border-border shadow-lg">
        {options.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem 
            key={value}
            onClick={() => handleThemeChange(value)} 
            className="gap-2 cursor-pointer"
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {theme === value && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
