import { z } from "zod";

export const languageSchema = z
  .enum(["English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada"])
  .default("English");

export const preparednessRequestSchema = z.object({
  location: z.string().min(2),
  language: languageSchema,
  houseType: z.string().min(2).max(100).default("residential home"),
  floorLevel: z.string().min(1).max(80).default("unknown"),
  familyMembers: z.coerce.number().int().min(1).max(50).default(4),
  children: z.string().max(200).optional().default(""),
  elderly: z.string().max(200).optional().default(""),
  pregnant: z.string().max(200).optional().default(""),
  disabledMembers: z.string().max(300).optional().default(""),
  medicalNeeds: z.string().max(500).optional().default(""),
  pets: z.string().max(300).optional().default(""),
  vehicleType: z.string().max(160).optional().default(""),
  commutePattern: z.string().max(500).optional().default(""),
  emergencyContacts: z.string().max(800).optional().default(""),
});

export const advisorRequestSchema = z.object({
  location: z.string().min(2),
  language: languageSchema,
  situation: z.string().min(5).max(800),
  indoors: z.boolean().default(true),
  waterLevel: z.string().max(120).optional().default("unknown"),
});

export const recoveryRequestSchema = z.object({
  location: z.string().min(2),
  language: languageSchema,
  damage: z.string().min(5).max(900),
  utilitiesStatus: z.string().max(400).optional().default("unknown"),
  medicalNeeds: z.string().max(400).optional().default(""),
});

const actionSchema = z.object({
  title: z.string(),
  detail: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

export const preparednessOutputSchema = z.object({
  liveDataStatus: z.array(z.string()),
  weatherContext: z.enum(["with_live_weather_context", "without_live_weather_context"]),
  readinessScore: z.number().min(0).max(100),
  markdown: z.string().min(400),
});

export const advisorOutputSchema = z.object({
  liveDataStatus: z.array(z.string()),
  urgency: z.enum(["monitor", "act_now", "evacuate_if_ordered", "seek_emergency_help", "unknown"]),
  immediateAnswer: z.string(),
  doNow: z.array(actionSchema).min(1),
  avoid: z.array(z.string()),
  escalationSignals: z.array(z.string()),
  localInfoToVerify: z.array(z.string()),
});

export const recoveryOutputSchema = z.object({
  liveDataStatus: z.array(z.string()),
  safetyStatus: z.enum(["unsafe", "inspect_first", "limited_entry", "stable", "unknown"]),
  summary: z.string(),
  firstSteps: z.array(actionSchema).min(1),
  documentation: z.array(z.string()),
  sanitation: z.array(z.string()),
  servicesToContact: z.array(z.string()),
  next48Hours: z.array(z.string()),
});

export type PreparednessRequest = z.infer<typeof preparednessRequestSchema>;
export type AdvisorRequest = z.infer<typeof advisorRequestSchema>;
export type RecoveryRequest = z.infer<typeof recoveryRequestSchema>;
export type PreparednessOutput = z.infer<typeof preparednessOutputSchema>;
export type AdvisorOutput = z.infer<typeof advisorOutputSchema>;
export type RecoveryOutput = z.infer<typeof recoveryOutputSchema>;
