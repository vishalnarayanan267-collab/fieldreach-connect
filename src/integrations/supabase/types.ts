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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assigned_tasks: {
        Row: {
          assigned_by: string
          created_at: string
          h_id: string
          id: string
          scheduled_date: string
          status: string
          task_notes: string
          worker_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          h_id: string
          id?: string
          scheduled_date: string
          status?: string
          task_notes: string
          worker_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          h_id?: string
          id?: string
          scheduled_date?: string
          status?: string
          task_notes?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assigned_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_tasks_h_id_fkey"
            columns: ["h_id"]
            isOneToOne: false
            referencedRelation: "h_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_visit_logs: {
        Row: {
          contact_met_id: string | null
          created_at: string
          date: string
          expense_remarks: string | null
          food_expense: number
          h_id: string
          id: string
          lodge_expense: number
          outcome_notes: string
          purpose: Database["public"]["Enums"]["visit_purpose"]
          staff_id: string
          travel_expense: number
          visit_date: string
        }
        Insert: {
          contact_met_id?: string | null
          created_at?: string
          date?: string
          expense_remarks?: string | null
          food_expense?: number
          h_id: string
          id?: string
          lodge_expense?: number
          outcome_notes: string
          purpose: Database["public"]["Enums"]["visit_purpose"]
          staff_id: string
          travel_expense?: number
          visit_date?: string
        }
        Update: {
          contact_met_id?: string | null
          created_at?: string
          date?: string
          expense_remarks?: string | null
          food_expense?: number
          h_id?: string
          id?: string
          lodge_expense?: number
          outcome_notes?: string
          purpose?: Database["public"]["Enums"]["visit_purpose"]
          staff_id?: string
          travel_expense?: number
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_visit_logs_contact_met_id_fkey"
            columns: ["contact_met_id"]
            isOneToOne: false
            referencedRelation: "h_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_visit_logs_h_id_fkey"
            columns: ["h_id"]
            isOneToOne: false
            referencedRelation: "h_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_visit_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      h_contacts: {
        Row: {
          contact_name: string
          created_at: string
          h_id: string
          id: string
          phone_number: string | null
          posting_designation: string
        }
        Insert: {
          contact_name: string
          created_at?: string
          h_id: string
          id?: string
          phone_number?: string | null
          posting_designation: string
        }
        Update: {
          contact_name?: string
          created_at?: string
          h_id?: string
          id?: string
          phone_number?: string | null
          posting_designation?: string
        }
        Relationships: [
          {
            foreignKeyName: "h_contacts_h_id_fkey"
            columns: ["h_id"]
            isOneToOne: false
            referencedRelation: "h_master"
            referencedColumns: ["id"]
          },
        ]
      }
      h_master: {
        Row: {
          branch_area: string
          city: string
          created_at: string
          h_name: string
          id: string
        }
        Insert: {
          branch_area: string
          city: string
          created_at?: string
          h_name: string
          id?: string
        }
        Update: {
          branch_area?: string
          city?: string
          created_at?: string
          h_name?: string
          id?: string
        }
        Relationships: []
      }
      staff_leaves: {
        Row: {
          created_at: string
          duration_type: Database["public"]["Enums"]["leave_duration"]
          end_date: string
          hours_needed: number | null
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason_notes: string
          reviewed_at: string | null
          reviewed_by: string | null
          staff_id: string
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_type: Database["public"]["Enums"]["leave_duration"]
          end_date: string
          hours_needed?: number | null
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason_notes: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_type?: Database["public"]["Enums"]["leave_duration"]
          end_date?: string
          hours_needed?: number | null
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason_notes?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_leaves_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          staff_name: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_name: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "worker"
      leave_duration: "Full Day" | "Half Day" | "Hourly"
      leave_status: "Pending" | "Approved" | "Rejected"
      leave_type: "Sick Leave" | "Personal Work Leave" | "Mid-Day Offsite"
      visit_purpose:
        | "Product Demo"
        | "New Order Taking"
        | "Payment Collection"
        | "Relationship Building"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "worker"],
      leave_duration: ["Full Day", "Half Day", "Hourly"],
      leave_status: ["Pending", "Approved", "Rejected"],
      leave_type: ["Sick Leave", "Personal Work Leave", "Mid-Day Offsite"],
      visit_purpose: [
        "Product Demo",
        "New Order Taking",
        "Payment Collection",
        "Relationship Building",
      ],
    },
  },
} as const
