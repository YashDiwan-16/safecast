export type EmergencyIntent =
  | "commute_decision"
  | "route_check"
  | "child_or_school_delay"
  | "water_entering_home"
  | "stuck_in_traffic"
  | "medical_or_rescue"
  | "general_safety";

export function classifyEmergencyIntent(message: string): {
  intent: EmergencyIntent;
  urgency: "low" | "medium" | "high" | "critical";
  signals: string[];
} {
  const text = message.toLowerCase();
  const signals: string[] = [];

  if (/(water|flood|rain).*(enter|inside|home|house|room)|entering my house/.test(text)) {
    signals.push("water entering home");
    return { intent: "water_entering_home", urgency: "critical", signals };
  }
  if (/(stuck|stranded|trapped).*(traffic|road|car|bus|train)|traffic.*heavy rain/.test(text)) {
    signals.push("stuck or stranded during travel");
    return { intent: "stuck_in_traffic", urgency: "high", signals };
  }
  if (/(school|kid|child|bus|children).*(delay|late|stuck|missing)/.test(text)) {
    signals.push("child or school transport delay");
    return { intent: "child_or_school_delay", urgency: "high", signals };
  }
  if (/(route|road|way).*(safe|avoid|risk|blocked)|check.*route/.test(text)) {
    signals.push("route safety request");
    return { intent: "route_check", urgency: "medium", signals };
  }
  if (/(office|work|commute|go today|travel today|should i go)/.test(text)) {
    signals.push("commute go/delay decision");
    return { intent: "commute_decision", urgency: "medium", signals };
  }
  if (/(injur|medical|hospital|ambulance|rescue|breath|chest pain|electric shock)/.test(text)) {
    signals.push("medical or rescue signal");
    return { intent: "medical_or_rescue", urgency: "critical", signals };
  }

  return { intent: "general_safety", urgency: "low", signals: ["general monsoon safety request"] };
}
