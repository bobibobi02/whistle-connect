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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const ThemePreview = ({ themeType }: { themeType: "light" | "dark" | "system" }) => {
  const colors = {
    light: {
      bg: "bg-[hsl(210,40%,98%)]",
      card: "bg-white",
      text: "text-[hsl(220,15%,20%)]",
      muted: "text-[hsl(220,10%,50%)]",
      border: "border-[hsl(220,15%,85%)]",
      primary: "bg-[hsl(220,90%,56%)]",
    },
    dark: {
      bg: "bg-[hsl(240,10%,5%)]",
      card: "bg-[hsl(240,6%,10%)]",
      text: "text-[hsl(0,0%,95%)]",
      muted: "text-[hsl(240,5%,64%)]",
      border: "border-[hsl(240,4%,16%)]",
      primary: "bg-[hsl(220,90%,56%)]",
    },
    system: {
      bg: "bg-gradient-to-r from-[hsl(210,40%,98%)] to-[hsl(240,10%,5%)]",
      card: "bg-gradient-to-r from-white to-[hsl(240,6%,10%)]",
      text: "text-[hsl(220,15%,20%)]",
      muted: "text-[hsl(220,10%,50%)]",
      border: "border-[hsl(220,15%,85%)]",
      primary: "bg-[hsl(220,90%,56%)]",
    },
  };

  const c = colors[themeType];

  return (
    <div className={cn("w-32 h-20 rounded-md p-2 overflow-hidden", c.bg, c.border, "border")}>
      <div className={cn("w-full h-full rounded-sm p-1.5 space-y-1", c.card, c.border, "border")}>
        <div className={cn("h-1.5 w-12 rounded-full", c.primary)} />
        <div className={cn("h-1 w-full rounded-full opacity-60", c.text === "text-[hsl(0,0%,95%)]" ? "bg-white/30" : "bg-black/20")} />
        <div className={cn("h-1 w-3/4 rounded-full opacity-40", c.text === "text-[hsl(0,0%,95%)]" ? "bg-white/30" : "bg-black/20")} />
        <div className="flex gap-1 mt-1">
          <div className={cn("h-2 w-6 rounded-sm", c.primary, "opacity-80")} />
          <div className={cn("h-2 w-4 rounded-sm opacity-30", c.text === "text-[hsl(0,0%,95%)]" ? "bg-white/50" : "bg-black/30")} />
        </div>
      </div>
    </div>
  );
};

const ThemeToggle = () => {
  const { setTheme, theme } = useTheme();

  const options = [
    { value: "light", label: "Light", icon: Sun, description: "Clean and bright" },
    { value: "dark", label: "Dark", icon: Moon, description: "Easy on the eyes" },
    { value: "system", label: "System", icon: Monitor, description: "Match your OS" },
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
        {options.map(({ value, label, icon: Icon, description }) => (
          <HoverCard key={value} openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <DropdownMenuItem 
                onClick={() => handleThemeChange(value)} 
                className="gap-2 cursor-pointer"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
                {theme === value && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            </HoverCardTrigger>
            <HoverCardContent side="left" align="center" className="w-auto p-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">{label} Theme</div>
                <ThemePreview themeType={value} />
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
