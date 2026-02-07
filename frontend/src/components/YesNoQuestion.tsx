interface YesNoQuestionProps {
  question: string;
  onAnswer: (answer: 'yes' | 'no') => void;
  selected?: 'yes' | 'no';
}

export default function YesNoQuestion({ question, onAnswer, selected }: YesNoQuestionProps) {
  return (
    <div className="space-y-6">
      <p className="text-[28px] font-semibold text-ink leading-snug tracking-tight">{question}</p>
      <div className="flex gap-3">
        <button
          onClick={() => onAnswer('yes')}
          className={`flex-1 py-5 px-6 rounded-full text-lg font-medium transition-all ${
            selected === 'yes'
              ? 'bg-brand-500 text-white shadow-md scale-[1.02]'
              : 'bg-white border border-sand text-ink hover:border-brand-400 hover:bg-brand-50'
          }`}
          aria-pressed={selected === 'yes'}
        >
          Yes
        </button>
        <button
          onClick={() => onAnswer('no')}
          className={`flex-1 py-5 px-6 rounded-full text-lg font-medium transition-all ${
            selected === 'no'
              ? 'bg-ink text-white shadow-md scale-[1.02]'
              : 'bg-white border border-sand text-ink hover:border-ink/40 hover:bg-beige'
          }`}
          aria-pressed={selected === 'no'}
        >
          No
        </button>
      </div>
    </div>
  );
}
