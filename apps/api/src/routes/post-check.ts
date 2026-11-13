import { checkPost, MAX_POST_CHARS } from "@resibo/proof";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../errors.js";

const body = z.object({ post: z.string() });

/**
 * POST /post-check: job post text in, red-flag signals with exact quotes out.
 * Deterministic rules only; works with every LLM off (FR-18). The post text is
 * never stored or logged (NFR-10, AGENTS.md #13); errors never echo it.
 */
export function postCheckRouter(): Router {
  const router = Router();
  router.post("/post-check", (req, res) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "invalid_request", 'Send JSON like {"post": "<the job post text>"}');
    }
    const post = parsed.data.post;
    if (post.trim().length === 0) {
      throw new HttpError(400, "empty_post", "Paste the job post text to check.");
    }
    if (post.length > MAX_POST_CHARS) {
      throw new HttpError(
        413,
        "post_too_long",
        `That is more than we can check at once. The limit is ${MAX_POST_CHARS.toLocaleString("en-US")} characters. Paste the part that lists the requirements and pay.`,
      );
    }
    const { signals, rulesRun } = checkPost(post);
    res.json({
      signals: signals.map((s) => ({
        rule_id: s.ruleId,
        label: s.label,
        quote: s.quote,
        start: s.start,
        end: s.end,
      })),
      rules_run: rulesRun,
    });
  });
  return router;
}
