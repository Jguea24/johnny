export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "USER" | "ADMIN";
export type CategoryType = "SERVICE" | "PROJECT";
export type ServiceKind = "TECHNOLOGICAL" | "DIGITAL";
export type DigitalDurationUnit = "DAY" | "MONTH" | "YEAR" | "PERMANENT";
export type DigitalOfferSource = "SELF_PROVIDED" | "THIRD_PARTY_AUTHORIZED";
export type DigitalPaymentStatus = "PENDING" | "VERIFIED" | "REJECTED" | "CANCELLED";
export type DigitalDeliveryStatus = "PENDING" | "DELIVERED" | "CANCELLED";
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
export type HeroMediaType = "image" | "video";
export type TeamMemberType = "FOUNDER" | "COLLABORATOR";

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
          service_kind: ServiceKind;
          category_id: string | null;
          title: string;
          slug: string;
          short_description: string;
          description: string;
          icon: string | null;
          image_url: string | null;
          price: number | null;
          tax_base0: number;
          tax_baseimp: number;
          tax_iva: number;
          brand: string;
          family_name: string;
          plan_name: string;
          offer_source: DigitalOfferSource;
          duration_value: number | null;
          duration_unit: DigitalDurationUnit;
          previous_price: number | null;
          included_features: string[];
          distribution_method: string;
          distribution_authorized: boolean;
          renewal_policy: string;
          license_type: string;
          availability_status: string;
          stock_mode: string;
          stock_quantity: number | null;
          conditions: string;
          status: ServiceStatus;
          sort_order: number;
        },
        {
          id?: string;
          service_kind?: ServiceKind;
          category_id?: string | null;
          title: string;
          slug: string;
          short_description: string;
          description: string;
          icon?: string | null;
          image_url?: string | null;
          price?: number | null;
          tax_base0?: number;
          tax_baseimp?: number;
          tax_iva?: number;
          brand?: string;
          family_name?: string;
          plan_name?: string;
          offer_source?: DigitalOfferSource;
          duration_value?: number | null;
          duration_unit?: DigitalDurationUnit;
          previous_price?: number | null;
          included_features?: string[];
          distribution_method?: string;
          distribution_authorized?: boolean;
          renewal_policy?: string;
          license_type?: string;
          availability_status?: string;
          stock_mode?: string;
          stock_quantity?: number | null;
          conditions?: string;
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
      service_orders: Table<
        Timestamped & {
          id: string;
          service_id: string;
          service_title: string;
          amount: number;
          tax_base0: number;
          tax_baseimp: number;
          tax_iva: number;
          currency: "USD";
          status: "PENDING" | "PAID" | "FAILED";
          customer_given_name: string;
          customer_middle_name: string;
          customer_surname: string;
          customer_email: string;
          customer_phone: string;
          customer_identification: string;
          customer_address: string;
          customer_postcode: string;
          merchant_transaction_id: string;
          datafast_checkout_id: string | null;
          datafast_payment_id: string | null;
          datafast_result_code: string | null;
          datafast_payment_brand: string | null;
        },
        {
          id?: string;
          service_id: string;
          service_title: string;
          amount: number;
          tax_base0: number;
          tax_baseimp: number;
          tax_iva: number;
          currency?: "USD";
          status?: "PENDING" | "PAID" | "FAILED";
          customer_given_name: string;
          customer_middle_name: string;
          customer_surname: string;
          customer_email: string;
          customer_phone: string;
          customer_identification: string;
          customer_address: string;
          customer_postcode: string;
          merchant_transaction_id: string;
          datafast_checkout_id?: string | null;
          datafast_payment_id?: string | null;
          datafast_result_code?: string | null;
          datafast_payment_brand?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      digital_orders: Table<
        Timestamped & {
          id: string;
          service_id: string;
          service_title: string;
          brand: string;
          family_name: string;
          plan_name: string;
          duration_value: number | null;
          duration_unit: DigitalDurationUnit;
          amount: number;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          payment_method: "WHATSAPP";
          payment_status: DigitalPaymentStatus;
          payment_verified_at: string | null;
          delivery_status: DigitalDeliveryStatus;
          delivered_at: string | null;
          expires_at: string | null;
          delivery_notes: string;
          stock_reserved: boolean;
        },
        {
          id?: string;
          service_id: string;
          service_title: string;
          brand: string;
          family_name: string;
          plan_name: string;
          duration_value?: number | null;
          duration_unit: DigitalDurationUnit;
          amount: number;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          payment_method?: "WHATSAPP";
          payment_status?: DigitalPaymentStatus;
          payment_verified_at?: string | null;
          delivery_status?: DigitalDeliveryStatus;
          delivered_at?: string | null;
          expires_at?: string | null;
          delivery_notes?: string;
          stock_reserved?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      digital_service_admin_notes: Table<
        {
          service_id: string;
          authorization_reference: string;
          activation_instructions: string;
          updated_at: string;
        },
        {
          service_id: string;
          authorization_reference?: string;
          activation_instructions?: string;
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
      team_members: Table<
        Timestamped & {
          id: string;
          member_type: TeamMemberType;
          full_name: string;
          slug: string;
          position: string;
          specialty: string;
          bio: string;
          avatar_url: string | null;
          avatar_path: string | null;
          linkedin_url: string | null;
          website_url: string | null;
          display_order: number;
          is_featured: boolean;
          is_active: boolean;
        },
        {
          id?: string;
          member_type?: TeamMemberType;
          full_name?: string;
          slug: string;
          position?: string;
          specialty?: string;
          bio?: string;
          avatar_url?: string | null;
          avatar_path?: string | null;
          linkedin_url?: string | null;
          website_url?: string | null;
          display_order?: number;
          is_featured?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      hero_slides: Table<
        Timestamped & {
          id: string;
          title: string;
          description: string;
          media_type: HeroMediaType;
          media_path: string;
          alt_text: string | null;
          poster_path: string | null;
          cta_text: string | null;
          cta_url: string | null;
          sort_order: number;
          is_active: boolean;
        },
        {
          id?: string;
          title: string;
          description: string;
          media_type: HeroMediaType;
          media_path: string;
          alt_text?: string | null;
          poster_path?: string | null;
          cta_text?: string | null;
          cta_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      hero_carousel_settings: Table<
        {
          id: number;
          autoplay_enabled: boolean;
          autoplay_interval_ms: number;
          show_arrows: boolean;
          show_indicators: boolean;
          updated_at: string;
        },
        {
          id?: number;
          autoplay_enabled?: boolean;
          autoplay_interval_ms?: number;
          show_arrows?: boolean;
          show_indicators?: boolean;
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
      reorder_hero_slide: {
        Args: { p_slide_id: string; p_direction: string };
        Returns: boolean;
      };
      create_digital_order: {
        Args: {
          p_service_id: string;
          p_customer_name: string;
          p_customer_email: string;
          p_customer_phone: string;
        };
        Returns: string;
      };
      admin_update_digital_order: {
        Args: {
          p_order_id: string;
          p_payment_status: DigitalPaymentStatus;
          p_delivery_status: DigitalDeliveryStatus;
          p_delivered_at: string | null;
          p_expires_at: string | null;
          p_delivery_notes: string;
        };
        Returns: undefined;
      };
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
