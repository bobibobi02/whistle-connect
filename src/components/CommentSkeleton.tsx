import { Skeleton } from "@/components/ui/skeleton";

interface CommentSkeletonProps {
  count?: number;
  showReplies?: boolean;
}

const CommentSkeleton = ({ count = 3, showReplies = true }: CommentSkeletonProps) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          {/* Comment header */}
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          
          {/* Comment content */}
          <div className="pl-9 space-y-2 mb-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          
          {/* Comment actions */}
          <div className="pl-9 flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          
          {/* Nested reply skeleton (for first and third items) */}
          {showReplies && (i === 0 || i === 2) && (
            <div className="ml-8 mt-3 pl-4 border-l-2 border-border">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="pl-8 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CommentSkeleton;
