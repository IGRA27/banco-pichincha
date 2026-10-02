import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Prospect, Scenario } from "../types";
import { PRODUCTS } from "../labels";
import { ScenarioPicker } from "./ScenarioPicker";

interface Props {
  scenarios: Scenario[] | null;
  scenariosError: unknown;
  onReloadScenarios: () => void;
  submitting: boolean;
  onSubmit: (p: Prospect) => void;
}

type Errors = Partial<Record<keyof Prospect, string>>;

function validate(p: Prospect): Errors {
  const e: Errors = {};
  if (p.prospect_name.trim().length < 3) e.prospect_name = "Escribe el nombre completo (mínimo 3 letras).";
  if (!/^\d{10}$/.test(p.document_id.trim())) e.document_id = "La cédula debe tener 10 dígitos.";
  if (!p.product) e.product = "Elige un producto.";
  return e;
}

export function OnboardingForm({ scenarios, scenariosError, onReloadScenarios, submitting, onSubmit }: Props) {
  const [form, setForm] = useState<Prospect>({ prospect_name: "", document_id: "", product: "cuenta_ahorros" });
  const [errors, setErrors] = useState<Errors>({});
  const [scenario, setScenario] = useState<string | null>(null);

  const set = (k: keyof Prospect, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k !== "product") setScenario(null);
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const pick = (s: Scenario) => {
    setForm((f) => ({ ...f, prospect_name: s.prospect_name, document_id: s.document_id }));
    setErrors({});
    setScenario(s.document_id);
  };

  const handleSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate(form);
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    onSubmit({ ...form, prospect_name: form.prospect_name.trim(), document_id: form.document_id.trim() });
  };

  const fieldError = (k: keyof Prospect) =>
    errors[k] ? (
      <p id={`e-${k}`} className="text-xs text-destructive">
        {errors[k]}
      </p>
    ) : null;

  return (
    <section aria-labelledby="form-title" className="flex flex-col gap-4">
      <div className="space-y-1">
        <h2 id="form-title" className="text-lg font-semibold tracking-tight text-balance">
          Nueva solicitud
        </h2>
        <p className="text-sm text-muted-foreground">Carga un caso de ejemplo o escribe los datos del cliente.</p>
      </div>

      <ScenarioPicker
        scenarios={scenarios}
        error={scenariosError}
        onRetry={onReloadScenarios}
        value={scenario}
        onPick={pick}
      />

      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <Separator className="flex-1" /> o <Separator className="flex-1" />
      </div>

      <form className="flex flex-col gap-3.5" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-1.5">
          <Label htmlFor="f-prospect_name">Nombre completo</Label>
          <Input
            id="f-prospect_name"
            autoComplete="name"
            value={form.prospect_name}
            onChange={(e) => set("prospect_name", e.target.value)}
            aria-invalid={!!errors.prospect_name}
            aria-describedby={errors.prospect_name ? "e-prospect_name" : undefined}
            placeholder="Ej. Juan Pérez"
          />
          {fieldError("prospect_name")}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="f-document_id">Cédula</Label>
          <Input
            id="f-document_id"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            className="tabular-nums tracking-wide"
            value={form.document_id}
            onChange={(e) => set("document_id", e.target.value.replace(/\D/g, ""))}
            aria-invalid={!!errors.document_id}
            aria-describedby={errors.document_id ? "e-document_id" : undefined}
            placeholder="10 dígitos"
          />
          {fieldError("document_id")}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="f-product">Producto</Label>
          <Select value={form.product} onValueChange={(v) => set("product", v)}>
            <SelectTrigger id="f-product" className="w-full" aria-invalid={!!errors.product}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCTS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("product")}
        </div>

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" /> Evaluando…
            </>
          ) : (
            <>
              Evaluar solicitud <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
    </section>
  );
}
