// components/program-builder/ui/new/HeaderClientChooser.tsx
import { useState } from 'react';
import { UserWithoutPassword } from '@/lib/auth';
import { ClientData } from '../../PLACEHOLDER';
import SelectClientPopup from './popups/SelectClientPopup';

interface HeaderClientChooserProps {
  client: ClientData | null;
  trainees: UserWithoutPassword[];
  onClientChange: (client: ClientData) => void;
}

export default function HeaderClientChooser({ 
  client, 
  trainees, 
  onClientChange 
}: HeaderClientChooserProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        className="bg-white w-full md:w-fit mx-auto px-8 py-1 border border-[#B5C1C0] rounded-[6px] select-none cursor-pointer transition-all hover:shadow-md flex items-center justify-center gap-2"
        onClick={() => setIsOpen(true)}
      >
        <span>{client ? client.name : "Select Trainee"}</span>
      </button>

      <SelectClientPopup 
        isOpen={isOpen} 
        trainees={trainees} 
        onClose={() => setIsOpen(false)} 
        onSelect={(trainee) => {
          onClientChange({
            id: trainee.id,
            name: trainee.name,
            email: trainee.email
          });
          setIsOpen(false);
        }}
      />
    </div>
  );
}
