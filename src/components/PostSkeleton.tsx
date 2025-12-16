import { Skeleton } from "@/components/ui/skeleton";

interface PostSkeletonProps {
  count?: number;
}

const PostSkeleton = ({ count = 3 }: PostSkeletonProps) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl shadow-card p-4 animate-pulse">
          {/* Header with avatar and community info */}
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          
          {/* Title */}
          <Skeleton className="h-6 w-4/5 mb-3" />
          
          {/* Content preview */}
          <div className="space-y-2 mb-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          
          {/* Random image placeholder (every other skeleton) */}
          {i % 2 === 1 && (
            <Skeleton className="h-48 w-full rounded-lg mb-4" />
          )}
          
          {/* Actions bar */}
          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostSkeleton;
