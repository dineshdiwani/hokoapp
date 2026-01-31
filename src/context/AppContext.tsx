import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User, City, Notification, ProductRequirement, Message } from '@/types';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';


interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  cities: City[];
  currentCity: City | null;
  setCurrentCity: (city: City | null) => void;
  notifications: Notification[];
  unreadCount: number;
  productRequirement: ProductRequirement;
  setProductRequirement: (req: ProductRequirement) => void;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  isLoading: boolean;
}

const defaultProductRequirement: ProductRequirement = {
  productName: '',
  category: '',
  brand: '',
  quantity: 1,
  unit: 'pieces',
  fragrance: '',
  details: ''
};


const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [productRequirement, setProductRequirement] = useState<ProductRequirement>(defaultProductRequirement);
  const [isLoading, setIsLoading] = useState(true);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    loadCities();
    loadUserFromStorage();
  }, []);

  // Set up real-time subscription when user changes
  useEffect(() => {
    if (user) {
      refreshNotifications();
      // Use sessionStorage instead of localStorage - session ends when browser closes
      sessionStorage.setItem('hoko_user', JSON.stringify(user));
      
      // Set up real-time subscription for notifications
      setupRealtimeSubscription(user.id);
    } else {
      // Clean up subscription when user logs out
      cleanupRealtimeSubscription();
    }

    // Cleanup on unmount
    return () => {
      cleanupRealtimeSubscription();
    };
  }, [user?.id]);


  const setupRealtimeSubscription = (userId: string) => {
    // Clean up any existing subscription first
    cleanupRealtimeSubscription();

    console.log('Setting up real-time subscription for user:', userId);

    // Create a new channel for notifications
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Real-time notification received:', payload);
          
          const newNotification = payload.new as Notification;
          
          // Add the new notification to the state
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast notification
          showToastNotification(newNotification);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    realtimeChannelRef.current = channel;
  };

  const cleanupRealtimeSubscription = () => {
    if (realtimeChannelRef.current) {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  };

  const showToastNotification = (notification: Notification) => {
    // Play notification sound (optional - browser dependent)
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVYTAJPb8Nqkc1gLAIjV8NqsemIUAH3R8NqzgWsaAHLL8Nq6iHQgAGfF8NrBj30mAFy/8NrIloYsAFG58NrPnY8yAEaz8NrWpJg4ADut8NrdqaE+AC2n8NrkrrpEACKh8Nrrsr1KABeb8Nrytb9QAA2V8Nr5uMFWAAOP8Nr/u8NcAPmI8NsGvsdgAPKC8NsNwclmAOt88NsUxMtsAOR28NsbxsxyANxw8NsiycZ4ANRq8NspzMl+AMxk8NswztKEAMRe8Ns30dWKALxY8Ns+1NiQALRS8NtF19ubAKxM8NtM2t6hAKRG8NtT3eGnAJxA8Nta4OStAJQ68Nth4+ezAIw08Nto5uq5AIQu8Ntv6e2/AHwo8Nt27PC/AHQi8Nt97/PFAG4c8NuE8vbLAGYW8NuL9fnRAF4Q8NuS+PzXAFYK8NuZ+//dAE4E8Nug/gLjAEb+7NunAQXpAD747NuuBAfvADby7Nu1BwrzAC7s7Nu8CQ35ACbm7NvDDBH/AB7g7NvKDxQFARjZ7NvREhcLARC07NvYFRoRAQiv7NvfGBwXAQCp7NvmGx8dAPqj7NvtHiIjAPKd7Nv0ISUoAOqX7Nv7JCguAOKR7NwCJys0ANqL7NwJKi46ANKFANwQLTA/AMp/ANwXMDNFAMJ5ANweM');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {
      // Ignore audio errors
    }

    // Show toast with custom styling
    toast.success(notification.title, {
      description: notification.message,
      duration: 6000,
      action: {
        label: 'View',
        onClick: () => {
          // This will be handled by the Dashboard component
          window.dispatchEvent(new CustomEvent('viewNotification', { detail: notification }));
        }
      },
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
      },
    });
  };

  const loadCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error loading cities:', error);
      }
      if (data) {
        setCities(data);
      }
    } catch (err) {
      console.error('Failed to load cities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserFromStorage = async () => {
    try {
      // Use sessionStorage - session ends when browser closes
      const stored = sessionStorage.getItem('hoko_user');
      if (stored) {
        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);
        if (parsedUser.city_id) {
          const { data: city } = await supabase
            .from('cities')
            .select('*')
            .eq('id', parsedUser.city_id)
            .single();
          if (city) setCurrentCity(city);
        }
      }
    } catch (err) {
      console.error('Failed to load user from storage:', err);
    }
  };


  const refreshNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setNotifications(data);
    } catch (err) {
      console.error('Failed to refresh notifications:', err);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      cities,
      currentCity,
      setCurrentCity,
      notifications,
      unreadCount,
      productRequirement,
      setProductRequirement,
      refreshNotifications,
      markNotificationRead,
      isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
