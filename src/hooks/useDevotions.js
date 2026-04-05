import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getDevotionsForMonth,
  submitDevotion as submitDevotionService,
  submitTextDevotion as submitTextDevotionService,
  getDevotionStats,
  getLeaderboard,
} from '../services/devotions.service';
import { format } from 'date-fns';

export function useDevotions(year, month) {
  const { user } = useAuth();
  const [devotions, setDevotions] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch devotions for the given month
  const fetchDevotions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getDevotionsForMonth(user.id, year, month);
      setDevotions(data);
    } catch (err) {
      console.error('Failed to fetch devotions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, year, month]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getDevotionStats(user.id);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [user]);

  // Fetch leaderboard (if user has a group)
  const fetchLeaderboard = useCallback(async () => {
    if (!user) return;

    try {
      const { supabase } = await import('../lib/supabase');
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .limit(1);

      if (memberships && memberships.length > 0) {
        const data = await getLeaderboard(memberships[0].group_id);
        setLeaderboard(data);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, [user]);

  // Submit a devotion (image-based)
  async function submitDevotion(imageFile, notes = '', dateStr = null) {
    if (!user) throw new Error('Not authenticated');

    const data = await submitDevotionService(imageFile, notes, dateStr);

    // Optimistic update
    const serverDate = dateStr || format(new Date(), 'yyyy-MM-dd');
    setDevotions(prev => {
      const exists = prev.some(d => d.devotion_date === serverDate);
      if (exists) return prev;

      return [...prev, {
        id: data.id,
        devotion_date: serverDate,
        image_url: data.image_url,
        notes: data.notes,
        created_at: data.created_at
      }];
    });

    fetchDevotions().catch(err => console.error('Failed to refresh devotions:', err));
    fetchStats().catch(err => console.error('Failed to refresh stats:', err));
    fetchLeaderboard().catch(err => console.error('Failed to refresh leaderboard:', err));

    return data;
  }

  // Submit a text-based devotion
  async function submitTextDevotion(content, dateStr = null) {
    if (!user) throw new Error('Not authenticated');

    const data = await submitTextDevotionService(content, dateStr);

    // Optimistic update
    const serverDate = dateStr || format(new Date(), 'yyyy-MM-dd');
    setDevotions(prev => {
      const exists = prev.some(d => d.devotion_date === serverDate);
      if (exists) return prev;

      return [...prev, {
        id: data.id,
        devotion_date: serverDate,
        content: data.content,
        created_at: data.created_at
      }];
    });

    fetchDevotions().catch(err => console.error('Failed to refresh devotions:', err));
    fetchStats().catch(err => console.error('Failed to refresh stats:', err));
    fetchLeaderboard().catch(err => console.error('Failed to refresh leaderboard:', err));

    return data;
  }

  // Check if a specific date has a devotion
  function hasDevotionOn(date) {
    const devotionDate = format(date, 'yyyy-MM-dd');
    return devotions.some((d) => d.devotion_date === devotionDate);
  }

  // Get all devotion dates as a Set for fast lookup
  function getDevotionDates() {
    return new Set(devotions.map((d) => d.devotion_date));
  }

  useEffect(() => {
    fetchDevotions();
    fetchStats();
    fetchLeaderboard();
  }, [fetchDevotions, fetchStats, fetchLeaderboard]);

  return {
    devotions,
    stats,
    leaderboard,
    loading,
    error,
    submitDevotion,
    submitTextDevotion,
    hasDevotionOn,
    getDevotionDates,
    refetch: fetchDevotions,
  };
}
