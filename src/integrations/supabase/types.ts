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
      couple_diaries: {
        Row: {
          author_id: string
          content: string
          created_at: string
          diary_date: string
          id: string
          is_shared: boolean
          mood: string | null
          photos: string[] | null
          relationship_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          diary_date?: string
          id?: string
          is_shared?: boolean
          mood?: string | null
          photos?: string[] | null
          relationship_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          diary_date?: string
          id?: string
          is_shared?: boolean
          mood?: string | null
          photos?: string[] | null
          relationship_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_diaries_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          photo_date: string
          photo_url: string
          relationship_id: string
          updated_at: string
          uploader_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_date?: string
          photo_url: string
          relationship_id: string
          updated_at?: string
          uploader_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_date?: string
          photo_url?: string
          relationship_id?: string
          updated_at?: string
          uploader_id?: string
        }
        Relationships: []
      }
      daily_ratings: {
        Row: {
          communication_score: number | null
          created_at: string
          empathy_score: number | null
          id: string
          listening_score: number | null
          notes: string | null
          overall_feeling: number | null
          rated_id: string
          rater_id: string
          rating_date: string
          relationship_id: string
        }
        Insert: {
          communication_score?: number | null
          created_at?: string
          empathy_score?: number | null
          id?: string
          listening_score?: number | null
          notes?: string | null
          overall_feeling?: number | null
          rated_id: string
          rater_id: string
          rating_date: string
          relationship_id: string
        }
        Update: {
          communication_score?: number | null
          created_at?: string
          empathy_score?: number | null
          id?: string
          listening_score?: number | null
          notes?: string | null
          overall_feeling?: number | null
          rated_id?: string
          rater_id?: string
          rating_date?: string
          relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_ratings_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      date_plan_activities: {
        Row: {
          activity_end_time: string | null
          activity_keywords: string[] | null
          activity_notes: string | null
          activity_photos: string[] | null
          activity_rating: number | null
          activity_report_image_url: string | null
          activity_time: string | null
          agent_notes: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          estimated_duration: number | null
          expenses: Json | null
          id: string
          is_ai_recommended: boolean | null
          is_auto_scheduled: boolean | null
          is_gift: boolean | null
          latitude: number | null
          location_address: string | null
          location_name: string
          location_type: string | null
          longitude: number | null
          order_index: number
          paid_by: string | null
          plan_id: string
          priority: string | null
          recommended_dishes: string | null
          report_generated_at: string | null
          skip_reason: string | null
          temperature: string | null
          travel_time_from_previous: number | null
          weather_condition: string | null
          wishlist_item_id: string | null
        }
        Insert: {
          activity_end_time?: string | null
          activity_keywords?: string[] | null
          activity_notes?: string | null
          activity_photos?: string[] | null
          activity_rating?: number | null
          activity_report_image_url?: string | null
          activity_time?: string | null
          agent_notes?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          estimated_duration?: number | null
          expenses?: Json | null
          id?: string
          is_ai_recommended?: boolean | null
          is_auto_scheduled?: boolean | null
          is_gift?: boolean | null
          latitude?: number | null
          location_address?: string | null
          location_name: string
          location_type?: string | null
          longitude?: number | null
          order_index?: number
          paid_by?: string | null
          plan_id: string
          priority?: string | null
          recommended_dishes?: string | null
          report_generated_at?: string | null
          skip_reason?: string | null
          temperature?: string | null
          travel_time_from_previous?: number | null
          weather_condition?: string | null
          wishlist_item_id?: string | null
        }
        Update: {
          activity_end_time?: string | null
          activity_keywords?: string[] | null
          activity_notes?: string | null
          activity_photos?: string[] | null
          activity_rating?: number | null
          activity_report_image_url?: string | null
          activity_time?: string | null
          agent_notes?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          estimated_duration?: number | null
          expenses?: Json | null
          id?: string
          is_ai_recommended?: boolean | null
          is_auto_scheduled?: boolean | null
          is_gift?: boolean | null
          latitude?: number | null
          location_address?: string | null
          location_name?: string
          location_type?: string | null
          longitude?: number | null
          order_index?: number
          paid_by?: string | null
          plan_id?: string
          priority?: string | null
          recommended_dishes?: string | null
          report_generated_at?: string | null
          skip_reason?: string | null
          temperature?: string | null
          travel_time_from_previous?: number | null
          weather_condition?: string | null
          wishlist_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "date_plan_activities_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "date_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "date_plan_activities_wishlist_item_id_fkey"
            columns: ["wishlist_item_id"]
            isOneToOne: false
            referencedRelation: "date_wishlist"
            referencedColumns: ["id"]
          },
        ]
      }
      date_plans: {
        Row: {
          created_at: string
          end_location_address: string | null
          end_location_lat: number | null
          end_location_lng: number | null
          id: string
          is_auto_routed: boolean | null
          is_completed: boolean
          notes: string | null
          plan_date: string
          relationship_id: string
          start_location_address: string | null
          start_location_lat: number | null
          start_location_lng: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_location_address?: string | null
          end_location_lat?: number | null
          end_location_lng?: number | null
          id?: string
          is_auto_routed?: boolean | null
          is_completed?: boolean
          notes?: string | null
          plan_date: string
          relationship_id: string
          start_location_address?: string | null
          start_location_lat?: number | null
          start_location_lng?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_location_address?: string | null
          end_location_lat?: number | null
          end_location_lng?: number | null
          id?: string
          is_auto_routed?: boolean | null
          is_completed?: boolean
          notes?: string | null
          plan_date?: string
          relationship_id?: string
          start_location_address?: string | null
          start_location_lat?: number | null
          start_location_lng?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      date_reports: {
        Row: {
          created_at: string
          generated_at: string | null
          id: string
          notes: string | null
          photos: string[] | null
          plan_id: string
          relationship_id: string
          report_image_url: string | null
        }
        Insert: {
          created_at?: string
          generated_at?: string | null
          id?: string
          notes?: string | null
          photos?: string[] | null
          plan_id: string
          relationship_id: string
          report_image_url?: string | null
        }
        Update: {
          created_at?: string
          generated_at?: string | null
          id?: string
          notes?: string | null
          photos?: string[] | null
          plan_id?: string
          relationship_id?: string
          report_image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "date_reports_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "date_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      date_suggestions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_completed: boolean | null
          location_name: string
          location_type: string | null
          reason: string | null
          relationship_id: string
          suggestion_date: string
          temperature: string | null
          weather_condition: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          location_name: string
          location_type?: string | null
          reason?: string | null
          relationship_id: string
          suggestion_date: string
          temperature?: string | null
          weather_condition?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          location_name?: string
          location_type?: string | null
          reason?: string | null
          relationship_id?: string
          suggestion_date?: string
          temperature?: string | null
          weather_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "date_suggestions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      date_wishlist: {
        Row: {
          added_by: string
          added_date: string | null
          close_time: string | null
          created_at: string | null
          description: string | null
          estimated_duration: number | null
          id: string
          is_archived: boolean | null
          last_visited_date: string | null
          latitude: number | null
          location_address: string | null
          location_name: string
          location_type: string | null
          longitude: number | null
          notes: string | null
          open_time: string | null
          priority: string | null
          relationship_id: string
          tags: string[] | null
          updated_at: string | null
          visit_count: number | null
        }
        Insert: {
          added_by: string
          added_date?: string | null
          close_time?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          is_archived?: boolean | null
          last_visited_date?: string | null
          latitude?: number | null
          location_address?: string | null
          location_name: string
          location_type?: string | null
          longitude?: number | null
          notes?: string | null
          open_time?: string | null
          priority?: string | null
          relationship_id: string
          tags?: string[] | null
          updated_at?: string | null
          visit_count?: number | null
        }
        Update: {
          added_by?: string
          added_date?: string | null
          close_time?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          is_archived?: boolean | null
          last_visited_date?: string | null
          latitude?: number | null
          location_address?: string | null
          location_name?: string
          location_type?: string | null
          longitude?: number | null
          notes?: string | null
          open_time?: string | null
          priority?: string | null
          relationship_id?: string
          tags?: string[] | null
          updated_at?: string | null
          visit_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "date_wishlist_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          notification_type: string
          relationship_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          notification_type: string
          relationship_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          notification_type?: string
          relationship_id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitation_code: string
          inviter_id: string
          love_message: string | null
          met_date: string | null
          recipient_name: string | null
          relationship_id: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_code: string
          inviter_id: string
          love_message?: string | null
          met_date?: string | null
          recipient_name?: string | null
          relationship_id: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_code?: string
          inviter_id?: string
          love_message?: string | null
          met_date?: string | null
          recipient_name?: string | null
          relationship_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invitations_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_approvals: {
        Row: {
          action_data: Json | null
          action_type: string
          approver_id: string
          created_at: string
          id: string
          relationship_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          approver_id: string
          created_at?: string
          id?: string
          relationship_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          approver_id?: string
          created_at?: string
          id?: string
          relationship_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nickname: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nickname?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nickname?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          created_at: string
          id: string
          met_date: string
          partner_id: string | null
          partner_split_percentage: number | null
          relationship_status: string | null
          space_name: string | null
          together_date: string
          updated_at: string
          user_id: string
          user_split_percentage: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          met_date: string
          partner_id?: string | null
          partner_split_percentage?: number | null
          relationship_status?: string | null
          space_name?: string | null
          together_date: string
          updated_at?: string
          user_id: string
          user_split_percentage?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          met_date?: string
          partner_id?: string | null
          partner_split_percentage?: number | null
          relationship_status?: string | null
          space_name?: string | null
          together_date?: string
          updated_at?: string
          user_id?: string
          user_split_percentage?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_count: { Args: never; Returns: number }
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
