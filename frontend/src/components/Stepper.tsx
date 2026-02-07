interface StepperProps {
  current: number;
  total: number;
}

export default function Stepper({ current, total }: StepperProps) {
  return (
    <div className="flex items-center gap-2 mb-4" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full transition-colors ${
            i <= current ? 'bg-brand-500' : 'bg-gray-200'
          }`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-2">
        {current + 1}/{total}
      </span>
    </div>
  );
}
