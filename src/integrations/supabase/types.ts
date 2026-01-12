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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_events: {
        Row: {
          ad_request_id: string | null
          campaign_id: string
          community: string | null
          created_at: string
          creative_id: string
          event_type: Database["public"]["Enums"]["ad_event_type"]
          id: string
          ip_hash: string | null
          placement_key: string
          post_id: string | null
          revenue_cents: number | null
          user_agent_hash: string | null
          user_id: string | null
        }
        Insert: {
          ad_request_id?: string | null
          campaign_id: string
          community?: string | null
          created_at?: string
          creative_id: string
          event_type: Database["public"]["Enums"]["ad_event_type"]
          id?: string
          ip_hash?: string | null
          placement_key: string
          post_id?: string | null
          revenue_cents?: number | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Update: {
          ad_request_id?: string | null
          campaign_id?: string
          community?: string | null
          created_at?: string
          creative_id?: string
          event_type?: Database["public"]["Enums"]["ad_event_type"]
          id?: string
          ip_hash?: string | null
          placement_key?: string
          post_id?: string | null
          revenue_cents?: number | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_request_id_fkey"
            columns: ["ad_request_id"]
            isOneToOne: false
            referencedRelation: "ad_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "ad_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      ad_reports: {
        Row: {
          campaign_id: string | null
          created_at: string
          creative_id: string | null
          details: string | null
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          creative_id?: string | null
          details?: string | null
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          creative_id?: string | null
          details?: string | null
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_reports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "ad_reports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_reports_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_requests: {
        Row: {
          campaign_id: string | null
          context: Json | null
          created_at: string
          creative_id: string | null
          id: string
          placement_key: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          context?: Json | null
          created_at?: string
          creative_id?: string | null
          id?: string
          placement_key: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          context?: Json | null
          created_at?: string
          creative_id?: string | null
          id?: string
          placement_key?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "ad_requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_requests_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_revenue_allocations: {
        Row: {
          ad_event_id: string
          amount_cents: number
          created_at: string
          creator_user_id: string
          id: string
          post_id: string | null
          status: Database["public"]["Enums"]["earnings_status"]
        }
        Insert: {
          ad_event_id: string
          amount_cents: number
          created_at?: string
          creator_user_id: string
          id?: string
          post_id?: string | null
          status?: Database["public"]["Enums"]["earnings_status"]
        }
        Update: {
          ad_event_id?: string
          amount_cents?: number
          created_at?: string
          creator_user_id?: string
          id?: string
          post_id?: string | null
          status?: Database["public"]["Enums"]["earnings_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ad_revenue_allocations_ad_event_id_fkey"
            columns: ["ad_event_id"]
            isOneToOne: false
            referencedRelation: "ad_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_revenue_allocations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisers: {
        Row: {
          billing_email: string
          company_name: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["ad_status"]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          billing_email: string
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["ad_status"]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          billing_email?: string
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["ad_status"]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      bookmark_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "bookmark_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          advertiser_id: string
          bid_type: Database["public"]["Enums"]["ad_bid_type"]
          bid_value_cents: number
          budget_cents: number
          created_at: string
          daily_cap_cents: number | null
          end_at: string | null
          id: string
          name: string
          objective: Database["public"]["Enums"]["ad_objective"]
          spent_cents: number
          start_at: string | null
          status: Database["public"]["Enums"]["ad_status"]
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          bid_type?: Database["public"]["Enums"]["ad_bid_type"]
          bid_value_cents?: number
          budget_cents?: number
          created_at?: string
          daily_cap_cents?: number | null
          end_at?: string | null
          id?: string
          name: string
          objective?: Database["public"]["Enums"]["ad_objective"]
          spent_cents?: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          bid_type?: Database["public"]["Enums"]["ad_bid_type"]
          bid_value_cents?: number
          budget_cents?: number
          created_at?: string
          daily_cap_cents?: number | null
          end_at?: string | null
          id?: string
          name?: string
          objective?: Database["public"]["Enums"]["ad_objective"]
          spent_cents?: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_votes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
          vote_type: number
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
          vote_type: number
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
          vote_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          boost_id: string | null
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_distinguished: boolean | null
          is_edited: boolean | null
          is_removed: boolean | null
          parent_id: string | null
          post_id: string
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          boost_id?: string | null
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_distinguished?: boolean | null
          is_edited?: boolean | null
          is_removed?: boolean | null
          parent_id?: string | null
          post_id: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          boost_id?: string | null
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_distinguished?: boolean | null
          is_edited?: boolean | null
          is_removed?: boolean | null
          parent_id?: string | null
          post_id?: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "post_boosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          allow_user_flair: boolean | null
          created_at: string
          created_by: string
          description: string | null
          display_name: string
          icon: string | null
          id: string
          member_count: number | null
          name: string
          require_post_flair: boolean | null
          updated_at: string
        }
        Insert: {
          allow_user_flair?: boolean | null
          created_at?: string
          created_by: string
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          member_count?: number | null
          name: string
          require_post_flair?: boolean | null
          updated_at?: string
        }
        Update: {
          allow_user_flair?: boolean | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          member_count?: number | null
          name?: string
          require_post_flair?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      community_flairs: {
        Row: {
          background_color: string | null
          color: string | null
          community_id: string
          created_at: string
          id: string
          is_mod_only: boolean | null
          name: string
        }
        Insert: {
          background_color?: string | null
          color?: string | null
          community_id: string
          created_at?: string
          id?: string
          is_mod_only?: boolean | null
          name: string
        }
        Update: {
          background_color?: string | null
          color?: string | null
          community_id?: string
          created_at?: string
          id?: string
          is_mod_only?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_flairs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_mod_log: {
        Row: {
          action: string
          community_id: string
          created_at: string
          details: Json | null
          id: string
          mod_id: string
          target_id: string | null
          target_type: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          community_id: string
          created_at?: string
          details?: Json | null
          id?: string
          mod_id: string
          target_id?: string | null
          target_type: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          community_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          mod_id?: string
          target_id?: string | null
          target_type?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_mod_log_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_roles: {
        Row: {
          community_id: string
          created_at: string
          expires_at: string | null
          id: string
          reason: string | null
          role: Database["public"]["Enums"]["community_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          role?: Database["public"]["Enums"]["community_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          role?: Database["public"]["Enums"]["community_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_roles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_rules: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          rule_number: number
          title: string
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          rule_number: number
          title: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          rule_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_rules_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_user_flairs: {
        Row: {
          community_id: string
          created_at: string
          flair_color: string | null
          flair_text: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          flair_color?: string | null
          flair_text?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          flair_color?: string | null
          flair_text?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_user_flairs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creatives: {
        Row: {
          advertiser_icon: string | null
          advertiser_name: string | null
          body: string | null
          call_to_action: string | null
          campaign_id: string
          click_url: string
          created_at: string
          display_url: string | null
          headline: string
          id: string
          image_url: string | null
          status: Database["public"]["Enums"]["ad_status"]
          type: Database["public"]["Enums"]["ad_creative_type"]
          updated_at: string
          video_url: string | null
        }
        Insert: {
          advertiser_icon?: string | null
          advertiser_name?: string | null
          body?: string | null
          call_to_action?: string | null
          campaign_id: string
          click_url: string
          created_at?: string
          display_url?: string | null
          headline: string
          id?: string
          image_url?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          type?: Database["public"]["Enums"]["ad_creative_type"]
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          advertiser_icon?: string | null
          advertiser_name?: string | null
          body?: string | null
          call_to_action?: string | null
          campaign_id?: string
          click_url?: string
          created_at?: string
          display_url?: string | null
          headline?: string
          id?: string
          image_url?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          type?: Database["public"]["Enums"]["ad_creative_type"]
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings: {
        Row: {
          clicks: number | null
          created_at: string
          estimated_cents: number | null
          finalized_cents: number | null
          id: string
          impressions: number | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["earnings_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          clicks?: number | null
          created_at?: string
          estimated_cents?: number | null
          finalized_cents?: number | null
          id?: string
          impressions?: number | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["earnings_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          clicks?: number | null
          created_at?: string
          estimated_cents?: number | null
          finalized_cents?: number | null
          id?: string
          impressions?: number | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["earnings_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_monetization: {
        Row: {
          created_at: string
          creator_share_percent: number | null
          eligibility_reason: string | null
          eligibility_status: Database["public"]["Enums"]["monetization_eligibility"]
          enabled: boolean
          min_payout_cents: number | null
          payout_details: Json | null
          payout_method: string | null
          pending_payout_cents: number | null
          total_earnings_cents: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_share_percent?: number | null
          eligibility_reason?: string | null
          eligibility_status?: Database["public"]["Enums"]["monetization_eligibility"]
          enabled?: boolean
          min_payout_cents?: number | null
          payout_details?: Json | null
          payout_method?: string | null
          pending_payout_cents?: number | null
          total_earnings_cents?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_share_percent?: number | null
          eligibility_reason?: string | null
          eligibility_status?: Database["public"]["Enums"]["monetization_eligibility"]
          enabled?: boolean
          min_payout_cents?: number | null
          payout_details?: Json | null
          payout_method?: string | null
          pending_payout_cents?: number | null
          total_earnings_cents?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      edit_history: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          edited_by: string
          id: string
          previous_content: string
          previous_title: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          edited_by: string
          id?: string
          previous_content: string
          previous_title?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          edited_by?: string
          id?: string
          previous_content?: string
          previous_title?: string | null
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          created_at: string
          email_comment: boolean
          email_new_follower: boolean
          email_post_upvote: boolean
          id: string
          inapp_comment: boolean
          inapp_new_follower: boolean
          inapp_post_upvote: boolean
          snooze_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_comment?: boolean
          email_new_follower?: boolean
          email_post_upvote?: boolean
          id?: string
          inapp_comment?: boolean
          inapp_new_follower?: boolean
          inapp_post_upvote?: boolean
          snooze_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_comment?: boolean
          email_new_follower?: boolean
          email_post_upvote?: boolean
          id?: string
          inapp_comment?: boolean
          inapp_new_follower?: boolean
          inapp_post_upvote?: boolean
          snooze_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          body_html: string
          created_at: string
          email_type: string
          id: string
          processed_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          body_html: string
          created_at?: string
          email_type: string
          id?: string
          processed_at?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          body_html?: string
          created_at?: string
          email_type?: string
          id?: string
          processed_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          post_id: string
          user_id: string
          video_duration_ms: number | null
          watch_time_ms: number | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          post_id: string
          user_id: string
          video_duration_ms?: number | null
          watch_time_ms?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          video_duration_ms?: number | null
          watch_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      karma_history: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          related_comment_id: string | null
          related_post_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          related_comment_id?: string | null
          related_post_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          related_comment_id?: string | null
          related_post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "karma_history_related_comment_id_fkey"
            columns: ["related_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "karma_history_related_post_id_fkey"
            columns: ["related_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          allowed: boolean
          content_text: string
          content_type: string
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          allowed: boolean
          content_text: string
          content_type: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          allowed?: boolean
          content_text?: string
          content_type?: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          related_comment_id: string | null
          related_post_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          related_comment_id?: string | null
          related_post_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          related_comment_id?: string | null
          related_post_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_comment_id_fkey"
            columns: ["related_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_post_id_fkey"
            columns: ["related_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          processed_at: string | null
          provider: string | null
          provider_ref: string | null
          requested_at: string
          status: Database["public"]["Enums"]["payout_status"]
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          provider?: string | null
          provider_ref?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status"]
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          provider?: string | null
          provider_ref?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status"]
          user_id?: string
        }
        Relationships: []
      }
      placements: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          insertion_frequency: number | null
          key: string
          name: string
          rules: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          insertion_frequency?: number | null
          key: string
          name: string
          rules?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          insertion_frequency?: number | null
          key?: string
          name?: string
          rules?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          position: number
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          position?: number
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          position?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple: boolean | null
          created_at: string
          ends_at: string | null
          id: string
          post_id: string
          question: string
        }
        Insert: {
          allow_multiple?: boolean | null
          created_at?: string
          ends_at?: string | null
          id?: string
          post_id: string
          question: string
        }
        Update: {
          allow_multiple?: boolean | null
          created_at?: string
          ends_at?: string | null
          id?: string
          post_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_boosts: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          from_user_id: string | null
          id: string
          is_public: boolean
          message: string | null
          post_id: string
          status: string
          stripe_checkout_session_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          from_user_id?: string | null
          id?: string
          is_public?: boolean
          message?: string | null
          post_id: string
          status?: string
          stripe_checkout_session_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          from_user_id?: string | null
          id?: string
          is_public?: boolean
          message?: string | null
          post_id?: string
          status?: string
          stripe_checkout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_boosts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_votes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          vote_type: number
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          vote_type: number
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          vote_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          community: string
          community_icon: string | null
          content: string | null
          created_at: string
          crosspost_of: string | null
          edited_at: string | null
          flair_id: string | null
          id: string
          image_url: string | null
          is_draft: boolean | null
          is_edited: boolean | null
          is_locked: boolean | null
          is_nsfw: boolean | null
          is_pinned: boolean | null
          is_removed: boolean | null
          live_url: string | null
          pin_position: number | null
          poster_image_url: string | null
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          scheduled_at: string | null
          title: string
          updated_at: string
          upvotes: number
          user_id: string
          video_duration_seconds: number | null
          video_mime_type: string | null
          video_processing_status: string | null
          video_size_bytes: number | null
          video_url: string | null
        }
        Insert: {
          community?: string
          community_icon?: string | null
          content?: string | null
          created_at?: string
          crosspost_of?: string | null
          edited_at?: string | null
          flair_id?: string | null
          id?: string
          image_url?: string | null
          is_draft?: boolean | null
          is_edited?: boolean | null
          is_locked?: boolean | null
          is_nsfw?: boolean | null
          is_pinned?: boolean | null
          is_removed?: boolean | null
          live_url?: string | null
          pin_position?: number | null
          poster_image_url?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          scheduled_at?: string | null
          title: string
          updated_at?: string
          upvotes?: number
          user_id: string
          video_duration_seconds?: number | null
          video_mime_type?: string | null
          video_processing_status?: string | null
          video_size_bytes?: number | null
          video_url?: string | null
        }
        Update: {
          community?: string
          community_icon?: string | null
          content?: string | null
          created_at?: string
          crosspost_of?: string | null
          edited_at?: string | null
          flair_id?: string | null
          id?: string
          image_url?: string | null
          is_draft?: boolean | null
          is_edited?: boolean | null
          is_locked?: boolean | null
          is_nsfw?: boolean | null
          is_pinned?: boolean | null
          is_removed?: boolean | null
          live_url?: string | null
          pin_position?: number | null
          poster_image_url?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          scheduled_at?: string | null
          title?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
          video_duration_seconds?: number | null
          video_mime_type?: string | null
          video_processing_status?: string | null
          video_size_bytes?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_crosspost_of_fkey"
            columns: ["crosspost_of"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_flair_id_fkey"
            columns: ["flair_id"]
            isOneToOne: false
            referencedRelation: "community_flairs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allow_nsfw: boolean | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean | null
          karma: number | null
          nsfw_confirmed_at: string | null
          updated_at: string
          user_id: string
          username: string | null
          verification_type: string | null
          verified_at: string | null
        }
        Insert: {
          allow_nsfw?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean | null
          karma?: number | null
          nsfw_confirmed_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          verification_type?: string | null
          verified_at?: string | null
        }
        Update: {
          allow_nsfw?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean | null
          karma?: number | null
          nsfw_confirmed_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          verification_type?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      push_notification_queue: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          processed_at: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          processed_at?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          processed_at?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          comment_id: string | null
          content_type: string
          created_at: string
          details: string | null
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          comment_id?: string | null
          content_type: string
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          comment_id?: string | null
          content_type?: string
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      targeting_rules: {
        Row: {
          campaign_id: string
          communities: string[] | null
          countries: string[] | null
          created_at: string
          device_types: string[] | null
          exclude_keywords: string[] | null
          id: string
          keywords: string[] | null
          languages: string[] | null
          min_account_age_days: number | null
          nsfw_allowed: boolean | null
          placement_keys: string[] | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          communities?: string[] | null
          countries?: string[] | null
          created_at?: string
          device_types?: string[] | null
          exclude_keywords?: string[] | null
          id?: string
          keywords?: string[] | null
          languages?: string[] | null
          min_account_age_days?: number | null
          nsfw_allowed?: boolean | null
          placement_keys?: string[] | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          communities?: string[] | null
          countries?: string[] | null
          created_at?: string
          device_types?: string[] | null
          exclude_keywords?: string[] | null
          id?: string
          keywords?: string[] | null
          languages?: string[] | null
          min_account_age_days?: number | null
          nsfw_allowed?: boolean | null
          placement_keys?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "targeting_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "targeting_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ad_preferences: {
        Row: {
          ad_topics_exclude: string[] | null
          ad_topics_interest: string[] | null
          created_at: string
          hidden_advertiser_ids: string[] | null
          hidden_campaign_ids: string[] | null
          personalized_ads_consent: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_topics_exclude?: string[] | null
          ad_topics_interest?: string[] | null
          created_at?: string
          hidden_advertiser_ids?: string[] | null
          hidden_campaign_ids?: string[] | null
          personalized_ads_consent?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_topics_exclude?: string[] | null
          ad_topics_interest?: string[] | null
          created_at?: string
          hidden_advertiser_ids?: string[] | null
          hidden_campaign_ids?: string[] | null
          personalized_ads_consent?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          is_permanent: boolean
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_permanent?: boolean
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_permanent?: boolean
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_feed_profiles: {
        Row: {
          avg_watch_time_ms: number | null
          completion_rate: number | null
          created_at: string
          id: string
          last_computed_at: string | null
          long_video_preference: number | null
          mid_video_preference: number | null
          short_video_preference: number | null
          top_communities: Json | null
          top_creators: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_watch_time_ms?: number | null
          completion_rate?: number | null
          created_at?: string
          id?: string
          last_computed_at?: string | null
          long_video_preference?: number | null
          mid_video_preference?: number | null
          short_video_preference?: number | null
          top_communities?: Json | null
          top_creators?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_watch_time_ms?: number | null
          completion_rate?: number | null
          created_at?: string
          id?: string
          last_computed_at?: string | null
          long_video_preference?: number | null
          mid_video_preference?: number | null
          short_video_preference?: number | null
          top_communities?: Json | null
          top_creators?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      campaign_performance: {
        Row: {
          advertiser_id: string | null
          advertiser_name: string | null
          bid_type: Database["public"]["Enums"]["ad_bid_type"] | null
          bid_value_cents: number | null
          budget_cents: number | null
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          ctr: number | null
          impressions: number | null
          spent_cents: number | null
          status: Database["public"]["Enums"]["ad_status"] | null
          total_revenue_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings_summary: {
        Row: {
          creator_share_percent: number | null
          display_name: string | null
          eligibility_status:
            | Database["public"]["Enums"]["monetization_eligibility"]
            | null
          enabled: boolean | null
          last_month_cents: number | null
          pending_payout_cents: number | null
          this_month_cents: number | null
          total_earnings_cents: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      post_boost_totals: {
        Row: {
          boost_count: number | null
          currency: string | null
          post_id: string | null
          total_amount_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_boosts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_verified: boolean | null
          karma: number | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          karma?: number | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          karma?: number | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_public_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          id: string
          is_verified: boolean
          karma: number
          user_id: string
          username: string
        }[]
      }
      has_community_role: {
        Args: {
          _community_id: string
          _role: Database["public"]["Enums"]["community_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_community_mod: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_notifications_snoozed: { Args: { _user_id: string }; Returns: boolean }
      is_post_owner: {
        Args: { _post_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
      sanitize_for_display: { Args: { text_input: string }; Returns: string }
      send_push_notification: {
        Args: {
          p_body: string
          p_data?: Json
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      ad_bid_type: "cpm" | "cpc"
      ad_creative_type: "image" | "video" | "text"
      ad_event_type: "impression" | "click" | "hide" | "skip" | "complete"
      ad_objective: "awareness" | "clicks" | "engagement"
      ad_status:
        | "draft"
        | "pending"
        | "active"
        | "paused"
        | "completed"
        | "rejected"
      app_role: "admin" | "moderator" | "user"
      community_role: "owner" | "moderator" | "member" | "banned" | "muted"
      earnings_status: "estimated" | "finalized" | "paid"
      monetization_eligibility:
        | "pending"
        | "eligible"
        | "ineligible"
        | "suspended"
      payout_status: "pending" | "processing" | "completed" | "failed"
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
      ad_bid_type: ["cpm", "cpc"],
      ad_creative_type: ["image", "video", "text"],
      ad_event_type: ["impression", "click", "hide", "skip", "complete"],
      ad_objective: ["awareness", "clicks", "engagement"],
      ad_status: [
        "draft",
        "pending",
        "active",
        "paused",
        "completed",
        "rejected",
      ],
      app_role: ["admin", "moderator", "user"],
      community_role: ["owner", "moderator", "member", "banned", "muted"],
      earnings_status: ["estimated", "finalized", "paid"],
      monetization_eligibility: [
        "pending",
        "eligible",
        "ineligible",
        "suspended",
      ],
      payout_status: ["pending", "processing", "completed", "failed"],
    },
  },
} as const
