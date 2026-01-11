import { useState } from "react";
import { Calendar, Clock, X } from "lucide-react";
import { format, addHours, setHours, setMinutes } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SchedulePostDialogProps {
  scheduledAt: Date | null;
  onScheduleChange: (date: Date | null) => void;
  trigger?: React.ReactNode;
}

export function SchedulePostDialog({ scheduledAt, onScheduleChange, trigger }: SchedulePostDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(scheduledAt || undefined);
  const [selectedHour, setSelectedHour] = useState<string>(
    scheduledAt ? format(scheduledAt, "HH") : format(addHours(new Date(), 1), "HH")
  );
  const [selectedMinute, setSelectedMinute] = useState<string>(
    scheduledAt ? format(scheduledAt, "mm") : "00"
  );

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  const handleConfirm = () => {
    if (selectedDate) {
      const scheduledDateTime = setMinutes(
        setHours(selectedDate, parseInt(selectedHour)),
        parseInt(selectedMinute)
      );
      onScheduleChange(scheduledDateTime);
    }
    setOpen(false);
  };

  const handleClear = () => {
    onScheduleChange(null);
    setSelectedDate(undefined);
    setOpen(false);
  };

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Clock className="h-4 w-4" />
            {scheduledAt ? format(scheduledAt, "MMM d, h:mm a") : "Schedule"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Post</DialogTitle>
          <DialogDescription>
            Choose when you want this post to be published.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < minDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Hour</label>
              <Select value={selectedHour} onValueChange={setSelectedHour}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Minute</label>
              <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      :{minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {scheduledAt && (
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Scheduled for {format(scheduledAt, "PPP 'at' h:mm a")}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedDate}>
            {scheduledAt ? "Update Schedule" : "Schedule Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
