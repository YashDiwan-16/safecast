import { BellRing } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmergencyProfileDialog() {
  const [name, setName] = useState("");
  const [contacts, setContacts] = useState("");
  const [needs, setNeeds] = useState("");
  const [saved, setSaved] = useState(false);

  function saveProfile() {
    window.localStorage.setItem(
      "safecast-emergency-profile",
      JSON.stringify({ name, contacts, needs, savedAt: new Date().toISOString() }),
    );
    setSaved(true);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BellRing className="size-4" />
          Emergency profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emergency Profile Setup</DialogTitle>
          <DialogDescription>
            Store household context locally in this browser so you can reference it while using SafeCast AI.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">Household or contact name</Label>
            <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-contacts">Emergency contacts</Label>
            <Input
              id="profile-contacts"
              value={contacts}
              onChange={(event) => setContacts(event.target.value)}
              placeholder="Names and phone numbers"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-needs">Access, medicine, mobility, pets, or other needs</Label>
            <Input id="profile-needs" value={needs} onChange={(event) => setNeeds(event.target.value)} />
          </div>
          {saved ? (
            <Alert>
              <AlertTitle>Profile saved locally</AlertTitle>
              <AlertDescription>No emergency profile data was sent to a server.</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Close</Button>
            </DialogClose>
            <Button onClick={saveProfile}>Save profile</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
