import { useRef, useEffect, useMemo, useImperativeHandle, forwardRef } from "react";
import { useVirtualizer, Virtualizer } from "@tanstack/react-virtual";
import PostCard from "@/components/PostCard";
import PostSkeleton from "@/components/PostSkeleton";
import { Post } from "@/hooks/usePosts";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedAdSlot } from "@/components/FeedAdSlot";
import { usePlacement } from "@/hooks/useAds";

// Inline loading skeleton that matches PostCard exactly
const LoadingPostSkeleton = () => (
  <div className="bg-card rounded-xl shadow-card p-4 animate-pulse">
    {/* Header with avatar and community info */}
    <div className="flex items-center gap-3 mb-4">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-36" />
      </div>
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
    
    {/* Title */}
    <Skeleton className="h-5 w-4/5 mb-2" />
    
    {/* Content preview */}
    <div className="space-y-1.5 mb-3">
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-3/4" />
    </div>
    
    {/* Actions bar - matches vote/comment/share layout */}
    <div className="flex items-center gap-1.5 pt-3">
      <Skeleton className="h-8 w-20 rounded-full" />
      <Skeleton className="h-8 w-16 rounded-full" />
      <Skeleton className="h-8 w-14 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-full ml-auto" />
    </div>
  </div>
);

export interface VirtualizedPostListHandle {
  virtualizer: Virtualizer<HTMLDivElement, Element> | null;
}

interface VirtualizedPostListProps {
  posts: Post[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  isLoading?: boolean;
  communityName?: string;
  focusedPostId?: string | null;
}

type FeedItem = { type: "post"; post: Post; index: number } | { type: "ad"; index: number };

const VirtualizedPostList = forwardRef<VirtualizedPostListHandle, VirtualizedPostListProps>(({
  posts,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading,
  communityName,
  focusedPostId,
}, ref) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const { data: placement } = usePlacement("FEED_INLINE");
  
  // Default to showing an ad every 10 posts
  const adFrequency = placement?.insertion_frequency ?? 10;

  // Build feed items with ads interspersed
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    posts.forEach((post, idx) => {
      items.push({ type: "post", post, index: idx });
      // Insert ad after every N posts (if placement is enabled)
      if (placement?.enabled && (idx + 1) % adFrequency === 0 && idx < posts.length - 1) {
        items.push({ type: "ad", index: Math.floor((idx + 1) / adFrequency) });
      }
    });
    return items;
  }, [posts, placement, adFrequency]);

  const virtualizer = useVirtualizer({
    count: feedItems.length + (hasNextPage ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  // Expose virtualizer to parent via ref for keyboard navigation
  useImperativeHandle(ref, () => ({
    virtualizer,
  }), [virtualizer]);

  const items = virtualizer.getVirtualItems();

  // Trigger fetch when near the end
  useEffect(() => {
    const lastItem = items[items.length - 1];
    if (
      lastItem &&
      lastItem.index >= feedItems.length - 3 &&
      hasNextPage &&
      !isFetchingNextPage &&
      fetchNextPage
    ) {
      fetchNextPage();
    }
  }, [items, feedItems.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <PostSkeleton count={4} />;
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-200px)] overflow-y-auto overflow-x-hidden scrollbar-hide"
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
          const isLoaderRow = virtualItem.index >= feedItems.length;
          const feedItem = feedItems[virtualItem.index];

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
                <div className="pb-4">
                  {isFetchingNextPage ? (
                    <LoadingPostSkeleton />
                  ) : hasNextPage ? (
                    <div className="py-4 flex justify-center">
                      <span className="text-sm text-muted-foreground">
                        Scroll for more
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : feedItem?.type === "ad" ? (
                <div className="pb-4">
                  <FeedAdSlot loopId={communityName} />
                </div>
              ) : feedItem?.type === "post" ? (
                <div className="pb-4">
                  <PostCard 
                    post={feedItem.post} 
                    index={feedItem.index}
                    isFocused={focusedPostId === feedItem.post.id}
                  />
                </div>
              ) : null}
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
});

VirtualizedPostList.displayName = "VirtualizedPostList";

export default VirtualizedPostList;
