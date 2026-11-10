// components/program-builder/ui/new/HeaderBackButton.tsx
import Back from "../icons/Back";

interface HeaderBackButtonProps {
  onBack: () => void;
}

export default function HeaderBackButton({ onBack }: HeaderBackButtonProps) {
    return <button onClick={onBack}>
        <Back />
    </button>
}