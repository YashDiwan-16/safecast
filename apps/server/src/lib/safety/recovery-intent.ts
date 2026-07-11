export type RecoveryIssue =
  | "fallen_wires"
  | "electrical_hazard"
  | "structural_damage"
  | "water_entered_home"
  | "contaminated_water"
  | "clogged_drains"
  | "stagnant_water"
  | "mosquito_risk"
  | "spoiled_food"
  | "damaged_vehicle"
  | "blocked_road"
  | "sanitation"
  | "unknown";

export function classifyRecoveryIssue(message: string): {
  issues: RecoveryIssue[];
  dangerLevel: "immediate_danger" | "unsafe_entry" | "health_risk" | "monitor" | "unknown";
  needsEmergencyServices: boolean;
  signals: string[];
} {
  const text = message.toLowerCase();
  const issues = new Set<RecoveryIssue>();
  const signals: string[] = [];

  function add(issue: RecoveryIssue, signal: string) {
    issues.add(issue);
    signals.push(signal);
  }

  if (/(fallen|down|loose|sparking).*(wire|cable|electric|power)|wire.*(fallen|sparking|water)/.test(text)) {
    add("fallen_wires", "fallen or sparking wire");
  }
  if (/(electric|power|switch|socket|breaker|inverter|meter).*(wet|water|spark|shock|smell|burn)/.test(text)) {
    add("electrical_hazard", "possible electrical hazard");
  }
  if (/(wall|ceiling|pillar|beam|foundation).*(crack|tilt|bulge|collapse|sink)|crack.*wall/.test(text)) {
    add("structural_damage", "possible structural damage");
  }
  if (/(water|flood).*(entered|inside|home|house|room|flat)|water entered/.test(text)) {
    add("water_entered_home", "water entered home");
  }
  if (
    /(drink|drinking|tap|water).*(dirty|muddy|brown|smell|contaminated|sewage|unsafe)/.test(text) ||
    /(dirty|muddy|brown|smelly|contaminated|sewage|unsafe).*(drink|drinking|tap|water)/.test(text)
  ) {
    add("contaminated_water", "possible contaminated drinking water");
  }
  if (/(drain|gutter|manhole).*(clog|block|overflow|backflow)|clogged drain/.test(text)) {
    add("clogged_drains", "clogged or overflowing drain");
  }
  if (/(stagnant|standing).*(water|pool)|water.*stagnant/.test(text)) {
    add("stagnant_water", "stagnant water");
  }
  if (/(mosquito|dengue|malaria|chikungunya|bite)/.test(text)) {
    add("mosquito_risk", "mosquito or vector disease risk");
  }
  if (/(food|milk|meat|medicine).*(spoiled|smell|warm|wet|mold|mould|expired)|spoiled food/.test(text)) {
    add("spoiled_food", "possibly spoiled food or medicine");
  }
  if (/(vehicle|car|bike|scooter|two-wheeler|ev).*(water|flood|damage|start|engine|battery)/.test(text)) {
    add("damaged_vehicle", "possible flood-damaged vehicle");
  }
  if (/(road|route|street|lane).*(blocked|closed|debris|tree|flooded)|blocked road/.test(text)) {
    add("blocked_road", "blocked or unsafe road");
  }
  if (/(sewage|toilet|garbage|trash|mold|mould|smell|dead animal|sludge)/.test(text)) {
    add("sanitation", "sanitation or contamination issue");
  }

  const issueList = issues.size > 0 ? Array.from(issues) : ["unknown" as const];
  const needsEmergencyServices =
    issues.has("fallen_wires") || issues.has("electrical_hazard") || issues.has("structural_damage");

  let dangerLevel: "immediate_danger" | "unsafe_entry" | "health_risk" | "monitor" | "unknown" = "unknown";
  if (issues.has("fallen_wires") || issues.has("electrical_hazard")) dangerLevel = "immediate_danger";
  else if (issues.has("structural_damage") || issues.has("water_entered_home")) dangerLevel = "unsafe_entry";
  else if (
    issues.has("contaminated_water") ||
    issues.has("stagnant_water") ||
    issues.has("mosquito_risk") ||
    issues.has("spoiled_food") ||
    issues.has("sanitation")
  ) {
    dangerLevel = "health_risk";
  } else if (issues.size > 0) {
    dangerLevel = "monitor";
  }

  return {
    issues: issueList,
    dangerLevel,
    needsEmergencyServices,
    signals: signals.length ? signals : ["general after-monsoon recovery issue"],
  };
}
