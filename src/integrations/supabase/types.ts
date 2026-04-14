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
          emoji: string | null
          icon_url: string | null
          id: string
          name: string
          rarity: string | null
          slug: string
          track_id: string | null
          unlock_condition: string | null
          xp_reward: number | null
          xp_value: number | null
        }
        Insert: {
          description?: string | null
          emoji?: string | null
          icon_url?: string | null
          id?: string
          name: string
          rarity?: string | null
          slug: string
          track_id?: string | null
          unlock_condition?: string | null
          xp_reward?: number | null
          xp_value?: number | null
        }
        Update: {
          description?: string | null
          emoji?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          rarity?: string | null
          slug?: string
          track_id?: string | null
          unlock_condition?: string | null
          xp_reward?: number | null
          xp_value?: number | null
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
      ballotpedia_ballot_measures: {
        Row: {
          ballotpedia_url: string | null
          city: string | null
          county: string | null
          election_date: string | null
          election_year: number | null
          expires_at: string | null
          full_text_url: string | null
          id: string
          jurisdiction_level: string | null
          measure_number: string | null
          measure_type: string | null
          no_pct: number | null
          no_votes: number | null
          result: string | null
          scraped_at: string | null
          state_code: string | null
          summary: string | null
          title: string
          yes_pct: number | null
          yes_votes: number | null
        }
        Insert: {
          ballotpedia_url?: string | null
          city?: string | null
          county?: string | null
          election_date?: string | null
          election_year?: number | null
          expires_at?: string | null
          full_text_url?: string | null
          id?: string
          jurisdiction_level?: string | null
          measure_number?: string | null
          measure_type?: string | null
          no_pct?: number | null
          no_votes?: number | null
          result?: string | null
          scraped_at?: string | null
          state_code?: string | null
          summary?: string | null
          title: string
          yes_pct?: number | null
          yes_votes?: number | null
        }
        Update: {
          ballotpedia_url?: string | null
          city?: string | null
          county?: string | null
          election_date?: string | null
          election_year?: number | null
          expires_at?: string | null
          full_text_url?: string | null
          id?: string
          jurisdiction_level?: string | null
          measure_number?: string | null
          measure_type?: string | null
          no_pct?: number | null
          no_votes?: number | null
          result?: string | null
          scraped_at?: string | null
          state_code?: string | null
          summary?: string | null
          title?: string
          yes_pct?: number | null
          yes_votes?: number | null
        }
        Relationships: []
      }
      ballotpedia_candidates: {
        Row: {
          ballotpedia_url: string | null
          campaign_website: string | null
          city: string | null
          district: string | null
          election_date: string | null
          election_name: string | null
          election_type: string | null
          election_year: number | null
          expires_at: string | null
          id: string
          incumbent: boolean | null
          name: string
          office: string
          office_level: string | null
          party: string | null
          party_color: string | null
          scraped_at: string | null
          state_code: string | null
          withdrew: boolean | null
        }
        Insert: {
          ballotpedia_url?: string | null
          campaign_website?: string | null
          city?: string | null
          district?: string | null
          election_date?: string | null
          election_name?: string | null
          election_type?: string | null
          election_year?: number | null
          expires_at?: string | null
          id?: string
          incumbent?: boolean | null
          name: string
          office: string
          office_level?: string | null
          party?: string | null
          party_color?: string | null
          scraped_at?: string | null
          state_code?: string | null
          withdrew?: boolean | null
        }
        Update: {
          ballotpedia_url?: string | null
          campaign_website?: string | null
          city?: string | null
          district?: string | null
          election_date?: string | null
          election_name?: string | null
          election_type?: string | null
          election_year?: number | null
          expires_at?: string | null
          id?: string
          incumbent?: boolean | null
          name?: string
          office?: string
          office_level?: string | null
          party?: string | null
          party_color?: string | null
          scraped_at?: string | null
          state_code?: string | null
          withdrew?: boolean | null
        }
        Relationships: []
      }
      ballotpedia_elections: {
        Row: {
          ballotpedia_url: string | null
          city: string | null
          election_date: string
          election_name: string
          election_type: string | null
          election_year: number | null
          expires_at: string | null
          id: string
          is_upcoming: boolean | null
          scraped_at: string | null
          state_code: string | null
        }
        Insert: {
          ballotpedia_url?: string | null
          city?: string | null
          election_date: string
          election_name: string
          election_type?: string | null
          election_year?: number | null
          expires_at?: string | null
          id?: string
          is_upcoming?: boolean | null
          scraped_at?: string | null
          state_code?: string | null
        }
        Update: {
          ballotpedia_url?: string | null
          city?: string | null
          election_date?: string
          election_name?: string
          election_type?: string | null
          election_year?: number | null
          expires_at?: string | null
          id?: string
          is_upcoming?: boolean | null
          scraped_at?: string | null
          state_code?: string | null
        }
        Relationships: []
      }
      ballotpedia_officials: {
        Row: {
          assumed_office: string | null
          ballotpedia_url: string | null
          city: string | null
          district: string | null
          expires_at: string | null
          id: string
          name: string
          office: string
          party: string | null
          photo_url: string | null
          scraped_at: string | null
          state_code: string | null
          term_ends: string | null
        }
        Insert: {
          assumed_office?: string | null
          ballotpedia_url?: string | null
          city?: string | null
          district?: string | null
          expires_at?: string | null
          id?: string
          name: string
          office: string
          party?: string | null
          photo_url?: string | null
          scraped_at?: string | null
          state_code?: string | null
          term_ends?: string | null
        }
        Update: {
          assumed_office?: string | null
          ballotpedia_url?: string | null
          city?: string | null
          district?: string | null
          expires_at?: string | null
          id?: string
          name?: string
          office?: string
          party?: string | null
          photo_url?: string | null
          scraped_at?: string | null
          state_code?: string | null
          term_ends?: string | null
        }
        Relationships: []
      }
      ballotpedia_scraper_log: {
        Row: {
          city: string | null
          completed_at: string | null
          error_message: string | null
          id: string
          job_type: string | null
          records_scraped: number | null
          started_at: string | null
          state_code: string | null
          status: string | null
        }
        Insert: {
          city?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string | null
          records_scraped?: number | null
          started_at?: string | null
          state_code?: string | null
          status?: string | null
        }
        Update: {
          city?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string | null
          records_scraped?: number | null
          started_at?: string | null
          state_code?: string | null
          status?: string | null
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
      campaign_recipients: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          created_at: string | null
          email: string | null
          failed_reason: string | null
          id: string
          opened_at: string | null
          phone_number: string | null
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string | null
          email?: string | null
          failed_reason?: string | null
          id?: string
          opened_at?: string | null
          phone_number?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string | null
          email?: string | null
          failed_reason?: string | null
          id?: string
          opened_at?: string | null
          phone_number?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
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
      election_races: {
        Row: {
          ballotpedia_url: string | null
          created_at: string
          district: number | null
          election_date: string
          id: string
          is_partisan: boolean
          last_scraped_at: string | null
          office: string
          phase: string
          state: string
          updated_at: string
        }
        Insert: {
          ballotpedia_url?: string | null
          created_at?: string
          district?: number | null
          election_date: string
          id?: string
          is_partisan?: boolean
          last_scraped_at?: string | null
          office: string
          phase?: string
          state: string
          updated_at?: string
        }
        Update: {
          ballotpedia_url?: string | null
          created_at?: string
          district?: number | null
          election_date?: string
          id?: string
          is_partisan?: boolean
          last_scraped_at?: string | null
          office?: string
          phase?: string
          state?: string
          updated_at?: string
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      episodes: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          id: string
          is_free: boolean
          is_published: boolean
          sort_order: number
          title: string
          topic: string
          topic_emoji: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          sort_order?: number
          title: string
          topic: string
          topic_emoji?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          sort_order?: number
          title?: string
          topic?: string
          topic_emoji?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      lesson_gap_recommendations: {
        Row: {
          created_at: string | null
          created_lesson_id: string | null
          example_questions: Json | null
          id: string
          priority_score: number | null
          question_count: number | null
          status: string | null
          suggested_category: string | null
          suggested_difficulty: string | null
          suggested_title: string
          top_zip_codes: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_lesson_id?: string | null
          example_questions?: Json | null
          id?: string
          priority_score?: number | null
          question_count?: number | null
          status?: string | null
          suggested_category?: string | null
          suggested_difficulty?: string | null
          suggested_title: string
          top_zip_codes?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_lesson_id?: string | null
          example_questions?: Json | null
          id?: string
          priority_score?: number | null
          question_count?: number | null
          status?: string | null
          suggested_category?: string | null
          suggested_difficulty?: string | null
          suggested_title?: string
          top_zip_codes?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_gap_recommendations_created_lesson_id_fkey"
            columns: ["created_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_tracks: {
        Row: {
          color: string | null
          description: string | null
          difficulty: string | null
          emoji: string | null
          id: string
          lesson_count: number | null
          name: string
          order_index: number | null
          total_xp: number | null
        }
        Insert: {
          color?: string | null
          description?: string | null
          difficulty?: string | null
          emoji?: string | null
          id: string
          lesson_count?: number | null
          name: string
          order_index?: number | null
          total_xp?: number | null
        }
        Update: {
          color?: string | null
          description?: string | null
          difficulty?: string | null
          emoji?: string | null
          id?: string
          lesson_count?: number | null
          name?: string
          order_index?: number | null
          total_xp?: number | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          action_items: Json | null
          badge_awarded: string | null
          category: string | null
          content: Json | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_minutes: number | null
          id: string
          is_published: boolean | null
          key_takeaways: Json | null
          lesson_number: string | null
          order_index: number | null
          prerequisites: Json | null
          quiz_questions: Json | null
          slug: string
          title: string
          total_slides: number | null
          track_emoji: string | null
          track_id: string | null
          track_name: string | null
          xp_reward: number | null
        }
        Insert: {
          action_items?: Json | null
          badge_awarded?: string | null
          category?: string | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean | null
          key_takeaways?: Json | null
          lesson_number?: string | null
          order_index?: number | null
          prerequisites?: Json | null
          quiz_questions?: Json | null
          slug: string
          title: string
          total_slides?: number | null
          track_emoji?: string | null
          track_id?: string | null
          track_name?: string | null
          xp_reward?: number | null
        }
        Update: {
          action_items?: Json | null
          badge_awarded?: string | null
          category?: string | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean | null
          key_takeaways?: Json | null
          lesson_number?: string | null
          order_index?: number | null
          prerequisites?: Json | null
          quiz_questions?: Json | null
          slug?: string
          title?: string
          total_slides?: number | null
          track_emoji?: string | null
          track_id?: string | null
          track_name?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      outreach_campaigns: {
        Row: {
          campaign_type: string
          clicked_count: number | null
          created_at: string | null
          created_by: string | null
          delivered_count: number | null
          email_body: string | null
          failed_count: number | null
          id: string
          name: string
          opened_count: number | null
          preview_text: string | null
          push_body: string | null
          push_icon: string | null
          push_title: string | null
          push_url: string | null
          recipient_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          sms_body: string | null
          status: string | null
          subject: string | null
          target_civic_score_max: number | null
          target_civic_score_min: number | null
          target_has_voting_plan: boolean | null
          target_lessons_completed_min: number | null
          target_states: Json | null
          target_tags: Json | null
          target_type: string | null
          target_zip_codes: Json | null
          unsubscribed_count: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_type: string
          clicked_count?: number | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          email_body?: string | null
          failed_count?: number | null
          id?: string
          name: string
          opened_count?: number | null
          preview_text?: string | null
          push_body?: string | null
          push_icon?: string | null
          push_title?: string | null
          push_url?: string | null
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sms_body?: string | null
          status?: string | null
          subject?: string | null
          target_civic_score_max?: number | null
          target_civic_score_min?: number | null
          target_has_voting_plan?: boolean | null
          target_lessons_completed_min?: number | null
          target_states?: Json | null
          target_tags?: Json | null
          target_type?: string | null
          target_zip_codes?: Json | null
          unsubscribed_count?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_type?: string
          clicked_count?: number | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          email_body?: string | null
          failed_count?: number | null
          id?: string
          name?: string
          opened_count?: number | null
          preview_text?: string | null
          push_body?: string | null
          push_icon?: string | null
          push_title?: string | null
          push_url?: string | null
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sms_body?: string | null
          status?: string | null
          subject?: string | null
          target_civic_score_max?: number | null
          target_civic_score_min?: number | null
          target_has_voting_plan?: boolean | null
          target_lessons_completed_min?: number | null
          target_states?: Json | null
          target_tags?: Json | null
          target_type?: string | null
          target_zip_codes?: Json | null
          unsubscribed_count?: number | null
          updated_at?: string | null
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
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          civic_knowledge_level: string | null
          contact_score: number | null
          contact_tags: Json | null
          created_at: string
          crm_notes: string | null
          display_name: string | null
          district: string | null
          email_opt_in: boolean | null
          full_address: string | null
          id: string
          is_admin: boolean | null
          is_suspended: boolean | null
          last_active: string | null
          last_contacted_at: string | null
          location: string | null
          notify_civic_alerts: boolean
          notify_elections: boolean
          notify_new_lessons: boolean
          notify_streak_reminders: boolean
          onboarding_complete: boolean
          phone_number: string | null
          phone_verified: boolean | null
          push_opt_in: boolean | null
          push_token: string | null
          sms_opt_in: boolean | null
          state_code: string | null
          street_address: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          civic_knowledge_level?: string | null
          contact_score?: number | null
          contact_tags?: Json | null
          created_at?: string
          crm_notes?: string | null
          display_name?: string | null
          district?: string | null
          email_opt_in?: boolean | null
          full_address?: string | null
          id?: string
          is_admin?: boolean | null
          is_suspended?: boolean | null
          last_active?: string | null
          last_contacted_at?: string | null
          location?: string | null
          notify_civic_alerts?: boolean
          notify_elections?: boolean
          notify_new_lessons?: boolean
          notify_streak_reminders?: boolean
          onboarding_complete?: boolean
          phone_number?: string | null
          phone_verified?: boolean | null
          push_opt_in?: boolean | null
          push_token?: string | null
          sms_opt_in?: boolean | null
          state_code?: string | null
          street_address?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          civic_knowledge_level?: string | null
          contact_score?: number | null
          contact_tags?: Json | null
          created_at?: string
          crm_notes?: string | null
          display_name?: string | null
          district?: string | null
          email_opt_in?: boolean | null
          full_address?: string | null
          id?: string
          is_admin?: boolean | null
          is_suspended?: boolean | null
          last_active?: string | null
          last_contacted_at?: string | null
          location?: string | null
          notify_civic_alerts?: boolean
          notify_elections?: boolean
          notify_new_lessons?: boolean
          notify_streak_reminders?: boolean
          onboarding_complete?: boolean
          phone_number?: string | null
          phone_verified?: boolean | null
          push_opt_in?: boolean | null
          push_token?: string | null
          sms_opt_in?: boolean | null
          state_code?: string | null
          street_address?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          browser: string | null
          created_at: string | null
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          platform: string | null
          user_id: string | null
        }
        Insert: {
          auth_key: string
          browser?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          platform?: string | null
          user_id?: string | null
        }
        Update: {
          auth_key?: string
          browser?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          platform?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      question_topic_trends: {
        Row: {
          avg_complexity: string | null
          has_lesson: boolean | null
          id: string
          lesson_gap_score: number | null
          month_year: string | null
          question_count: number | null
          sub_topic: string | null
          top_zip_codes: Json | null
          topic_category: string
          unique_user_count: number | null
          updated_at: string | null
          week_number: number | null
        }
        Insert: {
          avg_complexity?: string | null
          has_lesson?: boolean | null
          id?: string
          lesson_gap_score?: number | null
          month_year?: string | null
          question_count?: number | null
          sub_topic?: string | null
          top_zip_codes?: Json | null
          topic_category: string
          unique_user_count?: number | null
          updated_at?: string | null
          week_number?: number | null
        }
        Update: {
          avg_complexity?: string | null
          has_lesson?: boolean | null
          id?: string
          lesson_gap_score?: number | null
          month_year?: string | null
          question_count?: number | null
          sub_topic?: string | null
          top_zip_codes?: Json | null
          topic_category?: string
          unique_user_count?: number | null
          updated_at?: string | null
          week_number?: number | null
        }
        Relationships: []
      }
      race_candidates: {
        Row: {
          ballotpedia_url: string | null
          bio: string | null
          created_at: string
          id: string
          is_incumbent: boolean
          last_election_pct: number | null
          name: string
          party: string
          photo_url: string | null
          positions: Json | null
          prior_office: string | null
          race_id: string
          status: string
          updated_at: string
          vote_pct: number | null
          website_url: string | null
        }
        Insert: {
          ballotpedia_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_incumbent?: boolean
          last_election_pct?: number | null
          name: string
          party: string
          photo_url?: string | null
          positions?: Json | null
          prior_office?: string | null
          race_id: string
          status?: string
          updated_at?: string
          vote_pct?: number | null
          website_url?: string | null
        }
        Update: {
          ballotpedia_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_incumbent?: boolean
          last_election_pct?: number | null
          name?: string
          party?: string
          photo_url?: string | null
          positions?: Json | null
          prior_office?: string | null
          race_id?: string
          status?: string
          updated_at?: string
          vote_pct?: number | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "race_candidates_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "election_races"
            referencedColumns: ["id"]
          },
        ]
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          answers: Json
          completed_at: string | null
          id: string
          is_anonymous: boolean | null
          state_code: string | null
          survey_id: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          state_code?: string | null
          survey_id?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          state_code?: string | null
          survey_id?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          completion_rate: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          questions: Json | null
          response_count: number | null
          send_via_email: boolean | null
          send_via_push: boolean | null
          sent_count: number | null
          show_in_app: boolean | null
          starts_at: string | null
          status: string | null
          target_states: Json | null
          target_tags: Json | null
          target_type: string | null
          target_zip_codes: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completion_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          questions?: Json | null
          response_count?: number | null
          send_via_email?: boolean | null
          send_via_push?: boolean | null
          sent_count?: number | null
          show_in_app?: boolean | null
          starts_at?: string | null
          status?: string | null
          target_states?: Json | null
          target_tags?: Json | null
          target_type?: string | null
          target_zip_codes?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completion_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          questions?: Json | null
          response_count?: number | null
          send_via_email?: boolean | null
          send_via_push?: boolean | null
          sent_count?: number | null
          show_in_app?: boolean | null
          starts_at?: string | null
          status?: string | null
          target_states?: Json | null
          target_tags?: Json | null
          target_type?: string | null
          target_zip_codes?: Json | null
          title?: string
          updated_at?: string | null
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
          current_slide: number | null
          id: string
          last_slide_seen: number | null
          lesson_id: string | null
          quiz_attempts: number | null
          quiz_score: number | null
          score: number | null
          status: string | null
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_slide?: number | null
          id?: string
          last_slide_seen?: number | null
          lesson_id?: string | null
          quiz_attempts?: number | null
          quiz_score?: number | null
          score?: number | null
          status?: string | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_slide?: number | null
          id?: string
          last_slide_seen?: number | null
          lesson_id?: string | null
          quiz_attempts?: number | null
          quiz_score?: number | null
          score?: number | null
          status?: string | null
          time_spent_seconds?: number | null
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
      uwazi_question_log: {
        Row: {
          complexity_level: string | null
          created_at: string | null
          follow_up_count: number | null
          has_matching_lesson: boolean | null
          id: string
          intent_type: string | null
          is_local_question: boolean | null
          lesson_gap_priority: string | null
          month_year: string | null
          question_length: number | null
          question_text: string
          required_web_search: boolean | null
          response_helpful: boolean | null
          session_id: string | null
          state_code: string | null
          sub_topic: string | null
          suggested_lesson_title: string | null
          topic_category: string | null
          user_id: string | null
          week_number: number | null
          zip_code: string | null
        }
        Insert: {
          complexity_level?: string | null
          created_at?: string | null
          follow_up_count?: number | null
          has_matching_lesson?: boolean | null
          id?: string
          intent_type?: string | null
          is_local_question?: boolean | null
          lesson_gap_priority?: string | null
          month_year?: string | null
          question_length?: number | null
          question_text: string
          required_web_search?: boolean | null
          response_helpful?: boolean | null
          session_id?: string | null
          state_code?: string | null
          sub_topic?: string | null
          suggested_lesson_title?: string | null
          topic_category?: string | null
          user_id?: string | null
          week_number?: number | null
          zip_code?: string | null
        }
        Update: {
          complexity_level?: string | null
          created_at?: string | null
          follow_up_count?: number | null
          has_matching_lesson?: boolean | null
          id?: string
          intent_type?: string | null
          is_local_question?: boolean | null
          lesson_gap_priority?: string | null
          month_year?: string | null
          question_length?: number | null
          question_text?: string
          required_web_search?: boolean | null
          response_helpful?: boolean | null
          session_id?: string | null
          state_code?: string | null
          sub_topic?: string | null
          suggested_lesson_title?: string | null
          topic_category?: string | null
          user_id?: string | null
          week_number?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uwazi_question_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ask_uwazi_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          polling_location_name: string | null
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
          polling_location_name?: string | null
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
          polling_location_name?: string | null
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_state_from_zip: { Args: { zip: string }; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
