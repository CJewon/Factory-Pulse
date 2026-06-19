export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      factories: {
        Row: {
          id: string;
          name: string;
          location: string;
          description: string | null;
          status: "active" | "inactive" | string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location: string;
          description?: string | null;
          status?: "active" | "inactive" | string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string;
          description?: string | null;
          status?: "active" | "inactive" | string;
          created_at?: string;
        };
        Relationships: [];
      };
      lines: {
        Row: {
          id: string;
          factory_id: string;
          name: string;
          description: string | null;
          status: "active" | "inactive" | string;
          created_at: string;
        };
        Insert: {
          id?: string;
          factory_id: string;
          name: string;
          description?: string | null;
          status?: "active" | "inactive" | string;
          created_at?: string;
        };
        Update: {
          id?: string;
          factory_id?: string;
          name?: string;
          description?: string | null;
          status?: "active" | "inactive" | string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lines_factory_id_fkey";
            columns: ["factory_id"];
            referencedRelation: "factories";
            referencedColumns: ["id"];
          }
        ];
      };
      machines: {
        Row: {
          id: string;
          line_id: string;
          name: string;
          type: string;
          status: "normal" | "warning" | "critical" | "stopped" | "maintenance" | string;
          model_name: string | null;
          installed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          line_id: string;
          name: string;
          type: string;
          status?: "normal" | "warning" | "critical" | "stopped" | "maintenance" | string;
          model_name?: string | null;
          installed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          line_id?: string;
          name?: string;
          type?: string;
          status?: "normal" | "warning" | "critical" | "stopped" | "maintenance" | string;
          model_name?: string | null;
          installed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "machines_line_id_fkey";
            columns: ["line_id"];
            referencedRelation: "lines";
            referencedColumns: ["id"];
          }
        ];
      };
      sensor_readings: {
        Row: {
          id: string;
          machine_id: string;
          temperature: number;
          pressure: number;
          current_amp: number;
          vibration: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          machine_id: string;
          temperature: number;
          pressure: number;
          current_amp: number;
          vibration: number;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          machine_id?: string;
          temperature?: number;
          pressure?: number;
          current_amp?: number;
          vibration?: number;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sensor_readings_machine_id_fkey";
            columns: ["machine_id"];
            referencedRelation: "machines";
            referencedColumns: ["id"];
          }
        ];
      };
      alarms: {
        Row: {
          id: string;
          machine_id: string;
          severity: "info" | "warning" | "critical" | string;
          message: string;
          is_resolved: boolean;
          occurred_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          machine_id: string;
          severity: "info" | "warning" | "critical" | string;
          message: string;
          is_resolved?: boolean;
          occurred_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          id?: string;
          machine_id?: string;
          severity?: "info" | "warning" | "critical" | string;
          message?: string;
          is_resolved?: boolean;
          occurred_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alarms_machine_id_fkey";
            columns: ["machine_id"];
            referencedRelation: "machines";
            referencedColumns: ["id"];
          }
        ];
      };
      production_reports: {
        Row: {
          id: string;
          factory_id: string;
          report_date: string;
          total_output: number;
          defect_count: number;
          operation_rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          factory_id: string;
          report_date: string;
          total_output: number;
          defect_count: number;
          operation_rate: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          factory_id?: string;
          report_date?: string;
          total_output?: number;
          defect_count?: number;
          operation_rate?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "production_reports_factory_id_fkey";
            columns: ["factory_id"];
            referencedRelation: "factories";
            referencedColumns: ["id"];
          }
        ];
      };
      dashboard_preferences: {
        Row: {
          user_id: string;
          visible_cards: Json | null;
          refresh_interval: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          visible_cards?: Json | null;
          refresh_interval?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          visible_cards?: Json | null;
          refresh_interval?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
