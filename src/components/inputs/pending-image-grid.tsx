/* eslint-disable @next/next/no-img-element */
"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { useId } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

import { Button } from "~/components/ui/button";

export type PendingFile = {
  /** Stable client-assigned id (not a DB id). */
  id: string;
  /** object URL created via URL.createObjectURL — caller owns lifecycle. */
  previewUrl: string;
  file: File;
};

type SortableTileProps = {
  item: PendingFile;
  onRemove: (id: string) => void;
};

function SortableTile({ item, onRemove }: SortableTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
    >
      <img
        src={item.previewUrl}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover"
      />

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${item.file.name}`}
        className="absolute top-2 left-2 cursor-grab rounded bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-white" aria-hidden="true" />
      </div>

      {/* Remove button */}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        aria-label={`Remove ${item.file.name}`}
        onClick={() => onRemove(item.id)}
        className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>

      {/* File name tooltip */}
      <div className="absolute right-0 bottom-0 left-0 truncate bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {item.file.name}
      </div>
    </div>
  );
}

type PendingImageGridProps = {
  items: PendingFile[];
  onReorder: (items: PendingFile[]) => void;
  onRemove: (id: string) => void;
};

export function PendingImageGrid({
  items,
  onReorder,
  onRemove,
}: PendingImageGridProps) {
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  if (items.length === 0) return null;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <SortableTile key={item.id} item={item} onRemove={onRemove} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
