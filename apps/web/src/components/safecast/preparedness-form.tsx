import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/api";
import type { EngineResponse, PreparednessOutput } from "@/lib/safecast-types";

import { Markdown } from "./markdown";

const languages = ["English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada"];

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
      <Alert variant={output.weatherContext === "without_live_weather_context" ? "warning" : "default"}>
        <CheckCircle2 className="mb-3 size-5" />
        <AlertTitle>Readiness score: {Math.round(output.readinessScore)}/100</AlertTitle>
        <AlertDescription>
          {output.weatherContext === "with_live_weather_context"
            ? "Generated with live Open-Meteo forecast context."
            : "Generated without live weather context."}
        </AlertDescription>
      </Alert>
      <LiveDataStatus values={output.liveDataStatus} />
      <Card>
        <CardContent className="p-5">
          <Markdown>{output.markdown}</Markdown>
        </CardContent>
      </Card>
    </div>
  );
}

export function PreparednessForm({ location, language }: { location: string; language: string }) {
  const [prepLocation, setPrepLocation] = useState(location);
  const [prepLanguage, setPrepLanguage] = useState(language);
  const [houseType, setHouseType] = useState("apartment or house");
  const [floorLevel, setFloorLevel] = useState("ground floor");
  const [familyMembers, setFamilyMembers] = useState("4");
  const [children, setChildren] = useState("");
  const [elderly, setElderly] = useState("");
  const [pregnant, setPregnant] = useState("");
  const [disabledMembers, setDisabledMembers] = useState("");
  const [prepMedicalNeeds, setPrepMedicalNeeds] = useState("");
  const [pets, setPets] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [commutePattern, setCommutePattern] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState("");

  const preparedness = useMutation({
    mutationFn: () =>
      postJson<EngineResponse<PreparednessOutput>>("/preparedness", {
        location: prepLocation,
        language: prepLanguage,
        houseType,
        floorLevel,
        familyMembers: Number(familyMembers),
        children,
        elderly,
        pregnant,
        disabledMembers,
        medicalNeeds: prepMedicalNeeds,
        pets,
        vehicleType,
        commutePattern,
        emergencyContacts,
      }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Before Monsoon Preparedness Engine</CardTitle>
        <CardDescription>
          Submit your household profile. Gemini uses this profile plus live forecast risk when available.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="prep-location">Location</Label>
            <Input
              id="prep-location"
              value={prepLocation}
              onChange={(event) => setPrepLocation(event.target.value)}
              placeholder="City, district, neighborhood, or address"
            />
          </div>
          <div className="grid gap-2">
            <Label>Language</Label>
            <Select value={prepLanguage} onValueChange={setPrepLanguage}>
              <SelectTrigger aria-label="Preparedness language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="house-type">House type</Label>
            <Input
              id="house-type"
              value={houseType}
              onChange={(event) => setHouseType(event.target.value)}
              placeholder="apartment, chawl, independent house..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="floor-level">Floor level</Label>
            <Input
              id="floor-level"
              value={floorLevel}
              onChange={(event) => setFloorLevel(event.target.value)}
              placeholder="ground floor, 2nd floor, basement..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="family-members">Family members</Label>
            <Input
              id="family-members"
              value={familyMembers}
              onChange={(event) => setFamilyMembers(event.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vehicle-type">Vehicle type</Label>
            <Input
              id="vehicle-type"
              value={vehicleType}
              onChange={(event) => setVehicleType(event.target.value)}
              placeholder="none, two-wheeler, car, EV..."
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="children">Children</Label>
            <Input id="children" value={children} onChange={(event) => setChildren(event.target.value)} placeholder="ages, count, school timing..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="elderly">Elderly members</Label>
            <Input id="elderly" value={elderly} onChange={(event) => setElderly(event.target.value)} placeholder="ages, mobility, care needs..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pregnant">Pregnant members</Label>
            <Input id="pregnant" value={pregnant} onChange={(event) => setPregnant(event.target.value)} placeholder="trimester or needs, if any" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="disabled-members">Disabled members</Label>
            <Input id="disabled-members" value={disabledMembers} onChange={(event) => setDisabledMembers(event.target.value)} placeholder="mobility, sensory, equipment needs..." />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="prep-medical">Medical needs</Label>
            <Textarea id="prep-medical" value={prepMedicalNeeds} onChange={(event) => setPrepMedicalNeeds(event.target.value)} placeholder="medicines, oxygen, dialysis, refrigerated medication..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pets">Pets</Label>
            <Textarea id="pets" value={pets} onChange={(event) => setPets(event.target.value)} placeholder="type, count, carriers, food needs..." />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="commute">Commute pattern</Label>
            <Textarea id="commute" value={commutePattern} onChange={(event) => setCommutePattern(event.target.value)} placeholder="daily route, train/bus/car, flood-prone roads, work shifts..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contacts">Emergency contacts</Label>
            <Textarea id="contacts" value={emergencyContacts} onChange={(event) => setEmergencyContacts(event.target.value)} placeholder="family, neighbor, doctor, building manager..." />
          </div>
        </div>
        <Button onClick={() => preparedness.mutate()} disabled={preparedness.isPending || !prepLocation.trim()}>
          <Sparkles className="size-4" />
          Generate preparedness plan
        </Button>
        {preparedness.isPending ? <LoadingResult /> : <PreparednessResult result={preparedness.data} />}
        {preparedness.error ? <AiUnavailable reason={preparedness.error.message} /> : null}
      </CardContent>
    </Card>
  );
}
