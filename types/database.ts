export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "USER" | "ADMIN";
export type CategoryType = "SERVICE" | "PROJECT";
export type ServiceStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type ProjectStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ServiceRequestStatus =
  | "PENDIENTE"
  | "EN_REVISION"
  | "EN_PROCESO"
  | "COMPLETADA"
  | "CANCELADA";
export type RequestPriority = "BAJA" | "NORMAL" | "ALTA" | "URGENTE";
export type ContactMessageStatus = "NUEVO" | "LEIDO" | "RESPONDIDO" | "ARCHIVADO";
export type TestimonialStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Timestamped = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Timestamped & {
          id: string;
          full_name: string | null;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
        },
        {
          id: string;
          full_name?: string | null;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        }
      >;
      categories: Table<
        Timestamped & {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          type: CategoryType;
        },
        {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          type: CategoryType;
          created_at?: string;
          updated_at?: string;
        }
      >;
      services: Table<
        Timestamped & {
          id: string;
          category_id: string | null;
          title: string;
          slug: string;
          short_description: string;
          description: string;
          icon: string | null;
          image_url: string | null;
          price: number | null;
          status: ServiceStatus;
          sort_order: number;
        },
        {
          id?: string;
          category_id?: string | null;
          title: string;
          slug: string;
          short_description: string;
          description: string;
          icon?: string | null;
          image_url?: string | null;
          price?: number | null;
          status?: ServiceStatus;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      projects: Table<
        Timestamped & {
          id: string;
          category_id: string | null;
          title: string;
          slug: string;
          short_description: string;
          description: string;
          main_image: string | null;
          demo_url: string | null;
          repository_url: string | null;
          technologies: string[];
          status: ProjectStatus;
          featured: boolean;
        },
        {
          id?: string;
          category_id?: string | null;
          title: string;
          slug: string;
          short_description: string;
          description: string;
          main_image?: string | null;
          demo_url?: string | null;
          repository_url?: string | null;
          technologies?: string[];
          status?: ProjectStatus;
          featured?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      project_images: Table<
        { id: string; project_id: string; image_url: string; alt_text: string | null; sort_order: number; created_at: string },
        { id?: string; project_id: string; image_url: string; alt_text?: string | null; sort_order?: number; created_at?: string }
      >;
      service_requests: Table<
        Timestamped & {
          id: string;
          user_id: string;
          service_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          company: string | null;
          description: string;
          budget: number | null;
          status: ServiceRequestStatus;
          priority: RequestPriority;
        },
        {
          id?: string;
          user_id: string;
          service_id?: string | null;
          name: string;
          email: string;
          phone?: string | null;
          company?: string | null;
          description: string;
          budget?: number | null;
          status?: ServiceRequestStatus;
          priority?: RequestPriority;
          created_at?: string;
          updated_at?: string;
        }
      >;
      contact_messages: Table<
        Timestamped & {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string;
          message: string;
          status: ContactMessageStatus;
        },
        {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          subject: string;
          message: string;
          status?: ContactMessageStatus;
          created_at?: string;
          updated_at?: string;
        }
      >;
      testimonials: Table<
        Timestamped & {
          id: string;
          name: string;
          position: string | null;
          company: string | null;
          comment: string;
          photo_url: string | null;
          rating: number;
          status: TestimonialStatus;
        },
        {
          id?: string;
          name: string;
          position?: string | null;
          company?: string | null;
          comment: string;
          photo_url?: string | null;
          rating?: number;
          status?: TestimonialStatus;
          created_at?: string;
          updated_at?: string;
        }
      >;
      site_settings: Table<
        { key: string; value: Json; updated_at: string; updated_by: string | null },
        { key: string; value: Json; updated_at?: string; updated_by?: string | null }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      category_type: CategoryType;
      service_status: ServiceStatus;
      project_status: ProjectStatus;
      service_request_status: ServiceRequestStatus;
      request_priority: RequestPriority;
      contact_message_status: ContactMessageStatus;
      testimonial_status: TestimonialStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
