interface YesNoQuestionProps {
  question: string;
  onAnswer: (answer: 'yes' | 'no') => void;
  selected?: 'yes' | 'no';
}

export default function YesNoQuestion({ question, onAnswer, selected }: YesNoQuestionProps) {
  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-gray-800">{question}</p>
      <div className="flex gap-3">
        <button
          onClick={() => onAnswer('yes')}
          className={`flex-1 py-4 px-6 rounded-xl text-lg font-medium transition-all ${
            selected === 'yes'
              ? 'bg-brand-500 text-white shadow-lg scale-105'
              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50'
          }`}
          aria-pressed={selected === 'yes'}
        >
          Yes
        </button>
        <button
          onClick={() => onAnswer('no')}
          className={`flex-1 py-4 px-6 rounded-xl text-lg font-medium transition-all ${
            selected === 'no'
              ? 'bg-gray-700 text-white shadow-lg scale-105'
              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
          }`}
          aria-pressed={selected === 'no'}
        >
          No
        </button>
      </div>
    </div>
  );
}
