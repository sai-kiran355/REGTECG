import React, { useState } from "react";
import { cn } from "../../lib/utils";
import { Sparkles } from "lucide-react";

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-blue-300" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName = "text-blue-500",
  titleClassName = "text-blue-500",
  onMouseEnter,
  onMouseLeave,
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-full max-w-[21rem] md:max-w-[22rem] -skew-y-[6deg] select-none flex-col justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm transition-all duration-500 ease-out hover:border-slate-300 hover:shadow-md",
        className
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center gap-3">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl p-1.5 shrink-0 shadow-sm", iconClassName)}>
          {icon}
        </span>
        <p className={cn("text-base font-bold tracking-tight", titleClassName)}>{title}</p>
      </div>
      <p className="text-sm font-medium text-slate-600 line-clamp-2 leading-relaxed">{description}</p>
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{date}</p>
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const defaultCards: DisplayCardProps[] = [
    {
      title: "AI KYC Verification",
      description: "Parse Aadhaar, PAN & passports via OCR",
      date: "KYC Cockpit",
    },
    {
      title: "AML Detection Logs",
      description: "Real-time anomalous transfer alerts",
      date: "Transaction Screen",
    },
    {
      title: "Sanctions Scanners",
      description: "OFAC & PEP phonetic name matching",
      date: "Lists Reviewer",
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <div className="relative w-full max-w-[24rem] h-[16rem] md:h-[18rem] flex items-center justify-center">
      <div className="absolute inset-0 grid [grid-template-areas:'stack'] place-items-center">
        {displayCards.map((cardProps, index) => {
          const isHovered = hoveredIndex === index;
          const anyHovered = hoveredIndex !== null;

          // Compute card positions in stack
          let positionClasses = "";
          if (index === 0) {
            positionClasses = "translate-x-0 translate-y-0 z-10";
          } else if (index === 1) {
            positionClasses = "translate-x-6 translate-y-4 md:translate-x-12 md:translate-y-8 z-20";
          } else {
            positionClasses = "translate-x-12 translate-y-8 md:translate-x-24 md:translate-y-16 z-30";
          }

          // Compute hover style adjustments
          let hoverClasses = "transition-all duration-500 ease-out";
          if (anyHovered) {
            if (isHovered) {
              hoverClasses += " scale-[1.05] -translate-y-2 md:-translate-y-4 z-40 border-indigo-500/80 shadow-lg shadow-indigo-500/10 opacity-100";
            } else {
              hoverClasses += " opacity-35 scale-[0.93] blur-[0.5px] pointer-events-none";
            }
          }

          // Clean up legacy class overrides
          const cleanClassName = cardProps.className
            ? cardProps.className
                .replace(/before:[^ ]+/g, "")
                .replace(/after:[^ ]+/g, "")
                .replace(/grayscale[^ ]+/g, "")
                .replace(/hover:before:[^ ]+/g, "")
                .replace(/translate-x-[^ ]+/g, "")
                .replace(/translate-y-[^ ]+/g, "")
                .replace(/\[grid-area:stack\]/g, "")
            : "";

          return (
            <DisplayCard
              key={index}
              {...cardProps}
              className={cn("[grid-area:stack]", positionClasses, hoverClasses, cleanClassName)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </div>
    </div>
  );
}

