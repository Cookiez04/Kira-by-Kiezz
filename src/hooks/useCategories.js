import { useState, useEffect } from 'react';
import { supabaseOperations } from '../services/supabase';

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseOperations.getCategories();
      
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
      const { data, error } = await supabaseOperations.addCategory(categoryData);
      
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
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    addCategory,
    refreshCategories: fetchCategories,
    getIncomeCategories,
    getExpenseCategories,
    getCategoryById
  };
};