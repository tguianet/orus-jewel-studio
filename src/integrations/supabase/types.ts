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
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          seller_store_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          seller_store_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          seller_store_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_seller_store_id_fkey"
            columns: ["seller_store_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          level: number
          order_id: string
          order_item_id: string | null
          rate: number
          reseller_id: string
          source_reseller_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          level: number
          order_id: string
          order_item_id?: string | null
          rate: number
          reseller_id: string
          source_reseller_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          level?: number
          order_id?: string
          order_item_id?: string | null
          rate?: number
          reseller_id?: string
          source_reseller_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_source_reseller_id_fkey"
            columns: ["source_reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      image_formats: {
        Row: {
          active: boolean
          created_at: string
          description: string
          height: number
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
          width: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          height?: number
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          width?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          height?: number
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          width?: number
        }
        Relationships: []
      }
      marketing_banners: {
        Row: {
          active: boolean
          created_at: string
          format_id: string | null
          id: string
          image_url: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          format_id?: string | null
          id?: string
          image_url: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          format_id?: string | null
          id?: string
          image_url?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_banners_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "image_formats"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          seller_store_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          seller_store_id?: string | null
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          seller_store_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_seller_store_id_fkey"
            columns: ["seller_store_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          discount: number
          id: string
          notes: string | null
          origin: Database["public"]["Enums"]["order_origin"]
          seller_store_id: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          discount?: number
          id?: string
          notes?: string | null
          origin?: Database["public"]["Enums"]["order_origin"]
          seller_store_id: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          discount?: number
          id?: string
          notes?: string | null
          origin?: Database["public"]["Enums"]["order_origin"]
          seller_store_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_seller_store_id_fkey"
            columns: ["seller_store_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          category_name: string | null
          code: string
          cost_price: number
          created_at: string
          description: string
          id: string
          image_url: string | null
          min_order: number
          name: string
          seller_store_id: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          suggested_price: number
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          code: string
          cost_price?: number
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          min_order?: number
          name: string
          seller_store_id?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          suggested_price?: number
          updated_at?: string
          wholesale_price?: number
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          code?: string
          cost_price?: number
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          min_order?: number
          name?: string
          seller_store_id?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          suggested_price?: number
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_store_id_fkey"
            columns: ["seller_store_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resellers: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          parent_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["seller_store_status"]
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          parent_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["seller_store_status"]
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          parent_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["seller_store_status"]
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resellers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_stores: {
        Row: {
          commission_rate: number
          contact_phone: string | null
          created_at: string
          id: string
          owner_user_id: string
          reseller_id: string | null
          status: Database["public"]["Enums"]["seller_store_status"]
          store_name: string
          store_slug: string
          theme: Json
          tier: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          contact_phone?: string | null
          created_at?: string
          id?: string
          owner_user_id: string
          reseller_id?: string | null
          status?: Database["public"]["Enums"]["seller_store_status"]
          store_name: string
          store_slug: string
          theme?: Json
          tier?: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          contact_phone?: string | null
          created_at?: string
          id?: string
          owner_user_id?: string
          reseller_id?: string | null
          status?: Database["public"]["Enums"]["seller_store_status"]
          store_name?: string
          store_slug?: string
          theme?: Json
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_stores_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_popups: {
        Row: {
          active: boolean
          created_at: string
          cta_label: string | null
          cta_url: string | null
          id: string
          image_url: string | null
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          message?: string
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_products: {
        Row: {
          active: boolean
          created_at: string
          id: string
          product_id: string
          resale_price: number
          seller_store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          product_id: string
          resale_price?: number
          seller_store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          product_id?: string
          resale_price?: number
          seller_store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_seller_store_id_fkey"
            columns: ["seller_store_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
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
      wallet_transactions: {
        Row: {
          amount: number
          commission_id: string | null
          created_at: string
          description: string
          id: string
          reseller_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          commission_id?: string | null
          created_at?: string
          description?: string
          id?: string
          reseller_id: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          commission_id?: string | null
          created_at?: string
          description?: string
          id?: string
          reseller_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      reseller_wallet_summary: {
        Row: {
          available: number | null
          paid: number | null
          pending: number | null
          reseller_id: string | null
          total_balance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_order: {
        Args: { _order_id: string; _user_id?: string }
        Returns: boolean
      }
      can_access_store: {
        Args: { _store_id: string; _user_id?: string }
        Returns: boolean
      }
      create_mlm_commissions_for_order: {
        Args: { _order_id: string }
        Returns: undefined
      }
      create_public_order: {
        Args: {
          p_seller_store_id: string
          p_customer_name: string
          p_customer_phone: string
          p_customer_address?: string | null
          p_notes?: string | null
          p_items?: Json
        }
        Returns: {
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          created_at: string
        }[]
      }
      current_reseller_id: { Args: { _user_id?: string }; Returns: string }
      current_store_id: { Args: { _user_id?: string }; Returns: string }
      get_store_reseller_id: { Args: { _store_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_approved_store: { Args: { _store_id: string }; Returns: boolean }
      is_reseller_in_my_network: {
        Args: { _reseller_id: string; _user_id?: string }
        Returns: boolean
      }
      lookup_reseller_sponsor: {
        Args: { _id: string }
        Returns: { id: string; display_name: string }[]
      }
      mark_order_paid: { Args: { _order_id: string }; Returns: undefined }
      owns_reseller: {
        Args: { _reseller_id: string; _user_id?: string }
        Returns: boolean
      }
      owns_store: {
        Args: { _store_id: string; _user_id?: string }
        Returns: boolean
      }
      reseller_can_access_store: {
        Args: { _store_id: string; _user_id?: string }
        Returns: boolean
      }
      set_my_reseller_parent: {
        Args: { _parent_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "sacoleira"
      order_origin: "loja_online" | "whatsapp" | "manual"
      order_status:
        | "new"
        | "confirmed"
        | "paid"
        | "separated"
        | "shipped"
        | "delivered"
        | "cancelled"
      product_status: "active" | "inactive"
      seller_store_status: "pending" | "approved" | "blocked"
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
      app_role: ["admin", "sacoleira"],
      order_origin: ["loja_online", "whatsapp", "manual"],
      order_status: [
        "new",
        "confirmed",
        "paid",
        "separated",
        "shipped",
        "delivered",
        "cancelled",
      ],
      product_status: ["active", "inactive"],
      seller_store_status: ["pending", "approved", "blocked"],
    },
  },
} as const
