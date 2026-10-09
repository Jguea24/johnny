import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import { RegistrationForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Crea tu cuenta para gestionar tu perfil.",
};

export default function RegistrationPage() {
  return (
    <AuthCard
      eyebrow="Únete"
      title="Crear cuenta"
      description="Regístrate para administrar tu perfil. El acceso se confirma por correo si la verificación está habilitada."
    >
      <RegistrationForm />
    </AuthCard>
  );
}
