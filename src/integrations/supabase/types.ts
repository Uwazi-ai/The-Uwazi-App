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
      ask_uwazi_sessions: {
        Row: {
          created_at: string | null
          id: string
          messages: Json
          updated_at: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json
          updated_at?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json
          updated_at?: string | null
          user_id?: string
          zip_code?: string | null
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
      ballot_selections: {
        Row: {
          candidate_or_choice: string | null
          created_at: string | null
          election_id: string | null
          id: string
          race_id: string | null
          updated_at: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          candidate_or_choice?: string | null
          created_at?: string | null
          election_id?: string | null
          id?: string
          race_id?: string | null
          updated_at?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          candidate_or_choice?: string | null
          created_at?: string | null
          election_id?: string | null
          id?: string
          race_id?: string | null
          updated_at?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      bill_upvotes: {
        Row: {
          bill_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          bill_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          bill_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
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
      civic_alerts: {
        Row: {
          alert_type: string | null
          created_at: string | null
          created_by: string
          id: string
          message: string
          recipient_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          target_type: string | null
          target_zips: Json | null
          title: string
        }
        Insert: {
          alert_type?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          message: string
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          target_type?: string | null
          target_zips?: Json | null
          title: string
        }
        Update: {
          alert_type?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          message?: string
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          target_type?: string | null
          target_zips?: Json | null
          title?: string
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
      lessons: {
        Row: {
          category: string | null
          content: Json | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          is_published: boolean | null
          order_index: number | null
          slug: string
          title: string
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          slug: string
          title: string
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          slug?: string
          title?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json | null
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
          is_admin: boolean | null
          is_suspended: boolean | null
          last_active: string | null
          location: string | null
          notify_civic_alerts: boolean
          notify_elections: boolean
          notify_new_lessons: boolean
          notify_streak_reminders: boolean
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
          is_admin?: boolean | null
          is_suspended?: boolean | null
          last_active?: string | null
          location?: string | null
          notify_civic_alerts?: boolean
          notify_elections?: boolean
          notify_new_lessons?: boolean
          notify_streak_reminders?: boolean
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
          is_admin?: boolean | null
          is_suspended?: boolean | null
          last_active?: string | null
          location?: string | null
          notify_civic_alerts?: boolean
          notify_elections?: boolean
          notify_new_lessons?: boolean
          notify_streak_reminders?: boolean
          onboarding_complete?: boolean
          street_address?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      raia_scores: {
        Row: {
          ballot_comprehension_score: number | null
          calculated_at: string | null
          data_sources: Json | null
          health_correlation_score: number | null
          id: string
          policy_awareness_score: number | null
          score: number | null
          trust_score: number | null
          voter_turnout_score: number | null
          zip_code: string
        }
        Insert: {
          ballot_comprehension_score?: number | null
          calculated_at?: string | null
          data_sources?: Json | null
          health_correlation_score?: number | null
          id?: string
          policy_awareness_score?: number | null
          score?: number | null
          trust_score?: number | null
          voter_turnout_score?: number | null
          zip_code: string
        }
        Update: {
          ballot_comprehension_score?: number | null
          calculated_at?: string | null
          data_sources?: Json | null
          health_correlation_score?: number | null
          id?: string
          policy_awareness_score?: number | null
          score?: number | null
          trust_score?: number | null
          voter_turnout_score?: number | null
          zip_code?: string
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
      saved_articles: {
        Row: {
          article_image: string | null
          article_source: string | null
          article_title: string | null
          article_url: string
          id: string
          saved_at: string | null
          user_id: string
        }
        Insert: {
          article_image?: string | null
          article_source?: string | null
          article_title?: string | null
          article_url: string
          id?: string
          saved_at?: string | null
          user_id: string
        }
        Update: {
          article_image?: string | null
          article_source?: string | null
          article_title?: string | null
          article_url?: string
          id?: string
          saved_at?: string | null
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
      saved_legislation: {
        Row: {
          bill_id: string
          bill_title: string | null
          bill_url: string | null
          id: string
          jurisdiction: string | null
          saved_at: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          bill_id: string
          bill_title?: string | null
          bill_url?: string | null
          id?: string
          jurisdiction?: string | null
          saved_at?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          bill_id?: string
          bill_title?: string | null
          bill_url?: string | null
          id?: string
          jurisdiction?: string | null
          saved_at?: string | null
          user_id?: string
          zip_code?: string | null
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
      user_lesson_progress: {
        Row: {
          completed_at: string | null
          id: string
          lesson_id: string | null
          score: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lesson_id?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          lesson_id?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
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
          election_date: string | null
          election_id: string
          exported_at: string | null
          id: string
          notes: string | null
          plan_complete: boolean | null
          polling_location: string | null
          reminder_time: string | null
          reminders_enabled: boolean
          status: string
          transport_method: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          created_at?: string
          election_date?: string | null
          election_id: string
          exported_at?: string | null
          id?: string
          notes?: string | null
          plan_complete?: boolean | null
          polling_location?: string | null
          reminder_time?: string | null
          reminders_enabled?: boolean
          status?: string
          transport_method?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          created_at?: string
          election_date?: string | null
          election_id?: string
          exported_at?: string | null
          id?: string
          notes?: string | null
          plan_complete?: boolean | null
          polling_location?: string | null
          reminder_time?: string | null
          reminders_enabled?: boolean
          status?: string
          transport_method?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
