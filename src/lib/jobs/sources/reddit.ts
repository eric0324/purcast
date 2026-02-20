import type { FetchedArticle } from "./types";
import type { RedditSort } from "../types";
import { HARD_LIMITS } from "@/lib/config/plan";

const FETCH_TIMEOUT = 30_000;
const USER_AGENT = "PurCast/1.0 (podcast generator; +https://purcast.com)";
const MAX_POSTS = HARD_LIMITS.redditMaxPosts;
const MAX_COMMENTS = HARD_LIMITS.redditMaxComments;

interface RedditPost {
  title: string;
  url: string;
  selftext: string;
  permalink: string;
  is_self: boolean;
  created_utc: number;
  score: number;
  num_comments: number;
}

interface RedditComment {
  body: string;
  author: string;
  score: number;
}

export async function fetchReddit(
  url: string,
  options?: { sort?: RedditSort; includeComments?: boolean }
): Promise<FetchedArticle[]> {
  const sort = options?.sort ?? "hot";
  const includeComments = options?.includeComments ?? true;

  // Extract subreddit name from URL or direct name
  const subreddit = parseSubreddit(url);
  if (!subreddit) {
    console.error(`[Reddit] Cannot parse subreddit from: ${url}`);
    return [];
  }

  const redditSort = mapSort(sort);
  const apiUrl = `https://www.reddit.com/r/${subreddit}/${redditSort}.json?limit=${MAX_POSTS}${getSortQuery(sort)}`;

  try {
    const posts = await fetchRedditJson<{ data: { children: { data: RedditPost }[] } }>(apiUrl);
    if (!posts?.data?.children) {
      console.error(`[Reddit] No data returned for r/${subreddit}`);
      return [];
    }

    const articles: FetchedArticle[] = [];

    for (const child of posts.data.children) {
      const post = child.data;
      if (!post.title) continue;

      let content = "";

      // Build content from selftext or note it's a link post
      if (post.is_self && post.selftext) {
        content = post.selftext;
      } else if (!post.is_self) {
        content = `[Link post: ${post.url}]`;
      }

      // Fetch top comments if enabled
      if (includeComments && post.num_comments > 0) {
        const comments = await fetchPostComments(subreddit, post.permalink);
        if (comments.length > 0) {
          content += "\n\n---\nTop comments:\n";
          for (const comment of comments) {
            content += `\n- u/${comment.author} (${comment.score} pts): ${comment.body}`;
          }
        }
      }

      if (!content.trim()) continue;

      articles.push({
        title: post.title,
        url: `https://www.reddit.com${post.permalink}`,
        content: content.trim(),
        publishedAt: new Date(post.created_utc * 1000),
      });
    }

    return articles;
  } catch (error) {
    console.error(`[Reddit] Failed to fetch r/${subreddit}:`, error);
    return [];
  }
}

function parseSubreddit(input: string): string | null {
  // Handle full URLs: https://reddit.com/r/programming, https://www.reddit.com/r/programming/hot
  const urlMatch = input.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)/);
  if (urlMatch) return urlMatch[1];

  // Handle r/subreddit format
  const rSlashMatch = input.match(/^r\/([a-zA-Z0-9_]+)$/);
  if (rSlashMatch) return rSlashMatch[1];

  // Handle plain subreddit name
  if (/^[a-zA-Z0-9_]+$/.test(input)) return input;

  return null;
}

function mapSort(sort: RedditSort): string {
  switch (sort) {
    case "top_day":
    case "top_week":
    case "top_month":
      return "top";
    default:
      return sort;
  }
}

function getSortQuery(sort: RedditSort): string {
  switch (sort) {
    case "top_day":
      return "&t=day";
    case "top_week":
      return "&t=week";
    case "top_month":
      return "&t=month";
    default:
      return "";
  }
}

async function fetchPostComments(
  subreddit: string,
  permalink: string
): Promise<RedditComment[]> {
  try {
    const url = `https://www.reddit.com${permalink}.json?limit=${MAX_COMMENTS}&sort=top`;
    const data = await fetchRedditJson<
      [unknown, { data: { children: { kind: string; data: RedditComment }[] } }]
    >(url);

    if (!Array.isArray(data) || data.length < 2) return [];

    const commentListing = data[1];
    if (!commentListing?.data?.children) return [];

    return commentListing.data.children
      .filter((c) => c.kind === "t1" && c.data.body)
      .slice(0, MAX_COMMENTS)
      .map((c) => ({
        body: c.data.body.slice(0, 500), // Truncate long comments
        author: c.data.author || "[deleted]",
        score: c.data.score || 0,
      }));
  } catch (error) {
    console.error(`[Reddit] Failed to fetch comments for ${permalink}:`, error);
    return [];
  }
}

async function fetchRedditJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
