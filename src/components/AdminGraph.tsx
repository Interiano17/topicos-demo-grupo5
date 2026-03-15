"use client";

import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import { cosineSimilarity } from "@/lib/recommendationEngine";

type User = { id: string; name: string };
type Choice = { user_id: string; movie_id: number };

type Props = {
  users: User[];
  choices: Choice[];
  similarityThreshold: number;
};

export function AdminGraph({ users, choices, similarityThreshold }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const movieIds = [...new Set(choices.map((choice) => choice.movie_id))];
    const vectors = users.reduce<Record<string, number[]>>((acc, user) => {
      const selected = new Set(
        choices.filter((choice) => choice.user_id === user.id).map((choice) => choice.movie_id),
      );
      acc[user.id] = movieIds.map((movieId) => (selected.has(movieId) ? 1 : 0));
      return acc;
    }, {});

    const nodes = users.map((user) => ({
      data: { id: user.id, label: user.name },
    }));

    const edges: { data: { source: string; target: string; label: string } }[] = [];
    for (let i = 0; i < users.length; i += 1) {
      for (let j = i + 1; j < users.length; j += 1) {
        const a = users[i];
        const b = users[j];
        const sim = cosineSimilarity(vectors[a.id] ?? [], vectors[b.id] ?? []);
        if (sim >= similarityThreshold) {
          edges.push({
            data: {
              source: a.id,
              target: b.id,
              label: sim.toFixed(2),
            },
          });
        }
      }
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": "#6b5223",
            color: "#2f2411",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": 10,
            width: 28,
            height: 28,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#b99a51",
            "target-arrow-color": "#b99a51",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": 9,
            color: "#6b5223",
          },
        },
      ],
      layout: {
        name: "cose",
        animate: false,
      },
    });

    return () => {
      cy.destroy();
    };
  }, [users, choices, similarityThreshold]);

  return (
    <div
      ref={containerRef}
      className="h-[340px] w-full rounded-xl border border-brand-200 bg-white"
    />
  );
}
