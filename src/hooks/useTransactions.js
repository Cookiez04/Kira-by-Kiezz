import { useState, useEffect } from 'react';
import { supabaseOperations } from '../services/supabase';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseOperations.getTransactions();
      
      if (error) {
        throw error;
      }
      
      setTransactions(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transactionData) => {
    try {
      const { data, error } = await supabaseOperations.addTransaction(transactionData);
      
      if (error) {
        throw error;
      }
      
      // Refresh the transactions list
      await fetchTransactions();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error adding transaction:', err);
      throw err;
    }
  };

  const updateTransaction = async (id, updates) => {
    try {
      const { data, error } = await supabaseOperations.updateTransaction(id, updates);
      
      if (error) {
        throw error;
      }
      
      // Refresh the transactions list
      await fetchTransactions();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error updating transaction:', err);
      throw err;
    }
  };

  const deleteTransaction = async (id) => {
    try {
      const { error } = await supabaseOperations.deleteTransaction(id);
      
      if (error) {
        throw error;
      }
      
      // Refresh the transactions list
      await fetchTransactions();
    } catch (err) {
      setError(err.message);
      console.error('Error deleting transaction:', err);
      throw err;
    }
  };

  // Calculate statistics from transactions
  const getStats = () => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      transactionCount: transactions.length
    };
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions: fetchTransactions,
    stats: getStats()
  };
};