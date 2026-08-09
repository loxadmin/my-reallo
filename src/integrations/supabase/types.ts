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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      advertiser_email_verifications: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          token_id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          token_id: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_email_verifications_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "advertiser_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_submissions: {
        Row: {
          admin_notes: string | null
          brand_logo_url: string | null
          brand_name: string
          ceo_name: string
          contact_number: string
          created_at: string
          email: string
          id: string
          loi_pdf_url: string | null
          processed_signature_url: string | null
          reviewed_at: string | null
          signature_url: string | null
          status: string
          token_id: string
          website_url: string
        }
        Insert: {
          admin_notes?: string | null
          brand_logo_url?: string | null
          brand_name: string
          ceo_name: string
          contact_number: string
          created_at?: string
          email: string
          id?: string
          loi_pdf_url?: string | null
          processed_signature_url?: string | null
          reviewed_at?: string | null
          signature_url?: string | null
          status?: string
          token_id: string
          website_url: string
        }
        Update: {
          admin_notes?: string | null
          brand_logo_url?: string | null
          brand_name?: string
          ceo_name?: string
          contact_number?: string
          created_at?: string
          email?: string
          id?: string
          loi_pdf_url?: string | null
          processed_signature_url?: string | null
          reviewed_at?: string | null
          signature_url?: string | null
          status?: string
          token_id?: string
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_submissions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "advertiser_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_tokens: {
        Row: {
          created_at: string
          created_by: string
          id: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      brand_catalog: {
        Row: {
          active: boolean
          category: string
          country: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          category?: string
          country?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          category?: string
          country?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      business_items: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean
          item_name: string
          last_verified_at: string | null
          updated_at: string
          user_id: string
          verification_frequency: string
          weekly_spend: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean
          item_name: string
          last_verified_at?: string | null
          updated_at?: string
          user_id: string
          verification_frequency?: string
          weekly_spend?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean
          item_name?: string
          last_verified_at?: string | null
          updated_at?: string
          user_id?: string
          verification_frequency?: string
          weekly_spend?: number
        }
        Relationships: []
      }
      campaign_eligibility: {
        Row: {
          active: boolean
          ai_weight: number
          budget_remaining: number | null
          campaign_id: string
          campaign_type: string
          category: string | null
          competes_with_brands: string[]
          created_at: string
          deposit_required: number
          duration_days: number
          eligible_brands: string[]
          eligible_goals: string[]
          eligible_interests: string[]
          eligible_locations: string[]
          eligible_segments: string[]
          exclusive_to_switchers: boolean
          expires_at: string | null
          goal_contribution_value: number
          id: string
          priority: number
          proof_instructions: string | null
          proof_types: string[]
          referral_required: number
          task_mode: string
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          ai_weight?: number
          budget_remaining?: number | null
          campaign_id: string
          campaign_type?: string
          category?: string | null
          competes_with_brands?: string[]
          created_at?: string
          deposit_required?: number
          duration_days?: number
          eligible_brands?: string[]
          eligible_goals?: string[]
          eligible_interests?: string[]
          eligible_locations?: string[]
          eligible_segments?: string[]
          exclusive_to_switchers?: boolean
          expires_at?: string | null
          goal_contribution_value?: number
          id?: string
          priority?: number
          proof_instructions?: string | null
          proof_types?: string[]
          referral_required?: number
          task_mode?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          ai_weight?: number
          budget_remaining?: number | null
          campaign_id?: string
          campaign_type?: string
          category?: string | null
          competes_with_brands?: string[]
          created_at?: string
          deposit_required?: number
          duration_days?: number
          eligible_brands?: string[]
          eligible_goals?: string[]
          eligible_interests?: string[]
          eligible_locations?: string[]
          eligible_segments?: string[]
          exclusive_to_switchers?: boolean
          expires_at?: string | null
          goal_contribution_value?: number
          id?: string
          priority?: number
          proof_instructions?: string | null
          proof_types?: string[]
          referral_required?: number
          task_mode?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      campaign_recommendations: {
        Row: {
          campaign_id: string
          campaign_type: string | null
          generated_at: string
          goal_account_id: string | null
          id: string
          reason: Json
          score: number
          user_id: string
        }
        Insert: {
          campaign_id: string
          campaign_type?: string | null
          generated_at?: string
          goal_account_id?: string | null
          id?: string
          reason?: Json
          score?: number
          user_id: string
        }
        Update: {
          campaign_id?: string
          campaign_type?: string | null
          generated_at?: string
          goal_account_id?: string | null
          id?: string
          reason?: Json
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recommendations_goal_account_id_fkey"
            columns: ["goal_account_id"]
            isOneToOne: false
            referencedRelation: "goal_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_apps: {
        Row: {
          app_logo_url: string | null
          app_name: string
          audience: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          points_select: number
          points_switch_complete: number
          points_switch_intent: number
          referral_link: string | null
          referral_message: string | null
          referral_points: number
          switch_link: string | null
          switch_to_referral_app_ids: string[] | null
        }
        Insert: {
          app_logo_url?: string | null
          app_name: string
          audience?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          points_select?: number
          points_switch_complete?: number
          points_switch_intent?: number
          referral_link?: string | null
          referral_message?: string | null
          referral_points?: number
          switch_link?: string | null
          switch_to_referral_app_ids?: string[] | null
        }
        Update: {
          app_logo_url?: string | null
          app_name?: string
          audience?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          points_select?: number
          points_switch_complete?: number
          points_switch_intent?: number
          referral_link?: string | null
          referral_message?: string | null
          referral_points?: number
          switch_link?: string | null
          switch_to_referral_app_ids?: string[] | null
        }
        Relationships: []
      }
      decision_responses: {
        Row: {
          app_id: string
          created_at: string
          has_app: boolean
          id: string
          points_awarded: number
          referral_approved: boolean
          referral_clicked: boolean
          referral_screenshot_url: string | null
          switch_available_at: string | null
          switch_completed: boolean
          user_id: string
          would_switch: boolean | null
        }
        Insert: {
          app_id: string
          created_at?: string
          has_app?: boolean
          id?: string
          points_awarded?: number
          referral_approved?: boolean
          referral_clicked?: boolean
          referral_screenshot_url?: string | null
          switch_available_at?: string | null
          switch_completed?: boolean
          user_id: string
          would_switch?: boolean | null
        }
        Update: {
          app_id?: string
          created_at?: string
          has_app?: boolean
          id?: string
          points_awarded?: number
          referral_approved?: boolean
          referral_clicked?: boolean
          referral_screenshot_url?: string | null
          switch_available_at?: string | null
          switch_completed?: boolean
          user_id?: string
          would_switch?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_responses_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "decision_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dummy_activity: {
        Row: {
          action_type: string
          created_at: string
          dummy_user_id: string | null
          id: string
          positions_moved: number | null
        }
        Insert: {
          action_type: string
          created_at?: string
          dummy_user_id?: string | null
          id?: string
          positions_moved?: number | null
        }
        Update: {
          action_type?: string
          created_at?: string
          dummy_user_id?: string | null
          id?: string
          positions_moved?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dummy_activity_dummy_user_id_fkey"
            columns: ["dummy_user_id"]
            isOneToOne: false
            referencedRelation: "dummy_users"
            referencedColumns: ["id"]
          },
        ]
      }
      dummy_transactions: {
        Row: {
          amount: number
          created_at: string
          dummy_user_id: string | null
          id: string
          is_verified: boolean
          transaction_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          dummy_user_id?: string | null
          id?: string
          is_verified?: boolean
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          dummy_user_id?: string | null
          id?: string
          is_verified?: boolean
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dummy_transactions_dummy_user_id_fkey"
            columns: ["dummy_user_id"]
            isOneToOne: false
            referencedRelation: "dummy_users"
            referencedColumns: ["id"]
          },
        ]
      }
      dummy_users: {
        Row: {
          annual_data_spend: number | null
          annual_electricity_spend: number | null
          annual_food_spend: number | null
          annual_transport_spend: number | null
          created_at: string
          email: string
          id: string
          points_balance: number | null
          queue_position: number | null
          referral_code: string | null
          spend_verified: boolean | null
          target_amount: number | null
          total_annual_spend: number | null
          user_type: string | null
        }
        Insert: {
          annual_data_spend?: number | null
          annual_electricity_spend?: number | null
          annual_food_spend?: number | null
          annual_transport_spend?: number | null
          created_at?: string
          email: string
          id?: string
          points_balance?: number | null
          queue_position?: number | null
          referral_code?: string | null
          spend_verified?: boolean | null
          target_amount?: number | null
          total_annual_spend?: number | null
          user_type?: string | null
        }
        Update: {
          annual_data_spend?: number | null
          annual_electricity_spend?: number | null
          annual_food_spend?: number | null
          annual_transport_spend?: number | null
          created_at?: string
          email?: string
          id?: string
          points_balance?: number | null
          queue_position?: number | null
          referral_code?: string | null
          spend_verified?: boolean | null
          target_amount?: number | null
          total_annual_spend?: number | null
          user_type?: string | null
        }
        Relationships: []
      }
      ghost_users: {
        Row: {
          created_at: string | null
          id: string
          position: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          position: number
        }
        Update: {
          created_at?: string | null
          id?: string
          position?: number
        }
        Relationships: []
      }
      goal_account_contributions: {
        Row: {
          amount: number
          created_at: string
          goal_account_id: string
          id: string
          note: string | null
          source: string
          source_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          goal_account_id: string
          id?: string
          note?: string | null
          source: string
          source_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          goal_account_id?: string
          id?: string
          note?: string | null
          source?: string
          source_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_account_contributions_goal_account_id_fkey"
            columns: ["goal_account_id"]
            isOneToOne: false
            referencedRelation: "goal_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_account_options: {
        Row: {
          chosen: boolean
          created_at: string
          deposit: number
          duration_months: number | null
          goal_account_id: string | null
          id: string
          label: string
          monthly_contribution: number | null
          requirements: Json
          user_id: string
        }
        Insert: {
          chosen?: boolean
          created_at?: string
          deposit?: number
          duration_months?: number | null
          goal_account_id?: string | null
          id?: string
          label: string
          monthly_contribution?: number | null
          requirements?: Json
          user_id: string
        }
        Update: {
          chosen?: boolean
          created_at?: string
          deposit?: number
          duration_months?: number | null
          goal_account_id?: string | null
          id?: string
          label?: string
          monthly_contribution?: number | null
          requirements?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_account_options_goal_account_id_fkey"
            columns: ["goal_account_id"]
            isOneToOne: false
            referencedRelation: "goal_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_accounts: {
        Row: {
          category: string | null
          chosen_option: string | null
          closed_at: string | null
          created_at: string
          deposit_paid: number
          deposit_required: number
          id: string
          maturity_months: number | null
          opened_at: string
          plan: Json
          risk_level: string | null
          status: string
          target_amount: number
          target_date: string | null
          title: string
          unlock_sources: Json
          unlocked_amount: number
          updated_at: string
          user_id: string
          withdrawn_amount: number | null
          withdrawn_at: string | null
        }
        Insert: {
          category?: string | null
          chosen_option?: string | null
          closed_at?: string | null
          created_at?: string
          deposit_paid?: number
          deposit_required?: number
          id?: string
          maturity_months?: number | null
          opened_at?: string
          plan?: Json
          risk_level?: string | null
          status?: string
          target_amount: number
          target_date?: string | null
          title: string
          unlock_sources?: Json
          unlocked_amount?: number
          updated_at?: string
          user_id: string
          withdrawn_amount?: number | null
          withdrawn_at?: string | null
        }
        Update: {
          category?: string | null
          chosen_option?: string | null
          closed_at?: string | null
          created_at?: string
          deposit_paid?: number
          deposit_required?: number
          id?: string
          maturity_months?: number | null
          opened_at?: string
          plan?: Json
          risk_level?: string | null
          status?: string
          target_amount?: number
          target_date?: string | null
          title?: string
          unlock_sources?: Json
          unlocked_amount?: number
          updated_at?: string
          user_id?: string
          withdrawn_amount?: number | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      goal_categories: {
        Row: {
          created_at: string | null
          goal_type: string
          id: string
          label: string
          lock_period_months: number
          max_price: number
          subcategory: string | null
          user_segments: string[]
        }
        Insert: {
          created_at?: string | null
          goal_type: string
          id?: string
          label: string
          lock_period_months?: number
          max_price?: number
          subcategory?: string | null
          user_segments?: string[]
        }
        Update: {
          created_at?: string | null
          goal_type?: string
          id?: string
          label?: string
          lock_period_months?: number
          max_price?: number
          subcategory?: string | null
          user_segments?: string[]
        }
        Relationships: []
      }
      goal_ideas: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          tags: string[]
          title: string
          typical_target_max: number | null
          typical_target_min: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[]
          title: string
          typical_target_max?: number | null
          typical_target_min?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[]
          title?: string
          typical_target_max?: number | null
          typical_target_min?: number | null
        }
        Relationships: []
      }
      influencer_applications: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          social_link: string
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          social_link: string
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          social_link?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at: string
          id: string
          id_document_url: string | null
          user_id: string
          verification_status: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at?: string
          id?: string
          id_document_url?: string | null
          user_id: string
          verification_status?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string
          bank_name?: string
          created_at?: string
          id?: string
          id_document_url?: string | null
          user_id?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_bank_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_challenge_enrollments: {
        Row: {
          approved_earnings: number
          challenge_id: string
          completed: boolean
          enrolled_at: string
          id: string
          pending_earnings: number
          user_id: string
        }
        Insert: {
          approved_earnings?: number
          challenge_id: string
          completed?: boolean
          enrolled_at?: string
          id?: string
          pending_earnings?: number
          user_id: string
        }
        Update: {
          approved_earnings?: number
          challenge_id?: string
          completed?: boolean
          enrolled_at?: string
          id?: string
          pending_earnings?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_challenge_enrollments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "influencer_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_challenge_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_challenge_submissions: {
        Row: {
          admin_notes: string | null
          challenge_id: string
          id: string
          reviewed_at: string | null
          status: string
          submitted_at: string
          user_id: string
          video_number: number
          video_url: string
        }
        Insert: {
          admin_notes?: string | null
          challenge_id: string
          id?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          user_id: string
          video_number?: number
          video_url: string
        }
        Update: {
          admin_notes?: string | null
          challenge_id?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
          video_number?: number
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "influencer_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_challenge_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_challenges: {
        Row: {
          audience: string
          challenge_type: string
          created_at: string
          description: string
          hashtag: string
          id: string
          instructions: string
          is_active: boolean
          min_views: number
          posting_interval_days: number
          program: string
          proof_type: string
          reward_per_video: number
          title: string
          total_videos: number
        }
        Insert: {
          audience?: string
          challenge_type?: string
          created_at?: string
          description?: string
          hashtag?: string
          id?: string
          instructions?: string
          is_active?: boolean
          min_views?: number
          posting_interval_days?: number
          program?: string
          proof_type?: string
          reward_per_video?: number
          title: string
          total_videos?: number
        }
        Update: {
          audience?: string
          challenge_type?: string
          created_at?: string
          description?: string
          hashtag?: string
          id?: string
          instructions?: string
          is_active?: boolean
          min_views?: number
          posting_interval_days?: number
          program?: string
          proof_type?: string
          reward_per_video?: number
          title?: string
          total_videos?: number
        }
        Relationships: []
      }
      influencer_referrals: {
        Row: {
          created_at: string
          id: string
          influencer_id: string
          referred_user_id: string
          reward_amount: number
          status: string
          validated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          influencer_id: string
          referred_user_id: string
          reward_amount?: number
          status?: string
          validated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          influencer_id?: string
          referred_user_id?: string
          reward_amount?: number
          status?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_referrals_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_survey_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_survey_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "influencer_survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_survey_questions: {
        Row: {
          created_at: string
          id: string
          order_index: number
          question_text: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          question_text: string
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          question_text?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "influencer_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_survey_responses: {
        Row: {
          completion_expires_at: string | null
          created_at: string
          id: string
          quiz_completed_at: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_amount: number
          screenshot_url: string | null
          status: string
          survey_id: string
          user_id: string
        }
        Insert: {
          completion_expires_at?: string | null
          created_at?: string
          id?: string
          quiz_completed_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount?: number
          screenshot_url?: string | null
          status?: string
          survey_id: string
          user_id: string
        }
        Update: {
          completion_expires_at?: string | null
          created_at?: string
          id?: string
          quiz_completed_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount?: number
          screenshot_url?: string | null
          status?: string
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_survey_responses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "influencer_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_surveys: {
        Row: {
          audience: string
          completion_instructions: string | null
          completion_link: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          reward_amount: number
          title: string
          updated_at: string
          upload_type: string
        }
        Insert: {
          audience?: string
          completion_instructions?: string | null
          completion_link?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          reward_amount?: number
          title: string
          updated_at?: string
          upload_type?: string
        }
        Update: {
          audience?: string
          completion_instructions?: string | null
          completion_link?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          reward_amount?: number
          title?: string
          updated_at?: string
          upload_type?: string
        }
        Relationships: []
      }
      influencer_wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          source: string
          source_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          source: string
          source_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          source?: string
          source_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_withdrawals: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_withdrawals_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "influencer_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_contest_winners: {
        Row: {
          awarded_at: string
          contact_phone: string | null
          contact_submitted_at: string | null
          contest_id: string
          id: string
          paid: boolean
          prize_amount: number
          rank: number
          user_id: string
          valid_referrals: number
        }
        Insert: {
          awarded_at?: string
          contact_phone?: string | null
          contact_submitted_at?: string | null
          contest_id: string
          id?: string
          paid?: boolean
          prize_amount: number
          rank: number
          user_id: string
          valid_referrals: number
        }
        Update: {
          awarded_at?: string
          contact_phone?: string | null
          contact_submitted_at?: string | null
          contest_id?: string
          id?: string
          paid?: boolean
          prize_amount?: number
          rank?: number
          user_id?: string
          valid_referrals?: number
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_contest_winners_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_contests"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_contests: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          period_days: number
          prize_amount: number
          prize_currency: string
          prize_description: string | null
          program: string
          requires_contact: boolean
          rules: string | null
          starts_at: string
          target_referrals: number
          title: string
          updated_at: string
          winner_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          period_days?: number
          prize_amount?: number
          prize_currency?: string
          prize_description?: string | null
          program?: string
          requires_contact?: boolean
          rules?: string | null
          starts_at?: string
          target_referrals?: number
          title: string
          updated_at?: string
          winner_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          period_days?: number
          prize_amount?: number
          prize_currency?: string
          prize_description?: string | null
          program?: string
          requires_contact?: boolean
          rules?: string | null
          starts_at?: string
          target_referrals?: number
          title?: string
          updated_at?: string
          winner_count?: number
        }
        Relationships: []
      }
      monthly_earners: {
        Row: {
          contact_phone: string | null
          created_at: string
          cycle_end: string
          cycle_index: number
          cycle_start: string
          id: string
          last_cycle_referrals: number
          status: string
          target_referrals: number
          terminated_at: string | null
          termination_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          cycle_end?: string
          cycle_index?: number
          cycle_start?: string
          id?: string
          last_cycle_referrals?: number
          status?: string
          target_referrals?: number
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          cycle_end?: string
          cycle_index?: number
          cycle_start?: string
          id?: string
          last_cycle_referrals?: number
          status?: string
          target_referrals?: number
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_access_tokens: {
        Row: {
          app_id: string
          created_at: string
          expires_at: string
          id: string
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_access_tokens_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_api_usage: {
        Row: {
          app_id: string | null
          created_at: string
          endpoint: string
          id: string
          ip: string | null
          status: number
          user_agent: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          ip?: string | null
          status: number
          user_agent?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          ip?: string | null
          status?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_api_usage_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_app_domains: {
        Row: {
          app_id: string
          created_at: string
          domain: string
          id: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          app_id: string
          created_at?: string
          domain: string
          id?: string
          verification_token: string
          verified_at?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string
          domain?: string
          id?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_app_domains_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_app_redirect_uris: {
        Row: {
          app_id: string
          created_at: string
          id: string
          uri: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          uri: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_app_redirect_uris_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_app_scopes: {
        Row: {
          app_id: string
          approved: boolean
          created_at: string
          id: string
          scope: Database["public"]["Enums"]["oauth_scope"]
        }
        Insert: {
          app_id: string
          approved?: boolean
          created_at?: string
          id?: string
          scope: Database["public"]["Enums"]["oauth_scope"]
        }
        Update: {
          app_id?: string
          approved?: boolean
          created_at?: string
          id?: string
          scope?: Database["public"]["Enums"]["oauth_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "oauth_app_scopes_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_apps: {
        Row: {
          client_id: string
          client_secret_hash: string
          company_name: string | null
          contact_email: string | null
          created_at: string
          description: string | null
          environment: Database["public"]["Enums"]["oauth_environment"]
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          public_key: string | null
          status: Database["public"]["Enums"]["oauth_app_status"]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          client_id: string
          client_secret_hash: string
          company_name?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          environment?: Database["public"]["Enums"]["oauth_environment"]
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          public_key?: string | null
          status?: Database["public"]["Enums"]["oauth_app_status"]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          client_id?: string
          client_secret_hash?: string
          company_name?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          environment?: Database["public"]["Enums"]["oauth_environment"]
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          public_key?: string | null
          status?: Database["public"]["Enums"]["oauth_app_status"]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      oauth_authorization_codes: {
        Row: {
          app_id: string
          code_challenge: string
          code_challenge_method: string
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string
          scopes: string[]
          used_at: string | null
          user_id: string
        }
        Insert: {
          app_id: string
          code_challenge: string
          code_challenge_method?: string
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          redirect_uri: string
          scopes?: string[]
          used_at?: string | null
          user_id: string
        }
        Update: {
          app_id?: string
          code_challenge?: string
          code_challenge_method?: string
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string
          scopes?: string[]
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_authorization_codes_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_points_ledger: {
        Row: {
          amount: number
          app_id: string
          created_at: string
          id: string
          reference: string | null
          type: Database["public"]["Enums"]["oauth_ledger_type"]
          user_id: string
        }
        Insert: {
          amount: number
          app_id: string
          created_at?: string
          id?: string
          reference?: string | null
          type: Database["public"]["Enums"]["oauth_ledger_type"]
          user_id: string
        }
        Update: {
          amount?: number
          app_id?: string
          created_at?: string
          id?: string
          reference?: string | null
          type?: Database["public"]["Enums"]["oauth_ledger_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_points_ledger_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_refresh_tokens: {
        Row: {
          app_id: string
          created_at: string
          expires_at: string
          id: string
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_refresh_tokens_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_user_consents: {
        Row: {
          app_id: string
          granted_at: string
          id: string
          revoked_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          app_id: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          scopes?: string[]
          user_id: string
        }
        Update: {
          app_id?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          scopes?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_user_consents_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_webhook_events: {
        Row: {
          app_id: string
          attempts: number
          created_at: string
          delivered_at: string | null
          event_type: string
          id: string
          last_error: string | null
          payload: Json
          signature: string | null
        }
        Insert: {
          app_id: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          payload: Json
          signature?: string | null
        }
        Update: {
          app_id?: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json
          signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_webhook_events_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "oauth_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_daily_proofs: {
        Row: {
          admin_note: string | null
          created_at: string
          day_index: number
          enrollment_id: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          day_index: number
          enrollment_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url: string
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          day_index?: number
          enrollment_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_daily_proofs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "offer_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_enrollments: {
        Row: {
          campaign_id: string
          completed_at: string | null
          created_at: string
          eligibility_id: string | null
          expected_days: number
          id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          eligibility_id?: string | null
          expected_days?: number
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          eligibility_id?: string | null
          expected_days?: number
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_enrollments_eligibility_id_fkey"
            columns: ["eligibility_id"]
            isOneToOne: false
            referencedRelation: "campaign_eligibility"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_question_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      onboarding_questions: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          id: string
          options: Json
          prompt: string
          question_type: string
          required: boolean
          sort_order: number
          tag_key: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          options?: Json
          prompt: string
          question_type?: string
          required?: boolean
          sort_order?: number
          tag_key: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          options?: Json
          prompt?: string
          question_type?: string
          required?: boolean
          sort_order?: number
          tag_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "onboarding_question_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          annual_data_spend: number | null
          annual_electricity_spend: number | null
          annual_food_spend: number | null
          annual_transport_spend: number | null
          ban_reason: string | null
          business_category: string | null
          created_at: string | null
          credit_line: number | null
          credit_line_verified: boolean
          email: string
          financing_claimed_at: string | null
          id: string
          is_banned: boolean
          last_active: string | null
          monthly_business_spend: number | null
          off_queue_at: string | null
          onboarding_bonus_awarded: boolean
          onboarding_path: string | null
          onboarding_version: number
          points_balance: number
          preferred_currency: string | null
          queue_position: number | null
          referral_code: string | null
          referred_by: string | null
          selected_goal: string | null
          signup_bonus_awarded: boolean
          spend_verified: boolean | null
          target_amount: number | null
          total_annual_spend: number | null
          user_type: string | null
          weekly_business_spend: number | null
        }
        Insert: {
          account_type?: string
          annual_data_spend?: number | null
          annual_electricity_spend?: number | null
          annual_food_spend?: number | null
          annual_transport_spend?: number | null
          ban_reason?: string | null
          business_category?: string | null
          created_at?: string | null
          credit_line?: number | null
          credit_line_verified?: boolean
          email: string
          financing_claimed_at?: string | null
          id: string
          is_banned?: boolean
          last_active?: string | null
          monthly_business_spend?: number | null
          off_queue_at?: string | null
          onboarding_bonus_awarded?: boolean
          onboarding_path?: string | null
          onboarding_version?: number
          points_balance?: number
          preferred_currency?: string | null
          queue_position?: number | null
          referral_code?: string | null
          referred_by?: string | null
          selected_goal?: string | null
          signup_bonus_awarded?: boolean
          spend_verified?: boolean | null
          target_amount?: number | null
          total_annual_spend?: number | null
          user_type?: string | null
          weekly_business_spend?: number | null
        }
        Update: {
          account_type?: string
          annual_data_spend?: number | null
          annual_electricity_spend?: number | null
          annual_food_spend?: number | null
          annual_transport_spend?: number | null
          ban_reason?: string | null
          business_category?: string | null
          created_at?: string | null
          credit_line?: number | null
          credit_line_verified?: boolean
          email?: string
          financing_claimed_at?: string | null
          id?: string
          is_banned?: boolean
          last_active?: string | null
          monthly_business_spend?: number | null
          off_queue_at?: string | null
          onboarding_bonus_awarded?: boolean
          onboarding_path?: string | null
          onboarding_version?: number
          points_balance?: number
          preferred_currency?: string | null
          queue_position?: number | null
          referral_code?: string | null
          referred_by?: string | null
          selected_goal?: string | null
          signup_bonus_awarded?: boolean
          spend_verified?: boolean | null
          target_amount?: number | null
          total_annual_spend?: number | null
          user_type?: string | null
          weekly_business_spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_responses: {
        Row: {
          completed_at: string
          current_bank: string | null
          id: string
          points_awarded: number
          questionnaire_id: string
          switch_completed: boolean
          switch_reason: string | null
          switch_reason_freetext: string | null
          switch_timer_start: string | null
          user_id: string
          would_switch: boolean
        }
        Insert: {
          completed_at?: string
          current_bank?: string | null
          id?: string
          points_awarded?: number
          questionnaire_id: string
          switch_completed?: boolean
          switch_reason?: string | null
          switch_reason_freetext?: string | null
          switch_timer_start?: string | null
          user_id: string
          would_switch?: boolean
        }
        Update: {
          completed_at?: string
          current_bank?: string | null
          id?: string
          points_awarded?: number
          questionnaire_id?: string
          switch_completed?: boolean
          switch_reason?: string | null
          switch_reason_freetext?: string | null
          switch_timer_start?: string | null
          user_id?: string
          would_switch?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          category: string
          created_at: string
          current_bank_question: string
          id: string
          is_active: boolean
          points_reward: number
          preferred_bank: string
          switch_enabled: boolean
          switch_link: string
          switch_question_template: string
          switch_timer_days: number
          title: string
          updated_at: string
          why_switch_options: Json
        }
        Insert: {
          category?: string
          created_at?: string
          current_bank_question?: string
          id?: string
          is_active?: boolean
          points_reward?: number
          preferred_bank?: string
          switch_enabled?: boolean
          switch_link?: string
          switch_question_template?: string
          switch_timer_days?: number
          title: string
          updated_at?: string
          why_switch_options?: Json
        }
        Update: {
          category?: string
          created_at?: string
          current_bank_question?: string
          id?: string
          is_active?: boolean
          points_reward?: number
          preferred_bank?: string
          switch_enabled?: boolean
          switch_link?: string
          switch_question_template?: string
          switch_timer_days?: number
          title?: string
          updated_at?: string
          why_switch_options?: Json
        }
        Relationships: []
      }
      referral_points_backfill_20260307: {
        Row: {
          approved_points_due: number | null
          user_id: string | null
        }
        Insert: {
          approved_points_due?: number | null
          user_id?: string | null
        }
        Update: {
          approved_points_due?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_user_id: string
          referrer_id: string
          status: string
          validated_at: string | null
          validation_source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_user_id: string
          referrer_id: string
          status?: string
          validated_at?: string | null
          validation_source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_user_id?: string
          referrer_id?: string
          status?: string
          validated_at?: string | null
          validation_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_devices: {
        Row: {
          created_at: string
          device_fingerprint: string
          id: string
          ip_address: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          id?: string
          ip_address: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          id?: string
          ip_address?: string
          user_id?: string
        }
        Relationships: []
      }
      spend_verifications: {
        Row: {
          created_at: string
          ends_at: string
          frequency: string
          id: string
          recalculated_amount: number | null
          spend_type: string
          started_at: string
          status: string
          user_id: string
          verification_description: string | null
          verification_link: string | null
        }
        Insert: {
          created_at?: string
          ends_at?: string
          frequency?: string
          id?: string
          recalculated_amount?: number | null
          spend_type?: string
          started_at?: string
          status?: string
          user_id: string
          verification_description?: string | null
          verification_link?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string
          frequency?: string
          id?: string
          recalculated_amount?: number | null
          spend_type?: string
          started_at?: string
          status?: string
          user_id?: string
          verification_description?: string | null
          verification_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          id: string
          order_index: number
          question_text: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          question_text: string
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          question_text?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          completion_expires_at: string | null
          created_at: string
          id: string
          points_awarded: number
          quiz_completed_at: string | null
          reviewed_at: string | null
          screenshot_url: string | null
          status: string
          survey_id: string
          user_id: string
        }
        Insert: {
          completion_expires_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number
          quiz_completed_at?: string | null
          reviewed_at?: string | null
          screenshot_url?: string | null
          status?: string
          survey_id: string
          user_id: string
        }
        Update: {
          completion_expires_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number
          quiz_completed_at?: string | null
          reviewed_at?: string | null
          screenshot_url?: string | null
          status?: string
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          audience: string
          completion_instructions: string | null
          completion_link: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          points_reward: number
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          completion_instructions?: string | null
          completion_link?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          points_reward?: number
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          completion_instructions?: string | null
          completion_link?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          points_reward?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_behavior_profile: {
        Row: {
          age_group: string | null
          brands_used: string[]
          city: string | null
          country: string | null
          financial: Json
          occupation: string | null
          raw: Json
          segments: string[]
          spending_habits: string[]
          state: string | null
          task_capabilities: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          age_group?: string | null
          brands_used?: string[]
          city?: string | null
          country?: string | null
          financial?: Json
          occupation?: string | null
          raw?: Json
          segments?: string[]
          spending_habits?: string[]
          state?: string | null
          task_capabilities?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          age_group?: string | null
          brands_used?: string[]
          city?: string | null
          country?: string | null
          financial?: Json
          occupation?: string | null
          raw?: Json
          segments?: string[]
          spending_habits?: string[]
          state?: string | null
          task_capabilities?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_brand_switch_intent: {
        Row: {
          brand_category: string | null
          brand_name: string
          captured_at: string
          user_id: string
          willing_to_switch: boolean
        }
        Insert: {
          brand_category?: string | null
          brand_name: string
          captured_at?: string
          user_id: string
          willing_to_switch: boolean
        }
        Update: {
          brand_category?: string | null
          brand_name?: string
          captured_at?: string
          user_id?: string
          willing_to_switch?: boolean
        }
        Relationships: []
      }
      user_custom_brands: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          promoted: boolean
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          promoted?: boolean
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          promoted?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          category: string | null
          created_at: string
          id: string
          plan: Json
          status: string
          target_amount: number
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          plan?: Json
          status?: string
          target_amount?: number
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          plan?: Json
          status?: string
          target_amount?: number
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding_answers: {
        Row: {
          answer: Json
          created_at: string
          id: string
          question_id: string | null
          tag_key: string
          user_id: string
        }
        Insert: {
          answer: Json
          created_at?: string
          id?: string
          question_id?: string | null
          tag_key: string
          user_id: string
        }
        Update: {
          answer?: Json
          created_at?: string
          id?: string
          question_id?: string | null
          tag_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "onboarding_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_task_enrollments: {
        Row: {
          approved_days: number
          completed_at: string | null
          created_at: string
          id: string
          reward_credited: boolean
          started_at: string
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_days?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          reward_credited?: boolean
          started_at?: string
          status?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_days?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          reward_credited?: boolean
          started_at?: string
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_task_enrollments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_task_submissions: {
        Row: {
          created_at: string
          day_index: number
          enrollment_id: string
          evidence: Json
          id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_index?: number
          enrollment_id: string
          evidence?: Json
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          enrollment_id?: string
          evidence?: Json
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_task_submissions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "user_task_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration_days: number
          evidence_config: Json
          id: string
          instructions: string | null
          is_active: boolean
          max_participants: number | null
          mode: string
          reward_points: number
          switch_from_brand: string | null
          switch_to_brand: string | null
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          evidence_config?: Json
          id?: string
          instructions?: string | null
          is_active?: boolean
          max_participants?: number | null
          mode?: string
          reward_points?: number
          switch_from_brand?: string | null
          switch_to_brand?: string | null
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          evidence_config?: Json
          id?: string
          instructions?: string | null
          is_active?: boolean
          max_participants?: number | null
          mode?: string
          reward_points?: number
          switch_from_brand?: string | null
          switch_to_brand?: string | null
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          created_at: string
          id: string
          issued_by: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issued_by: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issued_by?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_transactions: {
        Row: {
          duplicate_note: string | null
          edit_count: number
          id: string
          is_duplicate: boolean
          is_verified: boolean
          submitted_at: string
          transaction_id: string
          user_id: string
          verification_id: string
          verified_amount: number | null
        }
        Insert: {
          duplicate_note?: string | null
          edit_count?: number
          id?: string
          is_duplicate?: boolean
          is_verified?: boolean
          submitted_at?: string
          transaction_id: string
          user_id: string
          verification_id: string
          verified_amount?: number | null
        }
        Update: {
          duplicate_note?: string | null
          edit_count?: number
          id?: string
          is_duplicate?: boolean
          is_verified?: boolean
          submitted_at?: string
          transaction_id?: string
          user_id?: string
          verification_id?: string
          verified_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_transactions_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "spend_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          amount_naira: number
          created_at: string
          id: string
          points_used: number
          status: string
          user_id: string
          voucher_code: string
        }
        Insert: {
          amount_naira: number
          created_at?: string
          id?: string
          points_used: number
          status?: string
          user_id: string
          voucher_code: string
        }
        Update: {
          amount_naira?: number
          created_at?: string
          id?: string
          points_used?: number
          status?: string
          user_id?: string
          voucher_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_activity: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          positions_moved: number | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          positions_moved?: number | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          positions_moved?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_goal_account: { Args: { _user_id: string }; Returns: string }
      apply_goal_unlock: {
        Args: {
          p_amount: number
          p_goal_id: string
          p_note: string
          p_source: string
          p_source_id: string
        }
        Returns: number
      }
      award_onboarding_bonus: { Args: never; Returns: Json }
      count_valid_referrals_last_30d: {
        Args: { _user_id: string }
        Returns: number
      }
      ensure_dummy_data_tables: { Args: never; Returns: boolean }
      evaluate_leaderboard_contests: {
        Args: { _user_id: string }
        Returns: undefined
      }
      evaluate_monthly_earner_cycles: { Args: never; Returns: number }
      generate_referral_code: { Args: never; Returns: string }
      generate_voucher_code: { Args: never; Returns: string }
      get_next_queue_position: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      influencer_completed_general_task_last_30d: {
        Args: { _user_id: string }
        Returns: boolean
      }
      join_monthly_earner_program: { Args: never; Returns: Json }
      mark_referral_valid: {
        Args: { _referred_user_id: string; _source: string }
        Returns: undefined
      }
      monthly_earner_cycle_referrals: {
        Args: { _user_id: string }
        Returns: number
      }
      oauth_get_matured_points: { Args: { _user_id: string }; Returns: number }
      open_goal_account: {
        Args: {
          p_option_id: string
          p_target_amount: number
          p_target_date: string
          p_title: string
        }
        Returns: string
      }
      request_influencer_withdrawal: {
        Args: { p_amount: number; p_bank_account_id: string }
        Returns: Json
      }
      withdraw_goal_account: { Args: { p_goal_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      oauth_app_status: "pending" | "approved" | "suspended" | "revoked"
      oauth_environment: "sandbox" | "production"
      oauth_ledger_type: "spend" | "reversal"
      oauth_scope:
        | "profile.read"
        | "email.read"
        | "username.read"
        | "points.read"
        | "points.balance.read"
        | "points.matured.read"
        | "savings.read"
        | "goals.read"
        | "transactions.read"
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
      app_role: ["admin", "moderator", "user"],
      oauth_app_status: ["pending", "approved", "suspended", "revoked"],
      oauth_environment: ["sandbox", "production"],
      oauth_ledger_type: ["spend", "reversal"],
      oauth_scope: [
        "profile.read",
        "email.read",
        "username.read",
        "points.read",
        "points.balance.read",
        "points.matured.read",
        "savings.read",
        "goals.read",
        "transactions.read",
      ],
    },
  },
} as const
