import { cn } from "@/lib/utils"
import { Colors } from "./Colors"

const Legend = [
    "Low Volume (1-5 sets)",
    "Moderate Volume (6-15 sets)",
    "High Volume (16-20 sets)",
    "Very High Volume (21-25 sets)",
    "Overtraining (26-30 sets)",
]
export default function VolumeLegend() {
    return <div className="flex flex-col gap-3">
        <span className="text-[#012B59]">Volume Legend</span>
        {Object.keys(Colors.VolumeLegend).map((color, index) => {
            return <div className="flex items-center gap-5" key={color}>
                <div className={cn("w-10 h-7 rounded-sm",
                    { 'bg-[#B9F8CF]': index === 0 },
                    { 'bg-[#05E072]': index === 1 },
                    { 'bg-[#00A63E]': index === 2 },
                    { 'bg-[#FB2C37]': index === 3 },
                    { 'bg-[#cf1b24]': index === 4 }
                )}></div>
                <span className="text-[#757575]">{Legend[index]}</span>
            </div>
        })}
    </div>
}