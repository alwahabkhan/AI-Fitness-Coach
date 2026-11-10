import React, { useState } from "react";
import ExerciseGroup from "./ExerciseGroup";
import { Clock } from "lucide-react";

type Exercise = {
  id: string;
  title: string;
  sets: number;
  reps: number;
  weight?: string;
};

type Group = {
  id: string;
  title: string;
  exercises: Exercise[];
};

interface SidebarProps {
  groups: Group[];
  openGroups: Record<string, boolean>;
  selectedExercise: Exercise | null;
  toggleGroup: (id: string) => void;
  setSelectedExercise: (exercise: Exercise) => void;
}

export default function Sidebar({
  groups,
  openGroups,
  selectedExercise,
  toggleGroup,
  setSelectedExercise,
}: SidebarProps) {
  const [activeSteps, setActiveSteps] = useState<Record<string, number>>({});

  const handleStepClick = (exerciseId: string, step: number) => {
    setActiveSteps((prev) => ({
      ...prev,
      [exerciseId]: step,
    }));
  };

  return (
    <aside className="col-span-3 border-r border-gray-200 p-6 bg-white rounded-md flex flex-col">
      {/* Sidebar Header */}
      <h3 className="text-lg mb-4">Exercise Plan</h3>

      {/* Scrollable Exercise List */}
      <div
        className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-100 scrollbar-track-gray-100"
        style={{ maxHeight: "100vh" }} // keeps it nicely sized within viewport
      >
        <ExerciseGroup
          groups={groups}
          selectedExercise={selectedExercise}
          setSelectedExercise={setSelectedExercise}
          bgColor="bg-blue-200"
        />
      </div>
    </aside>
  );
}
