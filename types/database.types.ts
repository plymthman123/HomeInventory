// Auto-generated types matching supabase/schema.sql
// Regenerate with: npx supabase gen types typescript --linked > types/database.types.ts
//
// NOTE: Relationships arrays are required by @supabase/postgrest-js ≥ 2.x so
// that the client can resolve join types. Each entry mirrors a foreign-key
// constraint in the schema.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          role: 'admin' | 'member'
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          role: 'admin' | 'member'
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          role?: 'admin' | 'member'
          display_name?: string | null
          avatar_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
      }
      locations: {
        Row: {
          id: string
          household_id: string
          name: string
          description: string | null
          icon: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          description?: string | null
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          icon?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'locations_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
      }
      items: {
        Row: {
          id: string
          household_id: string
          location_id: string | null
          owner_id: string | null
          name: string
          description: string | null
          brand: string | null
          model: string | null
          serial_number: string | null
          upc_code: string | null
          purchase_date: string | null
          purchase_price: number | null
          currency: string
          current_value: number | null
          manual_url: string | null
          notes: string | null
          primary_photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          location_id?: string | null
          owner_id?: string | null
          name: string
          description?: string | null
          brand?: string | null
          model?: string | null
          serial_number?: string | null
          upc_code?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          currency?: string
          current_value?: number | null
          manual_url?: string | null
          notes?: string | null
          primary_photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          location_id?: string | null
          owner_id?: string | null
          name?: string
          description?: string | null
          brand?: string | null
          model?: string | null
          serial_number?: string | null
          upc_code?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          currency?: string
          current_value?: number | null
          manual_url?: string | null
          notes?: string | null
          primary_photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'items_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'items_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'items_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'household_members'
            referencedColumns: ['id']
          },
        ]
      }
      item_photos: {
        Row: {
          id: string
          item_id: string
          storage_path: string
          url: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          storage_path: string
          url: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'item_photos_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
        ]
      }
      item_receipts: {
        Row: {
          id: string
          item_id: string
          storage_path: string
          url: string
          file_name: string | null
          file_type: 'image' | 'pdf' | null
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          storage_path: string
          url: string
          file_name?: string | null
          file_type?: 'image' | 'pdf' | null
          created_at?: string
        }
        Update: {
          file_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'item_receipts_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
        ]
      }
      warranties: {
        Row: {
          id: string
          item_id: string
          provider: string | null
          start_date: string | null
          end_date: string | null
          description: string | null
          document_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          provider?: string | null
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          document_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          provider?: string | null
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          document_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'warranties_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
        ]
      }
      household_invites: {
        Row: {
          id: string
          household_id: string
          email: string
          role: 'admin' | 'member'
          token: string
          expires_at: string
          accepted_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          email: string
          role: 'admin' | 'member'
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'household_invites_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      is_household_member: {
        Args: { hid: string }
        Returns: boolean
      }
      is_household_admin: {
        Args: { hid: string }
        Returns: boolean
      }
      create_household_for_user: {
        Args: { p_user_id: string; p_household_name: string }
        Returns: string
      }
      delete_account: {
        Args: { p_transfer_to_member_id?: string; p_delete_my_items?: boolean }
        Returns: undefined
      }
      delete_household_and_account: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
    Enums: Record<string, never>
  }
}

// Convenience row types
export type Household       = Database['public']['Tables']['households']['Row']
export type HouseholdMember = Database['public']['Tables']['household_members']['Row']
export type Location        = Database['public']['Tables']['locations']['Row']
export type Item            = Database['public']['Tables']['items']['Row']
export type ItemPhoto       = Database['public']['Tables']['item_photos']['Row']
export type ItemReceipt     = Database['public']['Tables']['item_receipts']['Row']
export type Warranty        = Database['public']['Tables']['warranties']['Row']
export type HouseholdInvite = Database['public']['Tables']['household_invites']['Row']

// Joined/extended types used in the UI
export type ItemWithDetails = Item & {
  location: Location | null
  owner: HouseholdMember | null
  photos: ItemPhoto[]
  receipts: ItemReceipt[]
  warranties: Warranty[]
}
