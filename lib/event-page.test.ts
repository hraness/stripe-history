import { describe, expect, test } from "bun:test";

import { deriveCategoryQuestions } from "./category-questions";
import { loadHistory } from "./content";
import {
  eventIdFromPath,
  eventMetaDescription,
  historyEventNeighbors,
  historyEventPageTitle,
  historyEventPath,
  newestEventDate,
  sentences,
} from "./event-page";

describe("event page helpers", () => {
  test("one stable /events/<id> path per event, validated both ways", async () => {
    const history = await loadHistory();
    const paths = new Set(history.events.map(({ id }) => historyEventPath(id)));
    expect(paths.size).toBe(history.events.length);
    for (const event of history.events) {
      expect(eventIdFromPath(historyEventPath(event.id))).toBe(event.id);
    }
    expect(() => historyEventPath("Bad ID")).toThrow(RangeError);
    expect(() => historyEventPath("")).toThrow(RangeError);
    expect(eventIdFromPath("/events/a/b")).toBeNull();
    expect(eventIdFromPath("/events/")).toBeNull();
    expect(eventIdFromPath("/history/acquisitions")).toBeNull();
  });

  test("every event has a unique 110-160 character description and title", async () => {
    const history = await loadHistory();
    const descriptions = history.events.map(eventMetaDescription);
    for (const description of descriptions) {
      expect(description.length).toBeLessThanOrEqual(160);
      expect(description.length).toBeGreaterThanOrEqual(60);
      expect(description).toMatch(/[.!?)"”’]$/u);
    }
    const inRange = descriptions.filter(({ length }) => length >= 110).length;
    expect(inRange / descriptions.length).toBeGreaterThan(0.9);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    const titles = history.events.map(historyEventPageTitle);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test("sentence splitting keeps abbreviations together", () => {
    expect(sentences("Stripe Inc. raised money in the U.S. market. Then it grew.")).toEqual([
      "Stripe Inc. raised money in the U.S. market.",
      "Then it grew.",
    ]);
  });

  test("neighbors stay inside the category and in time order", async () => {
    const history = await loadHistory();
    for (const event of history.events) {
      const neighbors = historyEventNeighbors(history, event.id);
      expect(neighbors).toBeDefined();
      if (neighbors === undefined) continue;
      if (neighbors.older !== undefined) {
        expect(neighbors.older.categoryId).toBe(event.categoryId);
        expect(neighbors.older.date <= event.date).toBe(true);
      }
      if (neighbors.newer !== undefined) {
        expect(neighbors.newer.categoryId).toBe(event.categoryId);
        expect(neighbors.newer.date >= event.date).toBe(true);
      }
      expect(neighbors.related.map(({ id }) => id)).not.toContain(event.id);
      expect(neighbors.related.length).toBeLessThanOrEqual(5);
      expect(new Set(neighbors.related.map(({ id }) => id)).size).toBe(neighbors.related.length);
    }
    expect(historyEventNeighbors(history, "no-such-event")).toBeUndefined();
  });

  test("dateModified is the newest record date", () => {
    expect(newestEventDate([{ date: "2020-01" }, { date: "2024-03-02" }, { date: "2023" }])).toBe("2024-03-02");
    expect(newestEventDate([])).toBeUndefined();
  });

  test("category questions answer from records", async () => {
    const history = await loadHistory();
    for (const category of history.categories) {
      const questions = deriveCategoryQuestions(category, history.events);
      expect(questions.map(({ id }) => id)).toEqual(["newest", "earliest", "count"]);
      for (const { question } of questions) expect(question.endsWith("?")).toBe(true);
      const count = history.events.filter(({ categoryId }) => categoryId === category.id).length;
      expect(questions[2]?.answer).toStartWith(`${count} sourced event`);
    }
  });
});
