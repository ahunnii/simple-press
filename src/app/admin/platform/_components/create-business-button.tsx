"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { slugify } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const TEMPLATES = [
  { id: "modern", label: "Modern" },
  { id: "bamboo", label: "Bamboo" },
  { id: "happy-bamboo", label: "Happy Bamboo" },
  { id: "elegant", label: "Elegant" },
  { id: "pollen", label: "Pollen" },
  { id: "dark-trend", label: "Dark Trend" },
  { id: "noise", label: "Noise" },
  { id: "vii", label: "Skinbar VII" },
];

export function CreateBusinessButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [templateId, setTemplateId] = useState("modern");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBusiness = api.platform.createBusiness.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Failed to create business");
      setIsSubmitting(false);
    },
    onSuccess: (data) => {
      toast.success(`Business "${data.name}" created`);
      setOpen(false);
      router.push(`/admin/platform/businesses/${data.id}`);
    },
  });

  const handleNameChange = (value: string) => {
    setName(value);
    if (!subdomainEdited) {
      setSubdomain(slugify(value));
    }
  };

  const handleSubdomainChange = (value: string) => {
    setSubdomainEdited(true);
    setSubdomain(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName("");
      setSubdomain("");
      setSubdomainEdited(false);
      setTemplateId("modern");
      setOwnerEmail("");
      setIsSubmitting(false);
    }
    setOpen(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subdomain.trim()) {
      toast.error("Business name and subdomain are required");
      return;
    }
    setIsSubmitting(true);
    createBusiness.mutate({
      name: name.trim(),
      subdomain: subdomain.trim(),
      templateId,
      ownerEmail: ownerEmail.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Business
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Business</DialogTitle>
            <DialogDescription>
              Provision a new store manually. You can add team members from the
              business detail page afterward.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name</Label>
              <Input
                id="business-name"
                placeholder="Acme Store"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                placeholder="acme-store"
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                required
              />
              <p className="text-muted-foreground text-xs">
                Lowercase letters, numbers, and hyphens only. Min 3 characters.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-email">
                Owner Email{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="owner-email"
                type="email"
                placeholder="owner@example.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Business"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
