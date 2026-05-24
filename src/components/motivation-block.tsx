export interface MotivationBlockProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  decorationIcons?: React.ReactNode[];
}

export function MotivationBlock({
  title,
  subtitle,
  icon,
  decorationIcons = []
}: MotivationBlockProps) {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-800 p-6 text-white overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-2 right-2 text-2xl">✨</div>
      <div className="absolute bottom-2 left-2 text-xl">✨</div>

      {/* Main content */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold leading-tight mb-1">{title}</h3>
          <p className="text-sm text-indigo-100">{subtitle}</p>
        </div>
        {icon && (
          <div className="flex-shrink-0 text-5xl">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
