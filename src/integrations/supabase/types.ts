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
      legal_consents: {
        Row: {
          accepted_at: string
          consent_context: string
          consent_source: string
          content_hash: string
          created_at: string
          customer_identifier_hash: string | null
          document_type: string
          document_version: string
          id: string
          ip_hash: string | null
          legal_document_id: string
          metadata: Json
          order_id: string | null
          reseller_id: string | null
          revocation_reason: string | null
          revoked_at: string | null
          session_reference: string | null
          store_id: string | null
          subject_type: string
          subject_user_id: string | null
          updated_at: string
          user_agent_hash: string | null
        }
        Insert: {
          accepted_at?: string
          consent_context: string
          consent_source: string
          content_hash: string
          created_at?: string
          customer_identifier_hash?: string | null
          document_type: string
          document_version: string
          id?: string
          ip_hash?: string | null
          legal_document_id: string
          metadata?: Json
          order_id?: string | null
          reseller_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          session_reference?: string | null
          store_id?: string | null
          subject_type: string
          subject_user_id?: string | null
          updated_at?: string
          user_agent_hash?: string | null
        }
        Update: {
          accepted_at?: string
          consent_context?: string
          consent_source?: string
          content_hash?: string
          created_at?: string
          customer_identifier_hash?: string | null
          document_type?: string
          document_version?: string
          id?: string
          ip_hash?: string | null
          legal_document_id?: string
          metadata?: Json
          order_id?: string | null
          reseller_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          session_reference?: string | null
          store_id?: string | null
          subject_type?: string
          subject_user_id?: string | null
          updated_at?: string
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_consents_legal_document_id_fkey"
            columns: ["legal_document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_consents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_consents_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_consents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          legal_document_id: string | null
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          legal_document_id?: string | null
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          legal_document_id?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_audit_log_legal_document_id_fkey"
            columns: ["legal_document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          audience: string
          content_hash: string
          created_at: string
          document_type: string
          effective_at: string
          id: string
          is_active: boolean
          published_at: string | null
          requires_acceptance: boolean
          route_path: string | null
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          audience: string
          content_hash: string
          created_at?: string
          document_type: string
          effective_at: string
          id?: string
          is_active?: boolean
          published_at?: string | null
          requires_acceptance?: boolean
          route_path?: string | null
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          audience?: string
          content_hash?: string
          created_at?: string
          document_type?: string
          effective_at?: string
          id?: string
          is_active?: boolean
          published_at?: string | null
          requires_acceptance?: boolean
          route_path?: string | null
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      legal_privacy_config: {
        Row: {
          created_at: string
          hash_pepper: string
          id: number
        }
        Insert: {
          created_at?: string
          hash_pepper?: string
          id?: number
        }
        Update: {
          created_at?: string
          hash_pepper?: string
          id?: number
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
          id: number
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
      reseller_payout_profiles: {
        Row: {
          payment_details: Json
          payment_method: string
          reseller_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          payment_details?: Json
          payment_method: string
          reseller_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          payment_details?: Json
          payment_method?: string
          reseller_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_payout_profiles_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: true
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "wallet_transactions_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_audit_log: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          new_status: string | null
          previous_status: string | null
          withdrawal_id: string
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          withdrawal_id: string
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          withdrawal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_audit_log_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          balance_released: boolean
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          id: string
          paid_at: string | null
          paid_by: string | null
          payment_details: Json
          payment_idempotency_key: string | null
          payment_method: string
          payment_reference: string | null
          receipt_url: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          request_idempotency_key: string | null
          requested_at: string
          reseller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          balance_released?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_details: Json
          payment_idempotency_key?: string | null
          payment_method: string
          payment_reference?: string | null
          receipt_url?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_idempotency_key?: string | null
          requested_at?: string
          reseller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          balance_released?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_details?: Json
          payment_idempotency_key?: string | null
          payment_method?: string
          payment_reference?: string | null
          receipt_url?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_idempotency_key?: string | null
          requested_at?: string
          reseller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_settings: {
        Row: {
          id: number
          minimum_withdrawal_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          minimum_withdrawal_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          minimum_withdrawal_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
      _is_safe_receipt_url: { Args: { p_url: string }; Returns: boolean }
      _legal_content_fingerprint: {
        Args: {
          p_route: string
          p_title: string
          p_type: string
          p_version: string
        }
        Returns: string
      }
      _legal_hash: { Args: { p_value: string }; Returns: string }
      _legal_pepper: { Args: never; Returns: string }
      _log_legal_doc_audit: {
        Args: { p_action: string; p_doc_id: string; p_metadata?: Json }
        Returns: undefined
      }
      _log_withdrawal_audit: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_new: string
          p_previous: string
          p_withdrawal_id: string
        }
        Returns: undefined
      }
      _record_checkout_consents_internal: {
        Args: {
          p_consents: Json
          p_customer_identifier: string
          p_ip?: string
          p_order_id: string
          p_session_reference?: string
          p_store_id: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      _release_withdrawal_hold: {
        Args: {
          p_action: string
          p_withdrawal: Database["public"]["Tables"]["withdrawal_requests"]["Row"]
        }
        Returns: undefined
      }
      _validate_payment_details: {
        Args: { p_details: Json; p_method: string }
        Returns: undefined
      }
      _wallet_available_for_update: {
        Args: { p_reseller_id: string }
        Returns: number
      }
      _withdrawal_actor_role: { Args: never; Returns: string }
      admin_list_legal_consents: {
        Args: {
          p_context?: string
          p_date_from?: string
          p_date_to?: string
          p_document_type?: string
          p_order_id?: string
          p_page?: number
          p_page_size?: number
          p_reseller_id?: string
          p_subject_type?: string
          p_version?: string
        }
        Returns: Json
      }
      admin_list_legal_documents: { Args: never; Returns: Json }
      admin_list_withdrawals: {
        Args: {
          p_amount_max?: number
          p_amount_min?: number
          p_date_from?: string
          p_date_to?: string
          p_page?: number
          p_page_size?: number
          p_reseller_id?: string
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_product_costs: {
        Args: never
        Returns: {
          cost_price: number
          id: string
          wholesale_price: number
        }[]
      }
      approve_withdrawal: { Args: { p_withdrawal_id: string }; Returns: Json }
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
      cancel_withdrawal: {
        Args: { p_reason?: string; p_withdrawal_id: string }
        Returns: Json
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
          expires_at: string
          items: Json
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
        }[]
      }
      current_reseller_id: { Args: { _user_id?: string }; Returns: string }
      current_store_id: { Args: { _user_id?: string }; Returns: string }
      expire_abandoned_orders: {
        Args: { _limit?: number }
        Returns: {
          details: Json
          expired_count: number
          order_ids: string[]
          units_restored: number
        }[]
      }
      get_active_legal_documents: {
        Args: { p_audience?: string }
        Returns: Json
      }
      get_current_commission_rates: {
        Args: never
        Returns: {
          level_1_rate: number
          level_2_rate: number
          level_3_rate: number
        }[]
      }
      get_my_consents: { Args: never; Returns: Json }
      get_my_withdrawal_summary: { Args: never; Returns: Json }
      get_order_reserve_minutes: { Args: never; Returns: number }
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
      get_withdrawal_audit: { Args: { p_withdrawal_id: string }; Returns: Json }
      get_withdrawal_details: {
        Args: { p_reveal_payment?: boolean; p_withdrawal_id: string }
        Returns: Json
      }
      has_active_consent_for: {
        Args: { p_consent_context?: string; p_document_type: string }
        Returns: boolean
      }
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
      list_my_withdrawals: {
        Args: { p_page?: number; p_page_size?: number }
        Returns: Json
      }
      lookup_reseller_sponsor: {
        Args: { _id: string }
        Returns: {
          display_name: string
          id: string
        }[]
      }
      mark_order_paid: { Args: { _order_id: string }; Returns: undefined }
      mark_withdrawal_paid: {
        Args: {
          p_idempotency_key: string
          p_payment_reference: string
          p_receipt_url: string
          p_withdrawal_id: string
        }
        Returns: Json
      }
      owns_reseller: {
        Args: { _reseller_id: string; _user_id?: string }
        Returns: boolean
      }
      owns_storage_store_folder: { Args: { _name: string }; Returns: boolean }
      owns_store: {
        Args: { _store_id: string; _user_id?: string }
        Returns: boolean
      }
      publish_legal_document_version: {
        Args: {
          p_audience: string
          p_content_hash: string
          p_document_type: string
          p_effective_at: string
          p_requires_acceptance?: boolean
          p_route_path: string
          p_title: string
          p_version: string
        }
        Returns: Json
      }
      record_authenticated_consent: {
        Args: {
          p_consent_context: string
          p_document_type: string
          p_session_reference?: string
        }
        Returns: Json
      }
      record_checkout_consents: {
        Args: {
          p_consents: Json
          p_customer_identifier: string
          p_ip?: string
          p_order_id: string
          p_session_reference?: string
          p_store_id: string
          p_user_agent?: string
        }
        Returns: Json
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
      reject_withdrawal: {
        Args: { p_reason: string; p_withdrawal_id: string }
        Returns: Json
      }
      request_withdrawal: {
        Args: {
          p_amount: number
          p_idempotency_key?: string
          p_payment_details: Json
          p_payment_method: string
        }
        Returns: Json
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
      revoke_legal_consent: {
        Args: { p_consent_id: string; p_reason: string }
        Returns: Json
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
      update_withdrawal_settings: { Args: { p_minimum: number }; Returns: Json }
      upsert_my_payout_profile: {
        Args: { p_payment_details: Json; p_payment_method: string }
        Returns: Json
      }
      validate_checkout_consents: { Args: { p_consents: Json }; Returns: Json }
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
