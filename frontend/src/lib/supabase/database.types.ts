export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          business_id: string
          cancel_reason: string | null
          client_id: string
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          member_id: string
          notes: string | null
          price: number
          price_type: Database["public"]["Enums"]["price_type"]
          rescheduled_to: string | null
          service_id: string
          service_name: string
          source: Database["public"]["Enums"]["appointment_source"]
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          status_changed_at: string
          updated_at: string
        }
        Insert: {
          business_id: string
          cancel_reason?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          member_id: string
          notes?: string | null
          price: number
          price_type?: Database["public"]["Enums"]["price_type"]
          rescheduled_to?: string | null
          service_id: string
          service_name: string
          source?: Database["public"]["Enums"]["appointment_source"]
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          status_changed_at?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancel_reason?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          price?: number
          price_type?: Database["public"]["Enums"]["price_type"]
          rescheduled_to?: string | null
          service_id?: string
          service_name?: string
          source?: Database["public"]["Enums"]["appointment_source"]
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          status_changed_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_fk"
            columns: ["business_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "appointments_member_fk"
            columns: ["business_id", "member_id"]
            isOneToOne: false
            referencedRelation: "business_members"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "appointments_rescheduled_to_fkey"
            columns: ["rescheduled_to"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_fk"
            columns: ["business_id", "service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          color: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          is_bookable: boolean
          role: Database["public"]["Enums"]["member_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          color?: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          is_bookable?: boolean
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          color?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_bookable?: boolean
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["business_category"]
          city: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          name: string
          phone: string | null
          slug: string
          timezone: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["business_category"]
          city?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name: string
          phone?: string | null
          slug: string
          timezone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["business_category"]
          city?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name?: string
          phone?: string | null
          slug?: string
          timezone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          business_id: string
          created_at: string
          full_name: string
          id: string
          phone: string | null
          phone_key: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          phone_key?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          phone_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
          price_type: Database["public"]["Enums"]["price_type"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
          price_type?: Database["public"]["Enums"]["price_type"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          price_type?: Database["public"]["Enums"]["price_type"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off: {
        Row: {
          all_day: boolean
          business_id: string
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          member_id: string | null
          reason: string | null
          starts_at: string
        }
        Insert: {
          all_day?: boolean
          business_id: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          member_id?: string | null
          reason?: string | null
          starts_at: string
        }
        Update: {
          all_day?: boolean
          business_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          member_id?: string | null
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_member_fk"
            columns: ["business_id", "member_id"]
            isOneToOne: false
            referencedRelation: "business_members"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      working_hours: {
        Row: {
          business_id: string
          created_at: string
          end_time: string
          id: string
          member_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          business_id: string
          created_at?: string
          end_time: string
          id?: string
          member_id: string
          start_time: string
          weekday: number
        }
        Update: {
          business_id?: string
          created_at?: string
          end_time?: string
          id?: string
          member_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_member_fk"
            columns: ["business_id", "member_id"]
            isOneToOne: false
            referencedRelation: "business_members"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_time_off: {
        Args: {
          p_end_date?: string
          p_end_time?: string
          p_member_id?: string
          p_reason?: string
          p_start_date: string
          p_start_time?: string
        }
        Returns: string
      }
      create_appointment: {
        Args: {
          p_client_id: string
          p_date: string
          p_duration_minutes?: number
          p_member_id: string
          p_notes?: string
          p_service_id: string
          p_source?: Database["public"]["Enums"]["appointment_source"]
          p_status?: Database["public"]["Enums"]["appointment_status"]
          p_time: string
        }
        Returns: string
      }
      create_business: {
        Args: {
          p_category: Database["public"]["Enums"]["business_category"]
          p_city?: string
          p_name: string
          p_phone?: string
          p_slug: string
          p_whatsapp?: string
        }
        Returns: string
      }
      is_slug_available: { Args: { p_slug: string }; Returns: boolean }
      reschedule_appointment: {
        Args: {
          p_appointment_id: string
          p_date: string
          p_duration_minutes?: number
          p_time: string
        }
        Returns: string
      }
      set_appointment_status: {
        Args: {
          p_appointment_id: string
          p_cancel_reason?: string
          p_status: Database["public"]["Enums"]["appointment_status"]
        }
        Returns: undefined
      }
      set_working_hours: {
        Args: { p_hours: Json; p_member_id: string }
        Returns: undefined
      }
    }
    Enums: {
      appointment_source: "manual" | "online"
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      business_category: "beauty" | "health" | "other"
      member_role: "owner" | "admin" | "staff"
      price_type: "fixed" | "from"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_source: ["manual", "online"],
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      business_category: ["beauty", "health", "other"],
      member_role: ["owner", "admin", "staff"],
      price_type: ["fixed", "from"],
    },
  },
} as const
