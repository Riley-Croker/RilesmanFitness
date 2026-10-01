"use client";

// Reorder mode for the workout logger: every exercise collapsed to one line,
// dragged by its ⠿ handle. Built on dnd-kit (@dnd-kit/core + sortable).
//
// How dragging works here:
//   - Only the handle starts a drag. It has `touch-action: none` so on a
//     phone, pressing it drags instead of scrolling; swiping anywhere else on
//     the row still scrolls the page as normal.
//   - While dragging, dnd-kit doesn't touch the exercise list itself. It
//     moves the rows visually with CSS transforms, then onDragEnd reports
//     "item X was dropped over item Y" and we produce the new order with
//     arrayMove. Nothing is reordered until the drop.
//   - Keyboard works too: focus a handle, Space to pick up, arrow keys to
//     move, Space to drop, Escape to cancel. Screen readers get announcements.
//
// Rows are identified by each exercise's stable `uid`, never by position -
// see the note on keys in learning/03-react-components.md.

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import ExerciseImage from "@/components/exercise-image";
import type { DraftExercise } from "@/lib/workout-draft";

// The logger's exercise, guaranteed to have its uid.
export type ReorderItem = DraftExercise & { uid: string };

export default function ExerciseReorderList({
  exercises,
  onReorder,
}: {
  exercises: ReorderItem[];
  onReorder: (next: ReorderItem[]) => void;
}) {
  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so a plain tap on the
    // handle doesn't count as a (zero-distance) drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // What screen readers hear. dnd-kit's defaults read out the item's id -
  // here a random uid like "ed12a34f-9c47-…" - so say names and positions.
  const nameOf = (id: UniqueIdentifier) => exercises.find((e) => e.uid === id)?.name ?? "exercise";
  const position = (id: UniqueIdentifier) =>
    `position ${exercises.findIndex((e) => e.uid === id) + 1} of ${exercises.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}, ${position(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} moved to ${position(over.id)}.` : `${nameOf(active.id)} is no longer over the list.`,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} dropped at ${position(over.id)}.` : `${nameOf(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Reordering cancelled. ${nameOf(active.id)} returned to ${position(active.id)}.`,
  };
  const screenReaderInstructions = {
    draggable:
      "To reorder, press space or enter to pick up the exercise, use the up and down arrow keys to move it, then press space or enter to drop it, or escape to cancel.",
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = exercises.findIndex((e) => e.uid === active.id);
    const to = exercises.findIndex((e) => e.uid === over.id);
    if (from === -1 || to === -1) return;
    onReorder(arrayMove(exercises, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements, screenReaderInstructions }}
    >
      <SortableContext items={exercises.map((e) => e.uid)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {exercises.map((ex) => (
            <Row key={ex.uid} item={ex} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Row({ item }: { item: ReorderItem }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.uid });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-xl border bg-zinc-900 px-2 py-2 ${
        isDragging ? "relative z-10 border-lime-400 shadow-lg shadow-black/50" : "border-zinc-800"
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${item.name}`}
        className="flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-xl leading-none text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 active:cursor-grabbing"
      >
        ⠿
      </button>
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-white">
        <ExerciseImage images={item.images ?? []} alt="" animate={false} className="h-full w-full object-cover" />
      </div>
      <p className="min-w-0 flex-1 truncate font-medium capitalize">{item.name}</p>
      <span className="shrink-0 pr-2 text-xs tabular-nums text-zinc-500">
        {item.sets.length} set{item.sets.length === 1 ? "" : "s"}
      </span>
    </li>
  );
}
