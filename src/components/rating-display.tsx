import { getRatingDisplay, RATING_MODES, type RatingMode } from "@/lib/rating-styles";

/**
 * Display a submitted rating value using the appropriate style.
 * Used in feedback/confirmation pages to show the user what they selected.
 */
export function RatingDisplay({
  value,
  mode = "stars",
  className = "",
}: {
  value: number;
  mode?: RatingMode;
  className?: string;
}) {
  if (mode === "stars") {
    return (
      <div className={`flex gap-2 ${className}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <svg
            key={n}
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={n <= value ? "text-emerald-500" : "text-slate-300"}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
    );
  }

  const icon = getRatingDisplay(value, mode);
  const sizeClass = mode === "thumbs" ? "text-6xl" : "text-5xl";

  return <span className={`${sizeClass} ${className}`}>{icon}</span>;
}

/**
 * Star rating component (SVG stars) for selecting a rating.
 * Shows stars filled based on hover or selected state.
 */
export function StarRatingInput({
  selectedRating,
  hoverRating,
  onSelect,
  onHoverEnter,
  onHoverLeave,
  disabled = false,
  size = "medium",
}: {
  selectedRating: number | null;
  hoverRating: number | null;
  onSelect: (rating: number) => void;
  onHoverEnter: (rating: number) => void;
  onHoverLeave: () => void;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
}) {
  const sizeMap = {
    small: { width: 32, height: 32, gap: "gap-2" },
    medium: { width: 60, height: 60, gap: "gap-4 sm:gap-6" },
    large: { width: 60, height: 60, gap: "gap-4" },
  };

  const { width, height, gap } = sizeMap[size];

  return (
    <div className={`flex justify-center ${gap}`}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          onClick={() => onSelect(rating)}
          onMouseEnter={() => onHoverEnter(rating)}
          onMouseLeave={onHoverLeave}
          disabled={disabled}
          type="button"
          className="transition-all"
        >
          <svg
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`transition-all duration-200 ${
              size === "medium"
                ? hoverRating !== null && rating <= hoverRating
                  ? "text-amber-400 scale-125"
                  : "text-slate-300"
                : hoverRating !== null && rating <= hoverRating
                  ? "text-emerald-500 scale-125"
                  : "text-slate-300"
            } disabled:opacity-60`}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

/**
 * Emoji rating input for faces and thumbs modes.
 * Shows emoji buttons that scale on hover.
 */
export function EmojiRatingInput({
  options,
  selectedValue,
  hoverValue,
  onSelect,
  onHoverEnter,
  onHoverLeave,
  disabled = false,
  isThumbs = false,
  showLabels = true,
}: {
  options: readonly { value: number; label: string; icon: string }[];
  selectedValue: number | null;
  hoverValue: number | null;
  onSelect: (value: number) => void;
  onHoverEnter: (value: number) => void;
  onHoverLeave: () => void;
  disabled?: boolean;
  isThumbs?: boolean;
  showLabels?: boolean;
}) {
  return (
    <div className={`flex justify-center ${isThumbs ? "gap-10" : "gap-6 sm:gap-10"}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          onMouseEnter={() => onHoverEnter(opt.value)}
          onMouseLeave={onHoverLeave}
          disabled={disabled}
          type="button"
          className="flex flex-col items-center gap-2 transition-all"
        >
          <span
            className={`transition-all duration-200 select-none ${isThumbs ? "text-6xl" : "text-5xl"} ${
              hoverValue === opt.value ? "scale-125" : ""
            }`}
          >
            {opt.icon}
          </span>
          {showLabels && (
            <span className={`text-xs font-medium ${hoverValue === opt.value ? "text-slate-700" : "text-slate-400"}`}>
              {opt.label}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
