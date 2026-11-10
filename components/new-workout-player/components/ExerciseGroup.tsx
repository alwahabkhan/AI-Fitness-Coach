import React, { useState } from "react";
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

interface ExerciseGroupProps {
  groups: Group[];
  selectedExercise: Exercise | null;
  setSelectedExercise: (exercise: Exercise) => void;
  bgColor?: string; // 🟢 dynamic background color prop
}

export default function ExerciseGroup({
  groups,
  selectedExercise,
  setSelectedExercise,
  bgColor = "bg-white", // default background
}: ExerciseGroupProps) {
  const [activeSteps, setActiveSteps] = useState<Record<string, number>>({});

  const handleStepClick = (exerciseId: string, step: number) => {
    setActiveSteps((prev) => ({
      ...prev,
      [exerciseId]: step,
    }));
  };

  return (
    <>
   {groups.map((g) => (
        <div key={g.id} className="rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 font-medium">{g.title}</div>
            <button className="text-xs font-bold px-2 rounded-md border border-gray-200">
              3x
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {g.exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className={`w-full text-left p-2 rounded-md transition-colors border border-gray-200 ${
                  selectedExercise?.id === ex.id
                    ? `${bgColor} border border-blue-100`
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-start">
                  <div className="mr-2">
                    <input
                      type="checkbox"
                      className="appearance-none w-3 h-3 border border-gray-400 rounded-full checked:bg-blue-600 checked:border-blue-600 cursor-pointer transition-all"
                    />
                  </div>
                  <div className="mt-1">
                    <div className="text-xs">{ex.title}</div>
                    <div className="text-xs text-gray-500">
                      {ex.sets}×{ex.reps}  <span>•</span> {ex.weight ?? "—"}
                    </div>

                    {/* 🔵 Step indicators */}
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStepClick(ex.id, step);
                          }}
                          className={`w-5 h-5 flex items-center justify-center text-[10px] rounded-full border-2 transition-all cursor-pointer ${
                            activeSteps[ex.id] === step
                              ? "border-blue-500 text-gray-900 bg-white shadow-sm"
                              : "border-gray-100 text-gray-400 bg-blue-50"
                          }`}
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            <div className="mt-2 text-left flex items-center text-xs text-blue-800 bg-blue-50 py-2 px-2 rounded-md">
              <Clock size={16} className="text-blue-700" />
              <span className="ml-1">Rest 60s</span>
            </div>
            <div className="h-px w-full bg-gray-200" />

            <div className="border-none border-1 h-1"></div>
          </div>
        </div>
      ))}
 </>
  );
}
