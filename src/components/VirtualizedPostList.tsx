import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import PostCard from "@/components/PostCard";
import PostSkeleton from "@/components/PostSkeleton";
import { Post } from "@/hooks/usePosts";
import { Loader2 } from "lucide-react";

interface VirtualizedPostListProps {
  posts: Post[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  isLoading?: boolean;
}

const VirtualizedPostList = ({
  posts,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading,
}: VirtualizedPostListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: posts.length + (hasNextPage ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();

  // Trigger fetch when near the end
  useEffect(() => {
    const lastItem = items[items.length - 1];
    if (
      lastItem &&
      lastItem.index >= posts.length - 3 &&
      hasNextPage &&
      !isFetchingNextPage &&
      fetchNextPage
    ) {
      fetchNextPage();
    }
  }, [items, posts.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <PostSkeleton count={4} />;
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-200px)] overflow-auto scrollbar-thin"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {items.map((virtualItem) => {
          const isLoaderRow = virtualItem.index >= posts.length;
          const post = posts[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {isLoaderRow ? (
                <div className="py-4 flex justify-center">
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Loading more...</span>
                    </div>
                  ) : hasNextPage ? (
                    <span className="text-sm text-muted-foreground">
                      Scroll for more
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="pb-4">
                  <PostCard post={post} index={virtualItem.index} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* End of list indicator */}
      {!hasNextPage && posts.length > 10 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          You've reached the end
        </p>
      )}
    </div>
  );
};

export default VirtualizedPostList;
