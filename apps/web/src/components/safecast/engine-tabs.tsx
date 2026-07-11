import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ClipboardList, Home, ShieldAlert, Sparkles } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/api";
import type {
  AdvisorOutput,
  EngineResponse,
  PreparednessOutput,
  RecoveryOutput,
  SafetyAction,
} from "@/lib/safecast-types";

function priorityVariant(priority: SafetyAction["priority"]) {
  if (priority === "critical") return "destructive";
  if (priority === "high") return "warning";
  return priority === "medium" ? "secondary" : "outline";
}

function ActionList({ actions }: { actions: SafetyAction[] }) {
  return (
    <div className="grid gap-3">
      {actions.map((action) => (
        <div key={`${action.title}-${action.detail}`} className="rounded-lg border p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="font-medium">{action.title}</div>
            <Badge variant={priorityVariant(action.priority)}>{action.priority}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{action.detail}</p>
        </div>
      ))}
    </div>
  );
}

function AiUnavailable({ reason }: { reason: string }) {
  return (
    <Alert variant="warning">
      <AlertCircle className="mb-3 size-5" />
      <AlertTitle>AI plan unavailable</AlertTitle>
      <AlertDescription>{reason}</AlertDescription>
    </Alert>
  );
}

function LoadingResult() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-20" />
      <Skeleton className="h-28" />
      <Skeleton className="h-24" />
    </div>
  );
}

function LiveDataStatus({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Badge key={value} variant="outline">
          {value}
        </Badge>
      ))}
    </div>
  );
}

function PreparednessResult({ result }: { result?: EngineResponse<PreparednessOutput> }) {
  if (!result) return null;
  if (result.ai.status === "unavailable") return <AiUnavailable reason={result.ai.reason} />;
  const output = result.ai.output;

  return (
    <div className="grid gap-4">
      <Alert>
        <CheckCircle2 className="mb-3 size-5" />
        <AlertTitle>Risk level: {output.riskLevel}</AlertTitle>
        <AlertDescription>{output.summary}</AlertDescription>
      </Alert>
      <LiveDataStatus values={output.liveDataStatus} />
      <ActionList actions={output.actions} />
      <Card>
        <CardHeader>
          <CardTitle>Supplies</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {output.supplies.map((item) => (
            <div key={`${item.item}-${item.quantity}`} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{item.item}</div>
                <div className="text-sm text-muted-foreground">{item.note}</div>
              </div>
              <Badge variant="secondary">{item.quantity}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Checklist title="Household plan" items={output.householdPlan} />
      <Checklist title="Watch points" items={output.watchPoints} />
    </div>
  );
}

function AdvisorResult({ result }: { result?: EngineResponse<AdvisorOutput> }) {
  if (!result) return null;
  if (result.ai.status === "unavailable") return <AiUnavailable reason={result.ai.reason} />;
  const output = result.ai.output;

  return (
    <div className="grid gap-4">
      <Alert variant={output.urgency === "seek_emergency_help" ? "destructive" : "warning"}>
        <ShieldAlert className="mb-3 size-5" />
        <AlertTitle>Urgency: {output.urgency.replaceAll("_", " ")}</AlertTitle>
        <AlertDescription>{output.immediateAnswer}</AlertDescription>
      </Alert>
      <LiveDataStatus values={output.liveDataStatus} />
      <ActionList actions={output.doNow} />
      <Checklist title="Avoid" items={output.avoid} />
      <Checklist title="Escalation signals" items={output.escalationSignals} />
      <Checklist title="Verify locally" items={output.localInfoToVerify} />
    </div>
  );
}

function RecoveryResult({ result }: { result?: EngineResponse<RecoveryOutput> }) {
  if (!result) return null;
  if (result.ai.status === "unavailable") return <AiUnavailable reason={result.ai.reason} />;
  const output = result.ai.output;

  return (
    <div className="grid gap-4">
      <Alert variant={output.safetyStatus === "unsafe" ? "destructive" : "default"}>
        <Home className="mb-3 size-5" />
        <AlertTitle>Safety status: {output.safetyStatus.replaceAll("_", " ")}</AlertTitle>
        <AlertDescription>{output.summary}</AlertDescription>
      </Alert>
      <LiveDataStatus values={output.liveDataStatus} />
      <ActionList actions={output.firstSteps} />
      <Checklist title="Documentation" items={output.documentation} />
      <Checklist title="Sanitation" items={output.sanitation} />
      <Checklist title="Services to contact" items={output.servicesToContact} />
      <Checklist title="Next 48 hours" items={output.next48Hours} />
    </div>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function EngineTabs({
  location,
  language,
  initialTab = "preparedness",
}: {
  location: string;
  language: string;
  initialTab?: "preparedness" | "advisor" | "recovery";
}) {
  const [householdSize, setHouseholdSize] = useState("4");
  const [homeType, setHomeType] = useState("apartment or house");
  const [vulnerablePeople, setVulnerablePeople] = useState("");
  const [situation, setSituation] = useState("");
  const [waterLevel, setWaterLevel] = useState("");
  const [damage, setDamage] = useState("");
  const [utilitiesStatus, setUtilitiesStatus] = useState("");
  const [medicalNeeds, setMedicalNeeds] = useState("");

  const preparedness = useMutation({
    mutationFn: () =>
      postJson<EngineResponse<PreparednessOutput>>("/preparedness", {
        location,
        language,
        householdSize: Number(householdSize),
        homeType,
        vulnerablePeople,
      }),
  });

  const advisor = useMutation({
    mutationFn: () =>
      postJson<EngineResponse<AdvisorOutput>>("/advisor", {
        location,
        language,
        situation,
        indoors: true,
        waterLevel,
      }),
  });

  const recovery = useMutation({
    mutationFn: () =>
      postJson<EngineResponse<RecoveryOutput>>("/recovery", {
        location,
        language,
        damage,
        utilitiesStatus,
        medicalNeeds,
      }),
  });

  return (
    <Tabs defaultValue={initialTab} className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3">
        <TabsTrigger value="preparedness">
          <ClipboardList className="size-4" />
          Before
        </TabsTrigger>
        <TabsTrigger value="advisor">
          <ShieldAlert className="size-4" />
          During /bro
        </TabsTrigger>
        <TabsTrigger value="recovery">
          <Home className="size-4" />
          After
        </TabsTrigger>
      </TabsList>

      <TabsContent value="preparedness">
        <Card>
          <CardHeader>
            <CardTitle>Before Monsoon Preparedness Engine</CardTitle>
            <CardDescription>Generates a live-data-aware household readiness plan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="household-size">Household size</Label>
                <Input id="household-size" value={householdSize} onChange={(event) => setHouseholdSize(event.target.value)} inputMode="numeric" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="home-type">Home type</Label>
                <Input id="home-type" value={homeType} onChange={(event) => setHomeType(event.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vulnerable">Vulnerable people, pets, or constraints</Label>
              <Textarea id="vulnerable" value={vulnerablePeople} onChange={(event) => setVulnerablePeople(event.target.value)} />
            </div>
            <Button onClick={() => preparedness.mutate()} disabled={preparedness.isPending || !location.trim()}>
              <Sparkles className="size-4" />
              Generate preparedness plan
            </Button>
            {preparedness.isPending ? <LoadingResult /> : <PreparednessResult result={preparedness.data} />}
            {preparedness.error ? <AiUnavailable reason={preparedness.error.message} /> : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="advisor">
        <Card>
          <CardHeader>
            <CardTitle>During Monsoon /bro Safety Advisor</CardTitle>
            <CardDescription>Explain what is happening right now and get immediate steps.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="situation">Current situation</Label>
              <Textarea
                id="situation"
                value={situation}
                onChange={(event) => setSituation(event.target.value)}
                placeholder="Example: water is entering the lane, power is flickering, and I am on the ground floor."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="water-level">Water level or nearby hazard</Label>
              <Input id="water-level" value={waterLevel} onChange={(event) => setWaterLevel(event.target.value)} placeholder="ankle deep, knee deep, unknown..." />
            </div>
            <Button onClick={() => advisor.mutate()} disabled={advisor.isPending || !location.trim() || situation.trim().length < 5}>
              <ShieldAlert className="size-4" />
              Get live safety advice
            </Button>
            {advisor.isPending ? <LoadingResult /> : <AdvisorResult result={advisor.data} />}
            {advisor.error ? <AiUnavailable reason={advisor.error.message} /> : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="recovery">
        <Card>
          <CardHeader>
            <CardTitle>After Monsoon Recovery Assistant</CardTitle>
            <CardDescription>Plan safe re-entry, cleanup, documentation, and next steps.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="damage">Observed damage</Label>
              <Textarea
                id="damage"
                value={damage}
                onChange={(event) => setDamage(event.target.value)}
                placeholder="Describe flooding, damp walls, damaged appliances, debris, sewage, injuries..."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="utilities">Utilities status</Label>
                <Input id="utilities" value={utilitiesStatus} onChange={(event) => setUtilitiesStatus(event.target.value)} placeholder="power/water/gas unknown" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="medical">Medical needs</Label>
                <Input id="medical" value={medicalNeeds} onChange={(event) => setMedicalNeeds(event.target.value)} placeholder="none, first aid, medication..." />
              </div>
            </div>
            <Button onClick={() => recovery.mutate()} disabled={recovery.isPending || !location.trim() || damage.trim().length < 5}>
              <Home className="size-4" />
              Build recovery plan
            </Button>
            {recovery.isPending ? <LoadingResult /> : <RecoveryResult result={recovery.data} />}
            {recovery.error ? <AiUnavailable reason={recovery.error.message} /> : null}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
