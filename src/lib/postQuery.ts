/**
 * Resilient post query helper.
 * Tries `public_posts` view first (pre-filters drafts/removed/scheduled).
 * Falls back to `posts` table with client-side filters if the view doesn't exist.
 */

let useViewFallback = false;

/**
 * Returns the table name to query for posts.
 * Starts with "public_posts" (view), switches to "posts" after first 404.
 */
export const getPostsTable = (): string => {
  return useViewFallback ? "posts" : "public_posts";
};

/**
 * Call this when a query to public_posts returns PGRST205 or 42P01.
 * Subsequent calls to getPostsTable() will return "posts" instead.
 */
export const markViewMissing = (): void => {
  if (!useViewFallback) {
    console.warn("[Whistle] public_posts view not found, falling back to posts table");
    useViewFallback = true;
  }
};

/**
 * Check if an error indicates the view/table doesn't exist.
 */
export const isViewMissingError = (error: any): boolean => {
  const code = error?.code;
  return code === "PGRST205" || code === "42P01";
};

/**
 * Filter posts client-side to mimic what the public_posts view does.
 * Only needed when falling back to the raw posts table.
 */
export const filterPublishedPosts = (posts: any[]): any[] => {
  if (!useViewFallback) return posts; // View already filters
  return posts.filter((post) => {
    const isDraft = post.is_draft === true;
    const isRemoved = post.is_removed === true;
    const isScheduledFuture = post.scheduled_at && new Date(post.scheduled_at) > new Date();
    return !isDraft && !isRemoved && !isScheduledFuture;
  });
};
