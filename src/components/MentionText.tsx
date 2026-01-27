import { Link } from "react-router-dom";
import { Fragment } from "react";

interface MentionTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with @username mentions as clickable links.
 * Matches @username pattern where username contains letters, numbers, and underscores.
 */
const MentionText = ({ text, className }: MentionTextProps) => {
  if (!text) return null;

  // Match @username pattern (alphanumeric + underscores, 3-20 chars)
  const mentionPattern = /@([a-zA-Z0-9_]{3,20})\b/g;
  
  const parts: Array<{ type: "text" | "mention"; content: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }
    
    // Add the mention
    parts.push({
      type: "mention",
      content: match[1], // username without @
    });
    
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  // If no mentions found, return plain text
  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part.type === "mention" ? (
            <Link
              to={`/u/${part.content}`}
              className="text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              @{part.content}
            </Link>
          ) : (
            part.content
          )}
        </Fragment>
      ))}
    </span>
  );
};

export default MentionText;

/**
 * Extract all unique usernames mentioned in text
 */
export const extractMentions = (text: string): string[] => {
  if (!text) return [];
  
  const mentionPattern = /@([a-zA-Z0-9_]{3,20})\b/g;
  const mentions = new Set<string>();
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    mentions.add(match[1].toLowerCase());
  }

  return Array.from(mentions);
};
