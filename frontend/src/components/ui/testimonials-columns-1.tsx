import React from "react";
import { motion } from "framer-motion";

export interface TestimonialItem {
  text: string;
  image: string;
  name: string;
  role: string;
}

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: TestimonialItem[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 15,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-transparent"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div 
                  className="p-8 rounded-3xl border border-gray-200/80 bg-white shadow-md shadow-gray-100/50 max-w-xs w-full text-left" 
                  key={`${index}-${i}`}
                >
                  <div className="text-xs font-semibold leading-relaxed text-slate-650">"{text}"</div>
                  <div className="flex items-center gap-3 mt-5">
                    <img
                      width={40}
                      height={40}
                      src={image}
                      alt={name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-100"
                    />
                    <div className="flex flex-col text-left">
                      <div className="font-bold text-xs text-slate-900 tracking-tight leading-none">{name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold tracking-tight mt-1">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};

const testimonialsList: TestimonialItem[] = [
  {
    text: "ComplianceOS revolutionized our operations, streamlining KYC checks and employee onboarding. The dashboard keeps us audit-ready remotely.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60",
    name: "Briana Patton",
    role: "Operations Manager, PayFast",
  },
  {
    text: "Implementing TFG ComplianceOS was smooth and quick. The developer-friendly API and custom webhooks made sandbox integration effortless.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60",
    name: "Bilal Ahmed",
    role: "IT Manager, SwiftPay",
  },
  {
    text: "The support team is exceptional, guiding us through database setup and providing ongoing compliance updates, ensuring complete regulator compliance.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=60",
    name: "Saman Malik",
    role: "Customer Support Lead, TF Group",
  },
  {
    text: "TFG ComplianceOS's seamless integration enhanced our banking operations. Highly recommend for its real-time AML screening cockpit.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60",
    name: "Omar Raza",
    role: "CEO, Capital Partners",
  },
  {
    text: "Its robust geofence logs and automated payroll runs have transformed our fintech workflow, saving hours on workforce audits.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=60",
    name: "Zainab Hussain",
    role: "Project Manager, PrimeFin",
  },
  {
    text: "The smooth implementation exceeded expectations. It streamlined KYC reviews, improving our customer signup conversions.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60",
    name: "Aliza Khan",
    role: "Business Analyst, Apex Global",
  },
  {
    text: "Our compliance audits significantly improved with its user-friendly log reports and positive auditor feedback.",
    image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=60",
    name: "Farhan Siddiqui",
    role: "Marketing Director, ScaleFinance",
  },
  {
    text: "They delivered a solution that exceeded expectations, matching our compliance needs and securing our data pipeline.",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=60",
    name: "Sana Sheikh",
    role: "Sales Manager, InvoTech",
  },
  {
    text: "Using ComplianceOS, our onboarding risk scans and transactions are verified instantly, boosting fintech operations.",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=60",
    name: "Hassan Ali",
    role: "E-commerce Manager, PayCore",
  },
];

const firstColumn = testimonialsList.slice(0, 3);
const secondColumn = testimonialsList.slice(3, 6);
const thirdColumn = testimonialsList.slice(6, 9);

export function Testimonials() {
  return (
    <section className="bg-slate-50 py-24 relative overflow-hidden border-t border-b border-gray-100">
      <div className="container z-10 mx-auto px-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto text-center space-y-4"
        >
          <span className="rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-[10px] font-bold text-blue-700 uppercase tracking-widest inline-block shadow-sm">
            Testimonials
          </span>

          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
            Trusted by Compliance Teams
          </h2>
          <p className="text-sm font-medium leading-relaxed text-gray-500 max-w-md">
            See how financial institutions and scaling startups automate their compliance checklists with TFG ComplianceOS.
          </p>
        </motion.div>

        {/* Dynamic Column Scrolling Deck */}
        <div className="flex justify-center gap-6 mt-16 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] max-h-[600px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </section>
  );
}
