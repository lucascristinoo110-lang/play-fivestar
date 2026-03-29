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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          commission_earned: number | null
          created_at: string | null
          id: string
          referred_user_id: string
        }
        Insert: {
          affiliate_id: string
          commission_earned?: number | null
          created_at?: string | null
          id?: string
          referred_user_id: string
        }
        Update: {
          affiliate_id?: string
          commission_earned?: number | null
          created_at?: string | null
          id?: string
          referred_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          balance: number | null
          baseline: number | null
          commission_cpa: number | null
          commission_revshare: number | null
          commission_type: string
          created_at: string | null
          id: string
          status: string | null
          total_clicks: number | null
          total_deposits: number | null
          total_earnings: number | null
          total_signups: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          affiliate_code: string
          balance?: number | null
          baseline?: number | null
          commission_cpa?: number | null
          commission_revshare?: number | null
          commission_type?: string
          created_at?: string | null
          id?: string
          status?: string | null
          total_clicks?: number | null
          total_deposits?: number | null
          total_earnings?: number | null
          total_signups?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          affiliate_code?: string
          balance?: number | null
          baseline?: number | null
          commission_cpa?: number | null
          commission_revshare?: number | null
          commission_type?: string
          created_at?: string | null
          id?: string
          status?: string | null
          total_clicks?: number | null
          total_deposits?: number | null
          total_earnings?: number | null
          total_signups?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bets: {
        Row: {
          amount: number
          bet_type: string
          created_at: string | null
          id: string
          match_data: Json
          match_id: string
          odds: number
          potential_win: number
          settled_at: string | null
          status: string
          ticket_number: string
          user_id: string
        }
        Insert: {
          amount: number
          bet_type: string
          created_at?: string | null
          id?: string
          match_data?: Json
          match_id: string
          odds: number
          potential_win: number
          settled_at?: string | null
          status?: string
          ticket_number: string
          user_id: string
        }
        Update: {
          amount?: number
          bet_type?: string
          created_at?: string | null
          id?: string
          match_data?: Json
          match_id?: string
          odds?: number
          potential_win?: number
          settled_at?: string | null
          status?: string
          ticket_number?: string
          user_id?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          body_html: string
          created_at: string | null
          failed_count: number | null
          id: string
          recipient_filter: Json | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          subject: string
          total_recipients: number | null
        }
        Insert: {
          body_html: string
          created_at?: string | null
          failed_count?: number | null
          id?: string
          recipient_filter?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject: string
          total_recipients?: number | null
        }
        Update: {
          body_html?: string
          created_at?: string | null
          failed_count?: number | null
          id?: string
          recipient_filter?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject?: string
          total_recipients?: number | null
        }
        Relationships: []
      }
      email_log: {
        Row: {
          campaign_id: string | null
          error_message: string | null
          id: string
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          trigger_delay_hours: number | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          body_html: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          trigger_delay_hours?: number | null
          trigger_type?: string
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          trigger_delay_hours?: number | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          category: string
          created_at: string | null
          game_code: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_hot: boolean | null
          is_new: boolean | null
          name: string
          provider: string
          sort_order: number | null
          source: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          game_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_hot?: boolean | null
          is_new?: boolean | null
          name: string
          provider?: string
          sort_order?: number | null
          source?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          game_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_hot?: boolean | null
          is_new?: boolean | null
          name?: string
          provider?: string
          sort_order?: number | null
          source?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      home_sections: {
        Row: {
          created_at: string | null
          curated_game_codes: string[] | null
          filter_category: string | null
          filter_is_hot: boolean | null
          filter_is_new: boolean | null
          id: string
          is_active: boolean | null
          max_games: number | null
          section_type: string
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          curated_game_codes?: string[] | null
          filter_category?: string | null
          filter_is_hot?: boolean | null
          filter_is_new?: boolean | null
          id?: string
          is_active?: boolean | null
          max_games?: number | null
          section_type?: string
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          curated_game_codes?: string[] | null
          filter_category?: string | null
          filter_is_hot?: boolean | null
          filter_is_new?: boolean | null
          id?: string
          is_active?: boolean | null
          max_games?: number | null
          section_type?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string | null
          document_type: string
          file_url: string
          id: string
          rejection_reason: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_type: string
          file_url: string
          id?: string
          rejection_reason?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_type?: string
          file_url?: string
          id?: string
          rejection_reason?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number | null
          bonus_balance: number | null
          cpf: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          kyc_verified: boolean | null
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          bonus_balance?: number | null
          cpf?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          kyc_verified?: boolean | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          bonus_balance?: number | null
          cpf?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          kyc_verified?: boolean | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          placement: string
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          placement?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          placement?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          accent_color: string | null
          background_color: string | null
          bspay_api_url: string | null
          bspay_client_id: string | null
          bspay_client_secret: string | null
          created_at: string | null
          deposit_banner_url: string | null
          favicon_url: string | null
          id: string
          igamewin_api_key: string | null
          igamewin_api_url: string | null
          logo_url: string | null
          maintenance_mode: boolean | null
          max_deposit: number | null
          max_withdraw: number | null
          meta_api_key: string | null
          meta_pixel_id: string | null
          min_deposit: number | null
          min_withdraw: number | null
          playfiver_api_key: string | null
          playfiver_api_url: string | null
          primary_color: string | null
          promo_message: string | null
          promo_message_active: boolean | null
          require_kyc_for_withdraw: boolean | null
          resend_api_key: string | null
          resend_connected: boolean | null
          resend_from_email: string | null
          rollover_multiplier: number | null
          secondary_color: string | null
          site_name: string | null
          updated_at: string | null
          welcome_bonus_active: boolean | null
          welcome_bonus_max: number | null
          welcome_bonus_percent: number | null
          welcome_popup_active: boolean | null
          welcome_popup_body: string | null
          welcome_popup_button_text: string | null
          welcome_popup_timer_minutes: number | null
          welcome_popup_title: string | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          bspay_api_url?: string | null
          bspay_client_id?: string | null
          bspay_client_secret?: string | null
          created_at?: string | null
          deposit_banner_url?: string | null
          favicon_url?: string | null
          id?: string
          igamewin_api_key?: string | null
          igamewin_api_url?: string | null
          logo_url?: string | null
          maintenance_mode?: boolean | null
          max_deposit?: number | null
          max_withdraw?: number | null
          meta_api_key?: string | null
          meta_pixel_id?: string | null
          min_deposit?: number | null
          min_withdraw?: number | null
          playfiver_api_key?: string | null
          playfiver_api_url?: string | null
          primary_color?: string | null
          promo_message?: string | null
          promo_message_active?: boolean | null
          require_kyc_for_withdraw?: boolean | null
          resend_api_key?: string | null
          resend_connected?: boolean | null
          resend_from_email?: string | null
          rollover_multiplier?: number | null
          secondary_color?: string | null
          site_name?: string | null
          updated_at?: string | null
          welcome_bonus_active?: boolean | null
          welcome_bonus_max?: number | null
          welcome_bonus_percent?: number | null
          welcome_popup_active?: boolean | null
          welcome_popup_body?: string | null
          welcome_popup_button_text?: string | null
          welcome_popup_timer_minutes?: number | null
          welcome_popup_title?: string | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          bspay_api_url?: string | null
          bspay_client_id?: string | null
          bspay_client_secret?: string | null
          created_at?: string | null
          deposit_banner_url?: string | null
          favicon_url?: string | null
          id?: string
          igamewin_api_key?: string | null
          igamewin_api_url?: string | null
          logo_url?: string | null
          maintenance_mode?: boolean | null
          max_deposit?: number | null
          max_withdraw?: number | null
          meta_api_key?: string | null
          meta_pixel_id?: string | null
          min_deposit?: number | null
          min_withdraw?: number | null
          playfiver_api_key?: string | null
          playfiver_api_url?: string | null
          primary_color?: string | null
          promo_message?: string | null
          promo_message_active?: boolean | null
          require_kyc_for_withdraw?: boolean | null
          resend_api_key?: string | null
          resend_connected?: boolean | null
          resend_from_email?: string | null
          rollover_multiplier?: number | null
          secondary_color?: string | null
          site_name?: string | null
          updated_at?: string | null
          welcome_bonus_active?: boolean | null
          welcome_bonus_max?: number | null
          welcome_bonus_percent?: number | null
          welcome_popup_active?: boolean | null
          welcome_popup_body?: string | null
          welcome_popup_button_text?: string | null
          welcome_popup_timer_minutes?: number | null
          welcome_popup_title?: string | null
        }
        Relationships: []
      }
      sports_matches: {
        Row: {
          away_badge: string | null
          away_score: number | null
          away_team: string
          city: string | null
          created_at: string | null
          custom_odds_away: number | null
          custom_odds_draw: number | null
          custom_odds_home: number | null
          external_id: string | null
          featured_home: boolean
          featured_sports: boolean
          home_badge: string | null
          home_score: number | null
          home_team: string
          id: string
          kickoff: string
          league_api_id: string
          league_name: string
          status: string
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          away_badge?: string | null
          away_score?: number | null
          away_team: string
          city?: string | null
          created_at?: string | null
          custom_odds_away?: number | null
          custom_odds_draw?: number | null
          custom_odds_home?: number | null
          external_id?: string | null
          featured_home?: boolean
          featured_sports?: boolean
          home_badge?: string | null
          home_score?: number | null
          home_team: string
          id?: string
          kickoff: string
          league_api_id: string
          league_name: string
          status?: string
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          away_badge?: string | null
          away_score?: number | null
          away_team?: string
          city?: string | null
          created_at?: string | null
          custom_odds_away?: number | null
          custom_odds_draw?: number | null
          custom_odds_home?: number | null
          external_id?: string | null
          featured_home?: boolean
          featured_sports?: boolean
          home_badge?: string | null
          home_score?: number | null
          home_team?: string
          id?: string
          kickoff?: string
          league_api_id?: string
          league_name?: string
          status?: string
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      debit_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      has_admin_or_viewer: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "player" | "viewer"
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
      app_role: ["admin", "player", "viewer"],
    },
  },
} as const
