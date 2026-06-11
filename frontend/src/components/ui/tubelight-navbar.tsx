"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
  activeValue?: string;
  onActiveChange?: (name: string) => void;
}

export function NavBar({ items, className, activeValue, onActiveChange }: NavBarProps) {
  const [activeTab, setActiveTab] = useState(activeValue || items[0].name);

  useEffect(() => {
    if (activeValue) {
      setActiveTab(activeValue);
    }
  }, [activeValue]);

  const handleTabClick = (name: string) => {
    setActiveTab(name);
    if (onActiveChange) {
      onActiveChange(name);
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 sm:bottom-auto sm:top-4 left-1/2 -translate-x-1/2 z-50 w-auto px-4 max-w-full",
        className
      )}
    >
      <div className="flex items-center gap-1.5 bg-white/80 border border-slate-200/80 backdrop-blur-md py-1 px-1.5 rounded-full shadow-lg shadow-slate-100/40">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;
          const isAnchor = item.url.startsWith("#");

          const content = (
            <>
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden flex items-center justify-center">
                <Icon size={16} strokeWidth={2.2} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-blue-50/60 rounded-full -z-10 border border-blue-100/50"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 28,
                  }}
                >
                  {/* Glowing line indicators */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-[2px] bg-blue-600 rounded-t-full shadow-[0_0_8px_#3b82f6]">
                    <div className="absolute w-10 h-4 bg-blue-500/15 rounded-full blur-sm -top-1.5 -left-1.5" />
                    <div className="absolute w-6 h-3 bg-blue-500/20 rounded-full blur-xs -top-1" />
                  </div>
                </motion.div>
              )}
            </>
          );

          const linkClassName = cn(
            "relative cursor-pointer text-xs font-semibold px-4.5 py-2 rounded-full transition-all duration-300 flex items-center justify-center select-none outline-none",
            isActive
              ? "text-blue-600 font-bold"
              : "text-slate-500 hover:text-slate-900"
          );

          if (isAnchor) {
            return (
              <a
                key={item.name}
                href={item.url}
                onClick={(e) => {
                  e.preventDefault();
                  handleTabClick(item.name);
                  const element = document.getElementById(item.url.slice(1));
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={linkClassName}
              >
                {content}
              </a>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.url}
              onClick={() => handleTabClick(item.name)}
              className={linkClassName}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
