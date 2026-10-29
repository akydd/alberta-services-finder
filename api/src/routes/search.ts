import { Router } from "express";
import { z } from "zod";
import { search, autocomplete, FACET_FIELDS } from "../lib/search";
import type { Facets } from "../lib/types";

export const searchRouter = Router();

/** Accept a facet value as a single string or an array; normalise to string[]. */
const facetValue = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]));

const searchQuerySchema = z.object({
  q: z.string().optional().default(""),
  from: z.coerce.number().int().min(0).max(1000).optional().default(0),
  size: z.coerce.number().int().min(1).max(50).optional().default(10),
  category: facetValue,
  ministry: facetValue,
  audience: facetValue,
  deliveryChannel: facetValue,
  cost: facetValue,
});

searchRouter.get("/search", async (req, res, next) => {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query", details: parsed.error.issues });
    }
    const { q, from, size, ...rest } = parsed.data;

    const filters: Facets = {};
    for (const field of FACET_FIELDS) {
      if (rest[field]) filters[field] = rest[field];
    }

    const result = await search({ q, from, size, filters });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const autocompleteSchema = z.object({
  q: z.string().optional().default(""),
});

searchRouter.get("/autocomplete", async (req, res, next) => {
  try {
    const parsed = autocompleteSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query" });
    }
    const suggestions = await autocomplete(parsed.data.q);
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});
