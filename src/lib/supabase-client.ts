/**
 * Supabase Client for HTTP-based database operations
 * This works when direct database connections are blocked
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Anonymous client for public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * HTTP-based database operations when Prisma connections fail
 */
export class SupabaseHttpAdapter {
  private client = supabaseAdmin;

  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client.from('profiles').select('count').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  // Catering packages operations
  async getCateringPackages() {
    const { data, error } = await this.client
      .from('catering_packages')
      .select(
        `
        *,
        items:catering_package_items(*)
      `
      )
      .eq('isActive', true)
      .order('featuredOrder', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return data;
  }

  // Products operations
  async getProductsByCategory(categoryName: string) {
    const { data, error } = await this.client
      .from('products')
      .select(
        `
        *,
        category:categories(*),
        variants(*)
      `
      )
      .eq('active', true)
      .eq('categories.name', categoryName)
      .order('ordinal', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getAppetizerProducts() {
    return this.getProductsByCategory('Appetizers');
  }

  async getLunchProducts() {
    return this.getProductsByCategory('Lunch');
  }

  async getBuffetProducts() {
    return this.getProductsByCategory('Buffet');
  }

  // Categories operations
  async getCategories() {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('order', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Health check
  async getHealthStatus() {
    try {
      const start = Date.now();
      const { error } = await this.client.from('profiles').select('count').limit(1);
      const latency = Date.now() - start;

      return {
        connected: !error,
        latency,
        method: 'supabase-http',
        error: error?.message,
      };
    } catch (error) {
      return {
        connected: false,
        latency: 0,
        method: 'supabase-http',
        error: (error as Error).message,
      };
    }
  }
}

export const supabaseHttpAdapter = new SupabaseHttpAdapter();
