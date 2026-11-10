import { cn } from "@/lib/utils"

interface ButtonStateInterface {
    workout: ["Workout", boolean],
    volume: ["Volume", boolean],
    progress: ["Progress", boolean]
}

export default function HeaderViewSwitcher({ 
    tab, 
    setTab, 
    userRole 
}: { 
    tab: 'Workout' | 'Volume' | 'Progress', 
    setTab: (tab: 'Workout' | 'Volume' | 'Progress') => void,
    userRole?: 'trainer' | 'trainee' | 'admin'
}) {
    // For trainees, only show Workout tab
    // For trainers and admins, show all tabs
    const isTrainerOrAdmin = userRole === 'trainer' || userRole === 'admin';
    
    const ButtonState: ButtonStateInterface = {
        workout: ["Workout", tab === "Workout"],
        volume: ["Volume", tab === "Volume"],
        progress: ["Progress", tab === "Progress"]
    }
    
    // Filter buttons based on user role
    const visibleButtons = isTrainerOrAdmin 
        ? Object.values(ButtonState)
        : [ButtonState.workout];
    
    return <div className="bg-white border border-[#CBD5E1] rounded-[6px] flex p-1 w-full md:w-fit ml-auto mr-auto md:mr-0 gap-1">
        {visibleButtons.map(([label, isActive]) => {
            return <button key={`${label}`} className={
                cn(
                    "px-3 py-1.5 rounded-sm text-sm font-[500] cursor-pointer transition-all select-none",
                    isActive ? "bg-[#F1F5F9]" : "bg-white text-[#909090]",
                    isActive ? "hover:shadow-sm" : "hover:bg-[#F1F5F9]/50 hover:shadow-sm",
                    "w-full"
                )
            } onClick={() => setTab(label as 'Workout' | 'Volume' | 'Progress')}>{label}</button>
        })}
    </div>
}