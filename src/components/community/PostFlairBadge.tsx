import { Badge } from "@/components/ui/badge";

interface PostFlairBadgeProps {
  name: string;
  color: string;
  backgroundColor: string;
  className?: string;
}

const PostFlairBadge = ({ name, color, backgroundColor, className }: PostFlairBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={className}
      style={{
        backgroundColor,
        color,
        borderColor: color,
      }}
    >
      {name}
    </Badge>
  );
};

export default PostFlairBadge;
