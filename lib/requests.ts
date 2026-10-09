import type { ServiceRequestStatus } from "@/types/database";

export const requestStatusLabels: Record<ServiceRequestStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  EN_PROCESO: "En proceso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

export function formatRequestDate(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
