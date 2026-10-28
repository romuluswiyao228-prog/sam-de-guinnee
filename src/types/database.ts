export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppRole = 'admin' | 'staff' | 'exhibitor' | 'sponsor' | 'user'

export type PartnerKind =
  | 'sponsor'
  | 'bank'
  | 'insurer'
  | 'leasing'
  | 'media'
  | 'institution'

export type ActivityKind =
  | 'ceremony'
  | 'conference'
  | 'workshop'
  | 'b2b'
  | 'rally'
  | 'gala'
  | 'guided_tour'
  | 'finance_desk'
  | 'vip'
  | 'exhibition'
  | 'other'

export type AccessType = 'public' | 'registration' | 'invitation' | 'vip'

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'waitlist'
  | 'cancelled'
  | 'checked_in'

export type TicketTypeCode = 'adult' | 'teen' | 'child' | 'press' | 'vip'

export type TicketStatus = 'pending' | 'paid' | 'used' | 'cancelled'

export type StandClassCode = 'simple' | 'double' | 'accessory' | 'bank_insurance'

export type ExhibitorApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'paid'
  | 'cancelled'

export type SponsorPackCode = 'diamond' | 'platinum' | 'gold'

export type SponsorApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'signed'

export type ApplicantType = 'civil_servant' | 'permanent_employee' | 'other'

export type FinancingType = 'credit' | 'leasing' | 'undecided'

export type FinanceRequestStatus =
  | 'new'
  | 'contacted'
  | 'forwarded'
  | 'closed'

export type RallyRole = 'driver' | 'co_driver' | 'spectator'

export type RallyEntryStatus = 'submitted' | 'accepted' | 'rejected' | 'waitlist'

export type ContactMessageStatus = 'new' | 'read' | 'answered'

export type NoteTargetType = 'exhibitor' | 'sponsor' | 'reservation' | 'finance'

/**
 * Montant en Francs Guinéens (GNF).
 *
 * En base de données PostgreSQL, ces montants sont stockés en type BIGINT (int8)
 * suite à la migration de durcissement (20261028000001_hardening.sql) afin d'éviter
 * tout dépassement de capacité (ex. stands doubles de grande surface, sponsoring majeur
 * ou montants cumulés excédant la limite d'un INT4 standard de 2,14 milliards GNF).
 *
 * Côté TypeScript :
 * - Représenté par `number` : les montants du salon (ex. 300 000 000 GNF pour le pack Diamond)
 *   restent largement en-deçà de Number.MAX_SAFE_INTEGER (9 007 199 254 740 991, soit 9 millions
 *   de milliards de GNF), ce qui garantit des opérations arithmétiques directes et exactes.
 * - En cas de sérialisation JSON/PostgREST textuelle pour de très grands nombres, une conversion
 *   vers `string` ou `BigInt` peut être effectuée.
 */
export type GnfAmount = number

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          country: string | null
          preferred_language: string
          marketing_consent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          country?: string | null
          preferred_language?: string
          marketing_consent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          country?: string | null
          preferred_language?: string
          marketing_consent?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: AppRole
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: AppRole
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: AppRole
          created_at?: string
        }
      }
      editions: {
        Row: {
          id: string
          slug: string
          name: string
          starts_on: string
          ends_on: string
          venue_name: string
          venue_address: string
          is_current: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          starts_on: string
          ends_on: string
          venue_name: string
          venue_address: string
          is_current?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          starts_on?: string
          ends_on?: string
          venue_name?: string
          venue_address?: string
          is_current?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      site_settings: {
        Row: {
          key: string
          value: Json
          is_public: boolean
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          is_public?: boolean
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          is_public?: boolean
          updated_at?: string
        }
      }
      partners: {
        Row: {
          id: string
          name: string
          kind: PartnerKind
          logo_url: string | null
          website_url: string | null
          sort_order: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          kind: PartnerKind
          logo_url?: string | null
          website_url?: string | null
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          kind?: PartnerKind
          logo_url?: string | null
          website_url?: string | null
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      faq_items: {
        Row: {
          id: string
          question: string
          answer: string
          sort_order: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          question: string
          answer: string
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          question?: string
          answer?: string
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          edition_id: string
          slug: string
          title: string
          description: string | null
          kind: ActivityKind
          starts_at: string
          ends_at: string
          location: string | null
          capacity: number | null
          seats_taken: number
          price_gnf: GnfAmount
          access: AccessType
          requires_approval: boolean
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          edition_id: string
          slug: string
          title: string
          description?: string | null
          kind: ActivityKind
          starts_at: string
          ends_at: string
          location?: string | null
          capacity?: number | null
          seats_taken?: number
          price_gnf?: GnfAmount
          access?: AccessType
          requires_approval?: boolean
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          edition_id?: string
          slug?: string
          title?: string
          description?: string | null
          kind?: ActivityKind
          starts_at?: string
          ends_at?: string
          location?: string | null
          capacity?: number | null
          seats_taken?: number
          price_gnf?: GnfAmount
          access?: AccessType
          requires_approval?: boolean
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          activity_id: string
          user_id: string
          attendee_name: string
          attendee_email: string
          attendee_phone: string
          seats: number
          status: ReservationStatus
          ticket_code: string
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          user_id: string
          attendee_name: string
          attendee_email: string
          attendee_phone: string
          seats: number
          status?: ReservationStatus
          ticket_code: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          user_id?: string
          attendee_name?: string
          attendee_email?: string
          attendee_phone?: string
          seats?: number
          status?: ReservationStatus
          ticket_code?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ticket_types: {
        Row: {
          id: string
          edition_id: string
          code: TicketTypeCode
          label: string
          price_gnf: GnfAmount
          min_age: number | null
          max_age: number | null
          requires_proof: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          edition_id: string
          code: TicketTypeCode
          label: string
          price_gnf: GnfAmount
          min_age?: number | null
          max_age?: number | null
          requires_proof?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          edition_id?: string
          code?: TicketTypeCode
          label?: string
          price_gnf?: GnfAmount
          min_age?: number | null
          max_age?: number | null
          requires_proof?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      entry_tickets: {
        Row: {
          id: string
          user_id: string
          ticket_type_id: string
          valid_on: string | null
          holder_name: string
          ticket_code: string
          status: TicketStatus
          used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticket_type_id: string
          valid_on?: string | null
          holder_name: string
          ticket_code: string
          status?: TicketStatus
          used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticket_type_id?: string
          valid_on?: string | null
          holder_name?: string
          ticket_code?: string
          status?: TicketStatus
          used_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stand_classes: {
        Row: {
          id: string
          code: StandClassCode
          label: string
          price_per_m2_gnf: GnfAmount
          min_surface_m2: number
          amenities: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: StandClassCode
          label: string
          price_per_m2_gnf: GnfAmount
          min_surface_m2?: number
          amenities?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: StandClassCode
          label?: string
          price_per_m2_gnf?: GnfAmount
          min_surface_m2?: number
          amenities?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      exhibitor_applications: {
        Row: {
          id: string
          user_id: string
          company_name: string
          sector: string
          address: string
          country: string
          contact_name: string
          contact_email: string
          contact_phone: string
          stand_class_id: string
          surface_m2: number
          registration_fee_gnf: GnfAmount
          stand_total_ht_gnf: GnfAmount
          vat_rate: number
          total_ttc_gnf: GnfAmount
          activity_declaration: string
          is_vehicle_sales_agent: boolean
          status: ExhibitorApplicationStatus
          rules_accepted_at: string | null
          payment_proof_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          sector: string
          address: string
          country: string
          contact_name: string
          contact_email: string
          contact_phone: string
          stand_class_id: string
          surface_m2: number
          registration_fee_gnf?: GnfAmount
          stand_total_ht_gnf?: GnfAmount
          vat_rate?: number
          total_ttc_gnf?: GnfAmount
          activity_declaration: string
          is_vehicle_sales_agent?: boolean
          status?: ExhibitorApplicationStatus
          rules_accepted_at?: string | null
          payment_proof_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          sector?: string
          address?: string
          country?: string
          contact_name?: string
          contact_email?: string
          contact_phone?: string
          stand_class_id?: string
          surface_m2?: number
          registration_fee_gnf?: GnfAmount
          stand_total_ht_gnf?: GnfAmount
          vat_rate?: number
          total_ttc_gnf?: GnfAmount
          activity_declaration?: string
          is_vehicle_sales_agent?: boolean
          status?: ExhibitorApplicationStatus
          rules_accepted_at?: string | null
          payment_proof_path?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sponsor_packs: {
        Row: {
          id: string
          code: SponsorPackCode
          label: string
          role_label: string
          price_gnf: GnfAmount
          benefits: Json
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: SponsorPackCode
          label: string
          role_label: string
          price_gnf: GnfAmount
          benefits?: Json
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: SponsorPackCode
          label?: string
          role_label?: string
          price_gnf?: GnfAmount
          benefits?: Json
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sponsor_applications: {
        Row: {
          id: string
          user_id: string
          company_name: string
          company_type: string
          contact_name: string
          contact_email: string
          contact_phone: string
          pack_id: string
          pack_price_gnf: GnfAmount | null
          message: string | null
          status: SponsorApplicationStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          company_type: string
          contact_name: string
          contact_email: string
          contact_phone: string
          pack_id: string
          pack_price_gnf?: GnfAmount | null
          message?: string | null
          status?: SponsorApplicationStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          company_type?: string
          contact_name?: string
          contact_email?: string
          contact_phone?: string
          pack_id?: string
          pack_price_gnf?: GnfAmount | null
          message?: string | null
          status?: SponsorApplicationStatus
          created_at?: string
          updated_at?: string
        }
      }
      finance_requests: {
        Row: {
          id: string
          user_id: string | null
          full_name: string
          phone: string
          email: string
          applicant_type: ApplicantType
          employer_name: string | null
          vehicle_interest: string
          budget_range: string | null
          financing_type: FinancingType
          consent_contact: boolean
          consent_at: string
          status: FinanceRequestStatus
          forwarded_partner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          full_name: string
          phone: string
          email: string
          applicant_type: ApplicantType
          employer_name?: string | null
          vehicle_interest: string
          budget_range?: string | null
          financing_type: FinancingType
          consent_contact: boolean
          consent_at?: string
          status?: FinanceRequestStatus
          forwarded_partner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          full_name?: string
          phone?: string
          email?: string
          applicant_type?: ApplicantType
          employer_name?: string | null
          vehicle_interest?: string
          budget_range?: string | null
          financing_type?: FinancingType
          consent_contact?: boolean
          consent_at?: string
          status?: FinanceRequestStatus
          forwarded_partner_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rally_entries: {
        Row: {
          id: string
          activity_id: string
          user_id: string
          role: RallyRole
          full_name: string
          phone: string
          vehicle_make_model: string
          vehicle_plate: string
          licence_number: string | null
          status: RallyEntryStatus
          waiver_accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          user_id: string
          role: RallyRole
          full_name: string
          phone: string
          vehicle_make_model: string
          vehicle_plate: string
          licence_number?: string | null
          status?: RallyEntryStatus
          waiver_accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          user_id?: string
          role?: RallyRole
          full_name?: string
          phone?: string
          vehicle_make_model?: string
          vehicle_plate?: string
          licence_number?: string | null
          status?: RallyEntryStatus
          waiver_accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contact_messages: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          subject: string
          message: string
          status: ContactMessageStatus
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          subject: string
          message: string
          status?: ContactMessageStatus
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          subject?: string
          message?: string
          status?: ContactMessageStatus
          created_at?: string
        }
      }
      newsletter_subscribers: {
        Row: {
          id: string
          email: string
          consent_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          id?: string
          email: string
          consent_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          consent_at?: string
          unsubscribed_at?: string | null
        }
      }
      audit_log: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          table_name: string
          row_id: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          table_name: string
          row_id: string
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          action?: string
          table_name?: string
          row_id?: string
          details?: Json
          created_at?: string
        }
      }
      application_notes: {
        Row: {
          id: string
          target_type: NoteTargetType
          target_id: string
          note: string
          author_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          target_type: NoteTargetType
          target_id: string
          note: string
          author_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          target_type?: NoteTargetType
          target_id?: string
          note?: string
          author_id?: string | null
          created_at?: string
        }
      }
      activity_invitations: {
        Row: {
          id: string
          activity_id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          email?: string
          created_at?: string
        }
      }
    }
    Views: {
      public_site_settings: {
        Row: {
          key: string
          value: Json
        }
      }
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: AppRole
        }
        Returns: boolean
      }
      reserve_seats: {
        Args: {
          _activity_id: string
          _seats: number
          _attendee_name: string
          _attendee_email: string
          _attendee_phone: string
        }
        Returns: {
          id: string
          activity_id: string
          seats: number
          status: ReservationStatus
          ticket_code: string
        }
      }
      cancel_reservation: {
        Args: {
          _reservation_id: string
        }
        Returns: boolean
      }
      check_in: {
        Args: {
          _ticket_code: string
        }
        Returns: {
          success: boolean
          ticket_type: 'activity' | 'entry'
          ticket_code: string
          holder_name: string
          checked_in_at: string
        }
      }
      get_payment_details: {
        Args: Record<string, never>
        Returns: Json
      }
    }
  }
}
