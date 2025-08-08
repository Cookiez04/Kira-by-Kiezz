import { useState, useEffect } from 'react';
import { supabaseOperations } from '../services/supabase';
import { useAuthUser } from './useAuthUser';

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userId } = useAuthUser();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseOperations.getCategories(userId ?? undefined);
      
      if (error) {
        throw error;
      }
      
      setCategories(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (categoryData) => {
    try {
      const { data, error } = await supabaseOperations.addCategory({
        ...categoryData,
        user_id: userId ?? undefined,
      });
      
      if (error) {
        throw error;
      }
      
      // Refresh the categories list
      await fetchCategories();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error adding category:', err);
      throw err;
    }
  };

  const updateCategory = async (id, updates) => {
    try {
      const { data, error } = await supabaseOperations.updateCategory(id, updates);
      if (error) throw error;
      await fetchCategories();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error updating category:', err);
      throw err;
    }
  };

  const deleteCategory = async (id) => {
    try {
      const { error } = await supabaseOperations.deleteCategory(id);
      if (error) throw error;
      await fetchCategories();
    } catch (err) {
      setError(err.message);
      console.error('Error deleting category:', err);
      throw err;
    }
  };

  // Get categories by type
  const getIncomeCategories = () => {
    return categories.filter(cat => cat.type === 'income');
  };

  const getExpenseCategories = () => {
    return categories.filter(cat => cat.type === 'expense');
  };

  // Get category by ID
  const getCategoryById = (id) => {
    return categories.find(cat => cat.id === id);
  };

  useEffect(() => {
    if (!userId) return;
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: fetchCategories,
    getIncomeCategories,
    getExpenseCategories,
    getCategoryById
  };
};