// components/program-builder/ui/new/AddNewDayButton.tsx
import { useState } from "react";
import { cn } from "@/lib/utils";
import BlackPlus from "../icons/BlackPlus";
import NewDayPopup from "./popups/NewDayPopup";
import { UserWithoutPassword } from '@/lib/auth';

// components/program-builder/ui/new/AddNewDayButton.tsx
interface AddNewDayButtonProps {
  onAddDay: () => void;
  onCopyDay: (sourceDayId: string) => void;
  currentProgramId?: string;
  trainees?: UserWithoutPassword[];
}

export default function AddNewDayButton({ 
  onAddDay, 
  onCopyDay,
  currentProgramId,
  trainees = [] 
}: AddNewDayButtonProps) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    return (
        <>
            <button 
                className={cn(
                    "flex items-center gap-1 bg-white border border-[#CFD9E0] rounded-[6px] px-[24px] py-1.5",
                    "cursor-pointer transition-all",
                    "shadow-sm hover:shadow-md mb-32 lg:mb-0",
                )}
                onClick={() => setIsPopupOpen(true)}
            >
                <BlackPlus />
                <span>Add New Day</span>
            </button>

            <NewDayPopup 
                isOpen={isPopupOpen}
                onClose={() => setIsPopupOpen(false)}
                trainees={trainees}
                currentProgramId={currentProgramId}
                onAddDay={onAddDay}
                onCopyDay={onCopyDay}
            />
        </>
    );
}