import { cn } from "../../lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

export const Card = ({
  className,
  image,
  children,
}: {
  className?: string;
  image?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "w-[340px] cursor-pointer h-[390px] overflow-hidden bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-150 transition-all duration-300 flex flex-col justify-between pb-4",
        className
      )}
    >
      {image && (
        <div className="relative h-56 rounded-xl shadow-inner overflow-hidden w-[calc(100%-1rem)] mx-2 mt-2 bg-gray-50 border border-gray-100 flex items-center justify-center">
          <img
            src={image}
            alt="card illustration"
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      {children && (
        <div className="px-5 py-3 flex flex-col gap-y-1.5 flex-1 justify-center">{children}</div>
      )}
    </div>
  );
};

export interface CardData {
  image: string;
  title: string;
  description: string;
}

export function StackedCardsInteraction({
  cards,
  spreadDistance = 60,
  rotationAngle = 8,
  animationDelay = 0.05,
}: {
  cards: CardData[];
  spreadDistance?: number;
  rotationAngle?: number;
  animationDelay?: number;
}) {
  const [isHovering, setIsHovering] = useState(false);

  // Limit to maximum of 3 cards
  const limitedCards = cards.slice(0, 3);

  return (
    <div className="relative w-full h-[420px] flex items-center justify-center">
      <div 
        className="relative w-[340px] h-[390px]"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {limitedCards.map((card, index) => {
          const isFirst = index === 0;

          let xOffset = 0;
          let rotation = 0;

          if (limitedCards.length > 1) {
            // First card stays in place
            // Second card goes left
            // Third card goes right
            if (index === 1) {
              xOffset = -spreadDistance;
              rotation = -rotationAngle;
            } else if (index === 2) {
              xOffset = spreadDistance;
              rotation = rotationAngle;
            }
          }

          return (
            <motion.div
              key={index}
              className={cn("absolute", isFirst ? "z-10" : "z-0")}
              initial={{ x: 0, rotate: 0 }}
              animate={{
                x: isHovering ? xOffset : 0,
                rotate: isHovering ? rotation : 0,
                zIndex: isFirst ? 10 : 0,
              }}
              transition={{
                duration: 0.35,
                ease: "easeInOut",
                delay: index * animationDelay,
                type: "spring",
                stiffness: 70,
              }}
            >
              <Card
                className={cn(isFirst ? "z-10 cursor-pointer border-blue-200 shadow-md" : "z-0 opacity-90 scale-95 border-gray-100", "select-none")}
                image={card.image}
              >
                <h4 className="text-base font-extrabold text-gray-950 tracking-tight">{card.title}</h4>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">{card.description}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
