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

const NODE_COLORS = ["#7c3aed", "#5b21b6", "#3b82f6", "#22d3ee"];

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

    const nodes = users.map((user, idx) => {
      const color = NODE_COLORS[idx % NODE_COLORS.length];
      const textColor = idx % NODE_COLORS.length === 3 ? "#0f172a" : "#f8fafc";
      return {
        data: { id: user.id, label: user.name, color, textColor },
      };
    });

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
            "background-color": "data(color)",
            color: "data(textColor)",
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
            "line-color": "#3D3D3D",
            "target-arrow-color": "#3D3D3D",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": 9,
            color: "#DEDEDE",
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
      className="h-[340px] w-full rounded-xl border border-brand-300 bg-brand-100/50"
    />
  );
}
