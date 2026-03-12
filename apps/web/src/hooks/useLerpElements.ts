import { useEffect, useRef } from "react";
import { useCanvasStore, type SpatialTarget } from "../store/appStore";
import type { CanvasElement } from "@starter/shared";

const LERP_FACTOR = 0.25;
const SNAP_THRESHOLD = 0.5;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function isClose(el: CanvasElement, target: SpatialTarget): boolean {
  return (
    Math.abs(el.x - target.x) < SNAP_THRESHOLD &&
    Math.abs(el.y - target.y) < SNAP_THRESHOLD &&
    Math.abs(el.width - target.width) < SNAP_THRESHOLD &&
    Math.abs(el.height - target.height) < SNAP_THRESHOLD &&
    Math.abs(el.rotation - target.rotation) < SNAP_THRESHOLD
  );
}

export function useLerpElements() {
  const rafRef = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const state = useCanvasStore.getState();
      const targets = state.elementTargets;
      const ids = Object.keys(targets);

      if (ids.length === 0) {
        activeRef.current = false;
        return;
      }

      const remaining: Record<string, SpatialTarget> = {};
      const newElements = state.elements.map((el) => {
        const t = targets[el.id];
        if (!t) return el;

        if (isClose(el, t)) {
          return {
            ...el,
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height,
            rotation: t.rotation,
          } as CanvasElement;
        }

        remaining[el.id] = t;
        return {
          ...el,
          x: lerp(el.x, t.x, LERP_FACTOR),
          y: lerp(el.y, t.y, LERP_FACTOR),
          width: lerp(el.width, t.width, LERP_FACTOR),
          height: lerp(el.height, t.height, LERP_FACTOR),
          rotation: lerp(el.rotation, t.rotation, LERP_FACTOR),
        } as CanvasElement;
      });

      useCanvasStore.setState({
        elements: newElements,
        elementTargets: remaining,
      });

      if (Object.keys(remaining).length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        activeRef.current = false;
      }
    };

    const unsub = useCanvasStore.subscribe((state, prev) => {
      if (
        state.elementTargets !== prev.elementTargets &&
        Object.keys(state.elementTargets).length > 0 &&
        !activeRef.current
      ) {
        activeRef.current = true;
        rafRef.current = requestAnimationFrame(tick);
      }
    });

    return () => {
      unsub();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);
}
