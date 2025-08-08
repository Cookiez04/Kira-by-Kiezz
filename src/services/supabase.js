import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validate that environment variables are set
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions for common operations
export const supabaseOperations = {
  // Transactions
  async getTransactions(userId = null) {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .order('date', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    return query;
  },

  async addTransaction(transaction) {
    return supabase
      .from('transactions')
      .insert([transaction])
      .select();
  },

  async updateTransaction(id, updates) {
    return supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select();
  },

  async deleteTransaction(id) {
    return supabase
      .from('transactions')
      .delete()
      .eq('id', id);
  },

  // Categories
  async getCategories(userId = null) {
    let query = supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    return query;
  },

  async addCategory(category) {
    return supabase
      .from('categories')
      .insert([category])
      .select();
  },

  async updateCategory(id, updates) {
    return supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select();
  },

  async deleteCategory(id) {
    // Prevent deleting a category that is in use by any transaction
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new Error('Cannot delete category: it is used by existing transactions. Edit it instead.');
    }

    return supabase.from('categories').delete().eq('id', id);
  },

  // Budgets
  async getBudgets(userId = null) {
    let query = supabase
      .from('budgets')
      .select(`
        *,
        categories (
          id,
          name,
          color
        )
      `);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    return query;
  }
};