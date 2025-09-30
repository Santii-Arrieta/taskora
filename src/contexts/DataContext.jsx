import React, { createContext, useContext, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const DataContext = createContext(null);

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    
    const getData = useCallback(async (table) => {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
            console.error(`Error fetching from ${table}:`, error);
            return [];
        }
        return data;
    }, []);

    const addData = useCallback(async (table, item) => {
        console.log(`Adding data to ${table}:`, item);
        const { data, error } = await supabase.from(table).insert([item]).select();
        if (error) {
            console.error(`Error inserting into ${table}:`, error);
            return null;
        }
        console.log(`Successfully inserted into ${table}:`, data);
        return data ? data[0] : null;
    }, []);

    const updateData = useCallback(async (table, id, updates) => {
        console.log(`🔄 Updating ${table} with id ${id}:`, updates);
        const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
        if (error) {
            console.error(`❌ Error updating ${table}:`, error);
            return null;
        }
        console.log(`✅ Successfully updated ${table}:`, data);
        return data.length > 0 ? data[0] : null;
    }, []);
    
    const deleteData = useCallback(async (table, id) => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) {
            console.error(`Error deleting from ${table}:`, error);
        }
    }, []);

    const value = { getData, addData, updateData, deleteData };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};