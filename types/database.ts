/* eslint-disable @typescript-eslint/no-explicit-any */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Temporary permissive schema shell. Regenerate with:
// supabase gen types typescript --linked > types/database.ts
// once the hosted Supabase project is linked and migrations are applied.
export type Database = any
