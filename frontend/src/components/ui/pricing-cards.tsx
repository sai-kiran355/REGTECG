import { Check, MoveRight, PhoneCall } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "./badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "./button";

function Pricing() {
  const plans = [
    {
      name: "Starter Plan",
      price: "₹9,999",
      desc: "For growing fintechs & operations teams sandbox testing.",
      cta: "Start Free Trial",
      ctaType: "outline" as const,
      features: [
        { title: "Verifications", desc: "Up to 500 verifications / mo" },
        { title: "AML & Sanctions", desc: "Real-time list matches & screening" },
        { title: "Workforce seats", desc: "5 active employee accounts" },
        { title: "Integrations", desc: "Slack and webhook alert triggers" },
      ],
    },
    {
      name: "Growth Plan",
      price: "₹49,999",
      desc: "For mid-size banks and scaled platforms.",
      cta: "Start Free Trial",
      ctaType: "default" as const,
      features: [
        { title: "Verifications", desc: "Up to 5,000 verifications / mo" },
        { title: "Geofence Logs", desc: "Automated staff geofence alerts" },
        { title: "Workforce seats", desc: "50 active employee accounts" },
        { title: "Support Desk", desc: "Priority email & dashboard support" },
      ],
    },
    {
      name: "Enterprise Plan",
      price: "Custom",
      desc: "For large banks and high-volume corporate systems.",
      cta: "Contact Sales",
      ctaType: "outline" as const,
      isContact: true,
      features: [
        { title: "Verifications", desc: "Unlimited transactions & scans" },
        { title: "Custom Thresholds", desc: "Configurable AML scoring rules" },
        { title: "Workforce seats", desc: "Unlimited active employee seats" },
        { title: "Dedicated SLA", desc: "On-premises nodes & SLA bounds" },
      ],
    },
  ];

  return (
    <div className="w-full py-20 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex text-center justify-center items-center gap-4 flex-col">
          <Badge variant="outline" className="px-3 py-1 text-xs border-blue-200 text-blue-700 bg-blue-50/50 shadow-sm">
            Pricing Plans
          </Badge>
          <div className="flex gap-2 flex-col max-w-xl">
            <h2 className="text-3xl md:text-5xl tracking-tight text-center font-extrabold text-gray-900 leading-tight">
              Flexible and Transparent Tiers
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-gray-500 font-medium text-center">
              Select the best option for your startup or enterprise. No credit cards needed to start sandbox testing.
            </p>
          </div>
          
          <div className="grid pt-14 text-left grid-cols-1 lg:grid-cols-3 w-full gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`w-full rounded-3xl border border-gray-200/80 bg-white flex flex-col justify-between p-2 transition-all duration-300 hover:shadow-xl hover:border-blue-250 ${
                  plan.ctaType === "default" ? "shadow-2xl ring-2 ring-blue-600/10 border-blue-100" : "shadow-sm"
                }`}
              >
                <CardHeader className="space-y-2.5">
                  <CardTitle className="text-xl font-bold text-gray-950 flex items-center justify-between">
                    {plan.name}
                    {plan.ctaType === "default" && (
                      <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        Popular
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400 font-semibold leading-relaxed">
                    {plan.desc}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="flex flex-col gap-6 justify-start">
                    <p className="flex flex-row items-baseline gap-1 text-gray-900">
                      <span className="text-4xl font-black">{plan.price}</span>
                      {plan.price !== "Custom" && (
                        <span className="text-xs font-bold text-gray-450">/ month</span>
                      )}
                    </p>
                    
                    <div className="flex flex-col gap-4 justify-start">
                      {plan.features.map((feat) => (
                        <div key={feat.title} className="flex flex-row gap-3 items-start">
                          <Check className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
                          <div className="flex flex-col text-left text-xs">
                            <p className="font-bold text-slate-800">{feat.title}</p>
                            <p className="text-slate-400 font-semibold mt-0.5">{feat.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-2">
                      <Link to="/signup" className="block w-full">
                        <Button 
                          variant={plan.ctaType} 
                          className={`w-full gap-2 rounded-xl py-3.5 text-xs font-bold transition-all shadow-sm ${
                            plan.ctaType === "default" 
                              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/15" 
                              : "border-gray-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {plan.isContact ? (
                            <>
                              Contact Sales <PhoneCall className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              {plan.cta} <MoveRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { Pricing };
