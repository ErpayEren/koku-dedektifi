import { Card } from './ui/Card';
import { CardTitle } from './ui/CardTitle';

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  chips?: string[];
}

export function FeaturePlaceholder({ title, description, chips = [] }: FeaturePlaceholderProps) {
  return (
    <div className="px-5 md:px-12 py-8 anim-up">
      <Card className="p-6 md:p-8" glow>
        <CardTitle>{title}</CardTitle>
        <p className="mb-4 text-[16px] font-semibold text-cream md:text-[20px]">{title}</p>
        <p className="text-[13px] text-muted leading-relaxed max-w-[720px]">{description}</p>
        {chips.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-6">
            {chips.map((chip) => (
              <span
                key={chip}
                className="text-[10px] font-mono tracking-[.08em] uppercase px-2.5 py-1
                           border border-white/[.08] rounded-[2px] text-muted"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
