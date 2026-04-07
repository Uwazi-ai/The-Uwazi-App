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
      ai_chats: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          prompt: string
          response: string | null
          saved: boolean
          sources: Json | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          prompt: string
          response?: string | null
          saved?: boolean
          sources?: Json | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          prompt?: string
          response?: string | null
          saved?: boolean
          sources?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          description: string | null
          icon_url: string | null
          id: string
          name: string
          slug: string
          xp_reward: number | null
        }
        Insert: {
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          slug: string
          xp_reward?: number | null
        }
        Update: {
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      ballot_items: {
        Row: {
          created_at: string
          description: string | null
          district: string | null
          election_id: string
          id: string
          no_summary: string | null
          office_or_measure: string
          plain_language_summary: string | null
          source_url: string | null
          updated_at: string
          yes_summary: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          district?: string | null
          election_id: string
          id?: string
          no_summary?: string | null
          office_or_measure: string
          plain_language_summary?: string | null
          source_url?: string | null
          updated_at?: string
          yes_summary?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          district?: string | null
          election_id?: string
          id?: string
          no_summary?: string | null
          office_or_measure?: string
          plain_language_summary?: string | null
          source_url?: string | null
          updated_at?: string
          yes_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ballot_items_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          bio: string | null
          created_at: string
          district: string | null
          endorsements_data: Json | null
          id: string
          name: string
          office: string
          party: string | null
          photo_url: string | null
          platform_summary: string | null
          simplified_bio: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          district?: string | null
          endorsements_data?: Json | null
          id?: string
          name: string
          office: string
          party?: string | null
          photo_url?: string | null
          platform_summary?: string | null
          simplified_bio?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          district?: string | null
          endorsements_data?: Json | null
          id?: string
          name?: string
          office?: string
          party?: string | null
          photo_url?: string | null
          platform_summary?: string | null
          simplified_bio?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      civic_scores: {
        Row: {
          civic_literacy_score: number | null
          id: string
          lessons_completed: number | null
          quizzes_passed: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          civic_literacy_score?: number | null
          id?: string
          lessons_completed?: number | null
          quizzes_passed?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          civic_literacy_score?: number | null
          id?: string
          lessons_completed?: number | null
          quizzes_passed?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      elections: {
        Row: {
          absentee_deadline: string | null
          created_at: string
          description: string | null
          early_voting_end: string | null
          early_voting_start: string | null
          election_date: string
          id: string
          jurisdiction: string
          registration_deadline: string | null
          type: string
          updated_at: string
        }
        Insert: {
          absentee_deadline?: string | null
          created_at?: string
          description?: string | null
          early_voting_end?: string | null
          early_voting_start?: string | null
          election_date: string
          id?: string
          jurisdiction: string
          registration_deadline?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          absentee_deadline?: string | null
          created_at?: string
          description?: string | null
          early_voting_end?: string | null
          early_voting_start?: string | null
          election_date?: string
          id?: string
          jurisdiction?: string
          registration_deadline?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          civic_knowledge_level: string | null
          created_at: string
          display_name: string | null
          district: string | null
          id: string
          location: string | null
          onboarding_complete: boolean
          street_address: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          civic_knowledge_level?: string | null
          created_at?: string
          display_name?: string | null
          district?: string | null
          id?: string
          location?: string | null
          onboarding_complete?: boolean
          street_address?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          civic_knowledge_level?: string | null
          created_at?: string
          display_name?: string | null
          district?: string | null
          id?: string
          location?: string | null
          onboarding_complete?: boolean
          street_address?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          reason: string
          status?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          current_streak: number | null
          id: string
          last_active_date: string | null
          longest_streak: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          id?: string
          last_active_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          id?: string
          last_active_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string | null
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          accessibility_settings: Json | null
          content_depth: string | null
          created_at: string
          id: string
          issue_interests: string[] | null
          news_categories: string[] | null
          notification_settings: Json | null
          preferred_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accessibility_settings?: Json | null
          content_depth?: string | null
          created_at?: string
          id?: string
          issue_interests?: string[] | null
          news_categories?: string[] | null
          notification_settings?: Json | null
          preferred_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accessibility_settings?: Json | null
          content_depth?: string | null
          created_at?: string
          id?: string
          issue_interests?: string[] | null
          news_categories?: string[] | null
          notification_settings?: Json | null
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voting_plan_items: {
        Row: {
          ballot_item_id: string | null
          created_at: string
          id: string
          notes: string | null
          selected_candidate_id: string | null
          selected_position: string | null
          voting_plan_id: string
        }
        Insert: {
          ballot_item_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          selected_candidate_id?: string | null
          selected_position?: string | null
          voting_plan_id: string
        }
        Update: {
          ballot_item_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          selected_candidate_id?: string | null
          selected_position?: string | null
          voting_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voting_plan_items_ballot_item_id_fkey"
            columns: ["ballot_item_id"]
            isOneToOne: false
            referencedRelation: "ballot_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voting_plan_items_selected_candidate_id_fkey"
            columns: ["selected_candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voting_plan_items_voting_plan_id_fkey"
            columns: ["voting_plan_id"]
            isOneToOne: false
            referencedRelation: "voting_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_plans: {
        Row: {
          created_at: string
          election_id: string
          exported_at: string | null
          id: string
          reminders_enabled: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          election_id: string
          exported_at?: string | null
          id?: string
          reminders_enabled?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          election_id?: string
          exported_at?: string | null
          id?: string
          reminders_enabled?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voting_plans_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
