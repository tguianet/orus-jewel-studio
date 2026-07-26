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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: []
      }
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
      commission_settings: {
        Row: {
          active_from: string
          created_at: string
          id: string
          level_1_rate: number
          level_2_rate: number
          level_3_rate: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_from?: string
          created_at?: string
          id?: string
          level_1_rate: number
          level_2_rate: number
          level_3_rate: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_from?: string
          created_at?: string
          id?: string
          level_1_rate?: number
          level_2_rate?: number
          level_3_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
      order_reservation_settings: {
        Row: {
          id: number
          reserve_minutes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          reserve_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          reserve_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          checkout_token: string | null
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          discount: number
          expiration_reason: string | null
          expired_at: string | null
          expires_at: string | null
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
          checkout_token?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          discount?: number
          expiration_reason?: string | null
          expired_at?: string | null
          expires_at?: string | null
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
          checkout_token?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          discount?: number
          expiration_reason?: string | null
          expired_at?: string | null
          expires_at?: string | null
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
      product_return_items: {
        Row: {
          condition: Database["public"]["Enums"]["return_item_condition"]
          created_at: string
          id: string
          notes: string | null
          order_item_id: string
          product_id: string
          quantity: number
          reason: string | null
          replacement_product_id: string | null
          replacement_quantity: number | null
          resolution: Database["public"]["Enums"]["return_resolution"]
          return_id: string
          stock_action: Database["public"]["Enums"]["return_stock_action"]
          stock_after: number | null
          stock_before: number | null
          stock_movement_id: string | null
          unit_price_original: number
          unit_price_replacement: number | null
          value_difference: number
        }
        Insert: {
          condition: Database["public"]["Enums"]["return_item_condition"]
          created_at?: string
          id?: string
          notes?: string | null
          order_item_id: string
          product_id: string
          quantity: number
          reason?: string | null
          replacement_product_id?: string | null
          replacement_quantity?: number | null
          resolution?: Database["public"]["Enums"]["return_resolution"]
          return_id: string
          stock_action: Database["public"]["Enums"]["return_stock_action"]
          stock_after?: number | null
          stock_before?: number | null
          stock_movement_id?: string | null
          unit_price_original: number
          unit_price_replacement?: number | null
          value_difference?: number
        }
        Update: {
          condition?: Database["public"]["Enums"]["return_item_condition"]
          created_at?: string
          id?: string
          notes?: string | null
          order_item_id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          replacement_product_id?: string | null
          replacement_quantity?: number | null
          resolution?: Database["public"]["Enums"]["return_resolution"]
          return_id?: string
          stock_action?: Database["public"]["Enums"]["return_stock_action"]
          stock_after?: number | null
          stock_before?: number | null
          stock_movement_id?: string | null
          unit_price_original?: number
          unit_price_replacement?: number | null
          value_difference?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_return_items_replacement_product_id_fkey"
            columns: ["replacement_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "product_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_return_items_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: true
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      product_returns: {
        Row: {
          created_at: string
          financial_pending_amount: number
          financial_pending_notes: string | null
          id: string
          notes: string | null
          order_id: string
          performed_by: string
          reason: string
          seller_store_id: string | null
          status: Database["public"]["Enums"]["product_return_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          financial_pending_amount?: number
          financial_pending_notes?: string | null
          id?: string
          notes?: string | null
          order_id: string
          performed_by: string
          reason: string
          seller_store_id?: string | null
          status?: Database["public"]["Enums"]["product_return_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          financial_pending_amount?: number
          financial_pending_notes?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          performed_by?: string
          reason?: string
          seller_store_id?: string | null
          status?: Database["public"]["Enums"]["product_return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_returns_seller_store_id_fkey"
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
          images: string[]
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
          images?: string[]
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
          images?: string[]
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
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: string
          order_id: string | null
          performed_by: string | null
          product_id: string
          quantity: number
          quantity_after: number
          quantity_before: number
          reason: string
          seller_store_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: string
          order_id?: string | null
          performed_by?: string | null
          product_id: string
          quantity: number
          quantity_after: number
          quantity_before: number
          reason?: string
          seller_store_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: string
          order_id?: string | null
          performed_by?: string | null
          product_id?: string
          quantity?: number
          quantity_after?: number
          quantity_before?: number
          reason?: string
          seller_store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_seller_store_id_fkey"
            columns: ["seller_store_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
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
          images: string[]
          product_id: string
          resale_price: number
          seller_store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          images?: string[]
          product_id: string
          resale_price?: number
          seller_store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          images?: string[]
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
      admin_role_audit_log: {
        Row: {
          id: string
          target_user_id: string
          action: string
          previous_role: string | null
          new_role: string | null
          performed_by: string
          reason: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          target_user_id: string
          action: string
          previous_role?: string | null
          new_role?: string | null
          performed_by: string
          reason?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          target_user_id?: string
          action?: string
          previous_role?: string | null
          new_role?: string | null
          performed_by?: string
          reason?: string | null
          metadata?: Json
          created_at?: string
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
      wallet_transactions: {
        Row: {
          amount: number
          commission_id: string | null
          created_at: string
          description: string
          id: string
          reason: string | null
          reseller_id: string
          status: string
          type: string
          updated_at: string
          withdrawal_id: string | null
        }
        Insert: {
          amount?: number
          commission_id?: string | null
          created_at?: string
          description?: string
          id?: string
          reason?: string | null
          reseller_id: string
          status?: string
          type?: string
          updated_at?: string
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          commission_id?: string | null
          created_at?: string
          description?: string
          id?: string
          reason?: string | null
          reseller_id?: string
          status?: string
          type?: string
          updated_at?: string
          withdrawal_id?: string | null
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
          blocked: number | null
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
      admin_list_administrators: {
        Args: never
        Returns: Json
      }
      admin_search_users: {
        Args: { p_query: string; p_limit?: number }
        Returns: Json
      }
      admin_grant_role: {
        Args: { p_user_id: string; p_reason?: string | null }
        Returns: Json
      }
      admin_revoke_role: {
        Args: { p_user_id: string; p_reason: string }
        Returns: Json
      }
      admin_get_role_audit: {
        Args: { p_page?: number; p_page_size?: number }
        Returns: Json
      }
      /** Somente is_admin — sacoleira/anon são negados no corpo da função. */
      admin_product_costs: {
        Args: never
        Returns: {
          cost_price: number
          id: string
          wholesale_price: number
        }[]
      }
      report_operational_error: {
        Args: {
          p_correlation_id: string
          p_error_code: string
          p_category: string
          p_severity: string
          p_operation?: string | null
          p_route?: string | null
          p_entity_type?: string | null
          p_entity_id?: string | null
          p_context?: Json
        }
        Returns: Json
      }
      admin_list_operational_errors: {
        Args: {
          p_severity?: string | null
          p_category?: string | null
          p_error_code?: string | null
          p_route?: string | null
          p_operation?: string | null
          p_resolved?: boolean | null
          p_date_from?: string | null
          p_date_to?: string | null
          p_page?: number
          p_page_size?: number
        }
        Returns: Json
      }
      admin_get_operational_error: {
        Args: { p_error_id: string }
        Returns: Json
      }
      admin_resolve_operational_error: {
        Args: { p_error_id: string; p_resolution_notes: string }
        Returns: Json
      }
      admin_get_sales_summary: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_store_id?: string | null
          p_reseller_id?: string | null
        }
        Returns: Json
      }
      admin_get_sales_timeseries: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_granularity?: string
          p_store_id?: string | null
          p_reseller_id?: string | null
        }
        Returns: Json
      }
      admin_get_order_status_report: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_store_id?: string | null
          p_reseller_id?: string | null
        }
        Returns: Json
      }
      admin_get_reseller_performance: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_page?: number
          p_page_size?: number
          p_sort_by?: string
          p_sort_direction?: string
          p_search?: string | null
        }
        Returns: Json
      }
      admin_get_commission_report: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_level?: number | null
          p_status?: string | null
          p_reseller_id?: string | null
          p_page?: number
          p_page_size?: number
        }
        Returns: Json
      }
      admin_get_wallet_report: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_reseller_id?: string | null
          p_type?: string | null
          p_page?: number
          p_page_size?: number
        }
        Returns: Json
      }
      admin_get_withdrawal_report: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_status?: string | null
          p_reseller_id?: string | null
        }
        Returns: Json
      }
      admin_get_returns_report: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_reseller_id?: string | null
          p_product_id?: string | null
        }
        Returns: Json
      }
      admin_get_inventory_report: {
        Args: {
          p_stale_days?: number
          p_page?: number
          p_page_size?: number
          p_status?: string | null
          p_search?: string | null
          p_sort_by?: string
          p_sort_direction?: string
        }
        Returns: Json
      }
      admin_get_top_products: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_metric?: string
          p_limit?: number
          p_store_id?: string | null
        }
        Returns: Json
      }
      admin_get_expired_orders_report: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_store_id?: string | null
          p_reseller_id?: string | null
        }
        Returns: Json
      }
      admin_export_report: {
        Args: { p_report_type: string; p_filters?: Json }
        Returns: Json
      }
      seller_get_sales_summary: {
        Args: { p_start_date: string; p_end_date: string }
        Returns: Json
      }
      seller_get_sales_timeseries: {
        Args: { p_start_date: string; p_end_date: string; p_granularity?: string }
        Returns: Json
      }
      seller_get_commission_summary: {
        Args: { p_start_date: string; p_end_date: string }
        Returns: Json
      }
      seller_get_order_report: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_page?: number
          p_page_size?: number
        }
        Returns: Json
      }
      seller_export_my_report: {
        Args: { p_report_type: string; p_filters?: Json }
        Returns: Json
      }
      can_access_order: {
        Args: { _order_id: string; _user_id?: string }
        Returns: boolean
      }
      can_access_store: {
        Args: { _store_id: string; _user_id?: string }
        Returns: boolean
      }
      cancel_order_with_stock_restore: {
        Args: { _order_id: string; _reason: string }
        Returns: {
          details: Json
          order_id: string
          products_touched: number
          skipped_zero: number
          units_restored: number
        }[]
      }
      cancel_paid_order: {
        Args: { _order_id: string; _reason: string }
        Returns: {
          already_reversed: boolean
          commissions_reversed: number
          order_id: string
          total_reversed: number
          wallet_reversals_created: number
        }[]
      }
      create_mlm_commissions_for_order: {
        Args: { _order_id: string }
        Returns: undefined
      }
      create_public_order: {
        Args: {
          p_checkout_token?: string
          p_consents?: Json
          p_customer_address?: string
          p_customer_name: string
          p_customer_phone: string
          p_items?: Json
          p_notes?: string
          p_seller_store_id: string
        }
        Returns: {
          created_at: string
          expires_at: string | null
          items: Json
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
        }[]
      }
      get_active_legal_documents: {
        Args: { p_audience?: string | null }
        Returns: Json
      }
      validate_checkout_consents: {
        Args: { p_consents: Json }
        Returns: Json
      }
      record_checkout_consents: {
        Args: {
          p_order_id: string
          p_store_id: string
          p_customer_identifier: string
          p_consents: Json
          p_session_reference?: string | null
          p_ip?: string | null
          p_user_agent?: string | null
        }
        Returns: Json
      }
      record_authenticated_consent: {
        Args: {
          p_document_type: string
          p_consent_context: string
          p_session_reference?: string | null
        }
        Returns: Json
      }
      get_my_consents: { Args: never; Returns: Json }
      admin_list_legal_consents: {
        Args: {
          p_document_type?: string | null
          p_version?: string | null
          p_subject_type?: string | null
          p_reseller_id?: string | null
          p_order_id?: string | null
          p_context?: string | null
          p_date_from?: string | null
          p_date_to?: string | null
          p_page?: number
          p_page_size?: number
        }
        Returns: Json
      }
      admin_list_legal_documents: { Args: never; Returns: Json }
      publish_legal_document_version: {
        Args: {
          p_document_type: string
          p_title: string
          p_version: string
          p_content_hash?: string | null
          p_effective_at?: string
          p_audience: string
          p_route_path: string
          p_requires_acceptance?: boolean
        }
        Returns: Json
      }
      revoke_legal_consent: {
        Args: { p_consent_id: string; p_reason: string }
        Returns: Json
      }
      has_active_consent_for: {
        Args: { p_document_type: string; p_consent_context?: string }
        Returns: boolean
      }
      expire_abandoned_orders: {
        Args: { _limit?: number }
        Returns: {
          details: Json
          expired_count: number
          order_ids: string[]
          units_restored: number
        }[]
      }
      get_order_reserve_minutes: { Args: never; Returns: number }
      current_reseller_id: { Args: { _user_id?: string }; Returns: string }
      current_store_id: { Args: { _user_id?: string }; Returns: string }
      get_current_commission_rates: {
        Args: never
        Returns: {
          level_1_rate: number
          level_2_rate: number
          level_3_rate: number
        }[]
      }
      get_order_return_preview: {
        Args: { _order_id: string }
        Returns: {
          eligibility_reason: string
          eligible: boolean
          order_item_id: string
          order_status: Database["public"]["Enums"]["order_status"]
          product_id: string
          product_name: string
          quantity_purchased: number
          quantity_remaining: number
          quantity_returned: number
          unit_price: number
        }[]
      }
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
        Returns: {
          display_name: string
          id: string
        }[]
      }
      mark_order_paid: { Args: { _order_id: string }; Returns: undefined }
      owns_reseller: {
        Args: { _reseller_id: string; _user_id?: string }
        Returns: boolean
      }
      owns_storage_store_folder: { Args: { _name: string }; Returns: boolean }
      owns_store: {
        Args: { _store_id: string; _user_id?: string }
        Returns: boolean
      }
      refund_paid_order: {
        Args: { _order_id: string; _reason: string }
        Returns: {
          already_reversed: boolean
          commissions_reversed: number
          order_id: string
          total_reversed: number
          wallet_reversals_created: number
        }[]
      }
      register_physical_return: {
        Args: {
          _items: Json
          _notes?: string
          _order_id: string
          _reason: string
        }
        Returns: {
          financial_pending_amount: number
          items_count: number
          order_id: string
          return_id: string
          units_not_restocked: number
          units_restocked: number
          units_returned: number
        }[]
      }
      reseller_can_access_store: {
        Args: { _store_id: string; _user_id?: string }
        Returns: boolean
      }
      reverse_mlm_commissions_for_order: {
        Args: { _order_id: string; _reason: string }
        Returns: {
          already_reversed: boolean
          commissions_reversed: number
          order_id: string
          total_reversed: number
          wallet_reversals_created: number
        }[]
      }
      set_my_reseller_parent: {
        Args: { _parent_id: string }
        Returns: undefined
      }
      update_commission_settings: {
        Args: {
          p_level_1_rate: number
          p_level_2_rate: number
          p_level_3_rate: number
        }
        Returns: {
          active_from: string
          created_at: string
          id: string
          level_1_rate: number
          level_2_rate: number
          level_3_rate: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "commission_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_list_withdrawals: {
        Args: {
          p_status?: string | null
          p_reseller_id?: string | null
          p_search?: string | null
          p_date_from?: string | null
          p_date_to?: string | null
          p_amount_min?: number | null
          p_amount_max?: number | null
          p_page?: number
          p_page_size?: number
        }
        Returns: Json
      }
      approve_withdrawal: {
        Args: { p_withdrawal_id: string }
        Returns: Json
      }
      cancel_withdrawal: {
        Args: { p_withdrawal_id: string; p_reason?: string | null }
        Returns: Json
      }
      get_my_withdrawal_summary: {
        Args: never
        Returns: Json
      }
      get_withdrawal_audit: {
        Args: { p_withdrawal_id: string }
        Returns: Json
      }
      get_withdrawal_details: {
        Args: { p_withdrawal_id: string; p_reveal_payment?: boolean }
        Returns: Json
      }
      list_my_withdrawals: {
        Args: { p_page?: number; p_page_size?: number }
        Returns: Json
      }
      mark_withdrawal_paid: {
        Args: {
          p_withdrawal_id: string
          p_payment_reference?: string | null
          p_receipt_url?: string | null
          p_idempotency_key: string
        }
        Returns: Json
      }
      reject_withdrawal: {
        Args: { p_withdrawal_id: string; p_reason: string }
        Returns: Json
      }
      request_withdrawal: {
        Args: {
          p_amount: number
          p_payment_method: string
          p_payment_details: Json
          p_idempotency_key?: string | null
        }
        Returns: Json
      }
      update_withdrawal_settings: {
        Args: { p_minimum: number }
        Returns: Json
      }
      upsert_my_payout_profile: {
        Args: { p_payment_method: string; p_payment_details: Json }
        Returns: Json
      }
      write_audit_log: {
        Args: {
          p_action: string
          p_after?: Json
          p_before?: Json
          p_entity: string
          p_entity_id?: string
          p_metadata?: Json
        }
        Returns: string
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
        | "refunded"
      product_return_status: "registered"
      product_status: "active" | "inactive"
      return_item_condition:
        | "perfeito_estado"
        | "embalagem_aberta"
        | "avariado"
        | "incompleto"
        | "usado"
        | "outro"
      return_resolution: "devolucao" | "troca"
      return_stock_action:
        | "retornar_ao_estoque"
        | "nao_retornar_ao_estoque"
        | "enviar_para_avaliacao"
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
        "refunded",
      ],
      product_return_status: ["registered"],
      product_status: ["active", "inactive"],
      return_item_condition: [
        "perfeito_estado",
        "embalagem_aberta",
        "avariado",
        "incompleto",
        "usado",
        "outro",
      ],
      return_resolution: ["devolucao", "troca"],
      return_stock_action: [
        "retornar_ao_estoque",
        "nao_retornar_ao_estoque",
        "enviar_para_avaliacao",
      ],
      seller_store_status: ["pending", "approved", "blocked"],
    },
  },
} as const
