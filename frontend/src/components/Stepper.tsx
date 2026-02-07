interface StepperProps {
  current: number;
  total: number;
}

export default function Stepper({ current, total }: StepperProps) {
  return (
    <div className="flex items-center gap-3 w-full" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            i <= current ? 'bg-brand-500' : 'bg-sand/60'
          }`}
        />
      ))}
      <span className="text-sm text-muted font-medium tabular-nums ml-1">
        {current + 1}/{total}
      </span>
    </div>
  );
}
