import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Post, Offer, Notification, User } from '@/types';
import { PRODUCT_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import { 
  BellIcon, UserIcon, LocationIcon, TagIcon, PlusIcon, 
  HomeIcon, GridIcon, LogoutIcon, ChevronDownIcon, ShopIcon, ChatIcon, CartIcon, PhoneIcon, EditIcon, OfferIcon 
} from './icons/Icons';
import ChatModal from './ChatModal';

interface DashboardProps {
  onNewPost: () => void;
  onLogout: () => void;
  onRegisterSeller: () => void;
  onSwitchToBuyerMode: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNewPost, onLogout, onRegisterSeller, onSwitchToBuyerMode }) => {
  const { user, cities, currentCity, notifications, unreadCount, refreshNotifications } = useApp();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-posts' | 'my-offers' | 'notifications' | 'messages'>('dashboard');
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [viewCity, setViewCity] = useState(currentCity);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificationBadgePulse, setNotificationBadgePulse] = useState(false);
  
  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Chat state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatOtherUser, setChatOtherUser] = useState<User | null>(null);
  const [chatPost, setChatPost] = useState<Post | null>(null);
  const [chatOffer, setChatOffer] = useState<Offer | null>(null);

  // Post detail modal for sellers to contact buyers
  const [showPostDetailModal, setShowPostDetailModal] = useState(false);
  const [selectedPostForContact, setSelectedPostForContact] = useState<Post | null>(null);

  // Edit Post Modal state
  const [showEditPostModal, setShowEditPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editPostForm, setEditPostForm] = useState({
    product_name: '',
    category: '',
    brand: '',
    quantity: 1,
    unit: 'pieces',
    fragrance: '',
    details: ''
  });

  // Edit Offer Modal state
  const [showEditOfferModal, setShowEditOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [editOfferForm, setEditOfferForm] = useState({
    price: '',
    notes: ''
  });

  // Sync viewCity with currentCity when it changes
  useEffect(() => {
    if (currentCity && (!viewCity || viewCity.id !== currentCity.id)) {
      setViewCity(currentCity);
    }
  }, [currentCity]);

  useEffect(() => {
    if (viewCity) {
      loadPosts();
    }
  }, [viewCity]);

  // Filter posts when category changes
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(post => post.category === selectedCategory));
    }
  }, [selectedCategory, posts]);

  useEffect(() => {
    if (user) {
      loadMyPosts();
      loadMyOffers();
      refreshNotifications();
    }
  }, [user]);

  // Listen for real-time notification events to navigate to notifications tab
  useEffect(() => {
    const handleViewNotification = (event: CustomEvent<Notification>) => {
      setActiveTab('notifications');
      // Pulse the notification badge
      setNotificationBadgePulse(true);
      setTimeout(() => setNotificationBadgePulse(false), 2000);
    };

    window.addEventListener('viewNotification', handleViewNotification as EventListener);
    return () => {
      window.removeEventListener('viewNotification', handleViewNotification as EventListener);
    };
  }, []);

  // Pulse effect when unread count changes
  useEffect(() => {
    if (unreadCount > 0) {
      setNotificationBadgePulse(true);
      setTimeout(() => setNotificationBadgePulse(false), 2000);
    }
  }, [unreadCount]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
      if (!target.closest('.city-dropdown-container')) {
        setShowCityDropdown(false);
      }
      if (!target.closest('.category-dropdown-container')) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);


  const loadPosts = async () => {
    if (!viewCity) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, user:users(*), city:cities(*)')
        .eq('city_id', viewCity.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading posts:', error);
        return;
      }
      
      console.log('Loaded posts with user data:', data);
      if (data) {
        setPosts(data);
        // Apply category filter
        if (selectedCategory === 'all') {
          setFilteredPosts(data);
        } else {
          setFilteredPosts(data.filter(post => post.category === selectedCategory));
        }
      }
    } catch (err) {
      console.error('Error loading posts:', err);
    }
  };


  const loadMyPosts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('posts')
      .select('*, city:cities(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMyPosts(data);
  };

  const loadMyOffers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('offers')
      .select('*, post:posts(*, user:users(*), city:cities(*))')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMyOffers(data);
  };

  const loadOffers = async (postId: string) => {
    const { data, error } = await supabase
      .from('offers')
      .select('*, seller:users(*, city:cities(*))')
      .eq('post_id', postId)
      .order('price', { ascending: true });
    
    if (error) {
      console.error('Error loading offers:', error);
      return;
    }
    
    console.log('Loaded offers with seller data:', data);
    if (data) setOffers(data);
  };


  const handleSubmitOffer = async () => {
    if (!selectedPost || !offerPrice || !user) return;

    setIsLoading(true);
    try {
      const { data: offer, error } = await supabase
        .from('offers')
        .insert({
          post_id: selectedPost.id,
          seller_id: user.id,
          price: parseFloat(offerPrice),
          notes: offerNotes
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('posts')
        .update({ offer_count: (selectedPost.offer_count || 0) + 1 })
        .eq('id', selectedPost.id);

      await supabase
        .from('notifications')
        .insert({
          user_id: selectedPost.user_id,
          type: 'new_offer',
          title: 'New Offer Received!',
          message: `${user.firm_name || 'A seller'} submitted an offer of ₹${offerPrice} for your ${selectedPost.product_name} requirement`,
          post_id: selectedPost.id,
          offer_id: offer.id
        });

      setShowOfferModal(false);
      setOfferPrice('');
      setOfferNotes('');
      setSuccessMessage('Your offer has been submitted successfully!');
      setShowSuccessPopup(true);
      loadPosts();
      loadMyOffers();
    } catch (err) {
      console.error('Error submitting offer:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewOffers = async (post: Post) => {
    setSelectedPost(post);
    await loadOffers(post.id);
    setActiveTab('my-posts');
  };

  // Open chat with seller (for buyers viewing offers)
  const handleOpenChatWithSeller = async (offer: Offer, post: Post | null) => {
    if (!user || !post) {
      console.error('Cannot open chat - missing user or post:', { user: !!user, post: !!post });
      return;
    }
    
    // If seller data is not available, fetch it
    let sellerData = offer.seller;
    if (!sellerData) {
      console.log('Seller data not available, fetching from database...');
      const { data, error } = await supabase
        .from('users')
        .select('*, city:cities(*)')
        .eq('id', offer.seller_id)
        .single();
      
      if (error || !data) {
        console.error('Failed to fetch seller data:', error);
        alert('Unable to load seller information. Please try again.');
        return;
      }
      sellerData = data;
    }
    
    console.log('Opening chat with seller:', sellerData);
    setChatOtherUser(sellerData);
    setChatPost(post);
    setChatOffer(offer);
    setShowChatModal(true);
    setSelectedOffer(null); // Close the offer detail modal
  };


  const handleOpenChatWithBuyer = async (post: Post) => {
    if (!user) return;
    
    // If user data is not loaded, fetch it
    let buyerUser = post.user;
    if (!buyerUser) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', post.user_id)
        .single();
      buyerUser = data;
    }
    
    if (!buyerUser) {
      console.error('Could not load buyer data');
      return;
    }
    
    setChatOtherUser(buyerUser);
    setChatPost(post);
    setChatOffer(null);
    setShowChatModal(true);
    setShowPostDetailModal(false);
  };

  // Handle call button click
  const handleCall = (mobile: string) => {
    if (mobile) {
      window.location.href = `tel:${mobile}`;
    }
  };

  // Open post detail modal for sellers to contact buyer
  const handleViewPostDetail = async (post: Post) => {
    // If user data is not loaded, fetch it
    if (!post.user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', post.user_id)
        .single();
      if (data) {
        post.user = data;
      }
    }
    setSelectedPostForContact(post);
    setShowPostDetailModal(true);
  };

  // Edit Post Functions
  const handleOpenEditPost = (post: Post) => {
    setEditingPost(post);
    setEditPostForm({
      product_name: post.product_name || '',
      category: post.category || '',
      brand: post.brand || '',
      quantity: post.quantity || 1,
      unit: post.unit || 'pieces',
      fragrance: post.fragrance || '',
      details: post.details || ''
    });
    setShowEditPostModal(true);
  };

  const handleUpdatePost = async () => {
    if (!editingPost || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          product_name: editPostForm.product_name,
          category: editPostForm.category,
          brand: editPostForm.brand,
          quantity: editPostForm.quantity,
          unit: editPostForm.unit,
          fragrance: editPostForm.fragrance,
          details: editPostForm.details,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      // Get all sellers who submitted offers on this post
      const { data: offersData } = await supabase
        .from('offers')
        .select('seller_id')
        .eq('post_id', editingPost.id);

      // Send notifications to all sellers who submitted offers
      if (offersData && offersData.length > 0) {
        const notificationPromises = offersData.map(offer => 
          supabase.from('notifications').insert({
            user_id: offer.seller_id,
            type: 'post_updated',
            title: 'Requirement Updated!',
            message: `The buyer has updated their requirement for "${editPostForm.product_name}". Please review the changes.`,
            post_id: editingPost.id
          })
        );
        await Promise.all(notificationPromises);
      }

      setShowEditPostModal(false);
      setEditingPost(null);
      setSuccessMessage('Your post has been updated successfully! Sellers have been notified.');
      setShowSuccessPopup(true);
      loadMyPosts();
      loadPosts();
    } catch (err) {
      console.error('Error updating post:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Edit Offer Functions
  const handleOpenEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    setEditOfferForm({
      price: offer.price.toString(),
      notes: offer.notes || ''
    });
    setShowEditOfferModal(true);
  };

  const handleUpdateOffer = async () => {
    if (!editingOffer || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('offers')
        .update({
          price: parseFloat(editOfferForm.price),
          notes: editOfferForm.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingOffer.id);

      if (error) throw error;

      // Get the post owner to notify them
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id, product_name')
        .eq('id', editingOffer.post_id)
        .single();

      // Send notification to the buyer (post owner)
      if (postData) {
        await supabase.from('notifications').insert({
          user_id: postData.user_id,
          type: 'offer_updated',
          title: 'Offer Updated!',
          message: `${user.firm_name || 'A seller'} has updated their offer to ₹${editOfferForm.price} for your "${postData.product_name}" requirement.`,
          post_id: editingOffer.post_id,
          offer_id: editingOffer.id
        });
      }

      setShowEditOfferModal(false);
      setEditingOffer(null);
      setSuccessMessage('Your offer has been updated successfully! The buyer has been notified.');
      setShowSuccessPopup(true);
      loadMyOffers();
      if (selectedPost) {
        loadOffers(selectedPost.id);
      }
    } catch (err) {
      console.error('Error updating offer:', err);
    } finally {
      setIsLoading(false);
    }
  };


  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get available categories from current posts
  const getAvailableCategories = () => {
    const categories = new Set(posts.map(p => p.category).filter(Boolean));
    return PRODUCT_CATEGORIES.filter(cat => categories.has(cat.value));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden bg-white">
                <img 
                  src="https://d64gsuwffb70l.cloudfront.net/697830e2d2a66a605e53d724_1769759333132_e7d1e864.jpg" 
                  alt="hoko logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-bold text-gray-800">hoko</span>
            </div>


            <div className="flex items-center gap-2 sm:gap-3">
              {/* City selector */}
              <div className="relative city-dropdown-container">
                <button
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <LocationIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700 max-w-16 sm:max-w-24 truncate">
                    {viewCity?.name || 'City'}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                </button>

                {showCityDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 max-h-64 overflow-y-auto z-30">
                    {cities.map(city => (
                      <button
                        key={city.id}
                        onClick={() => {
                          setViewCity(city);
                          setShowCityDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                          viewCity?.id === city.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {city.name}, {city.state}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <button
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <BellIcon className={`w-5 h-5 sm:w-6 sm:h-6 text-gray-600 ${notificationBadgePulse ? 'notification-shake' : ''}`} />
                {unreadCount > 0 && (
                  <span className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center ${notificationBadgePulse ? 'badge-pulse' : 'animate-pulse'}`}>
                    {unreadCount}
                  </span>
                )}
              </button>


              {/* User menu with dropdown */}
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <UserIcon className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline max-w-24 truncate">
                    {user?.firm_name || user?.mobile}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-30">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {user?.firm_name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{user?.mobile}</p>
                      <div className="flex gap-1 mt-2">
                        {user?.is_seller && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                            Seller
                          </span>
                        )}
                        {user?.is_buyer && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                            Buyer
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Switch to Buyer Mode - for sellers */}
                    {user?.is_seller && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onSwitchToBuyerMode();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                      >
                        <CartIcon className="w-4 h-4" />
                        Post as Buyer
                      </button>
                    )}
                    
                    {!user?.is_seller && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onRegisterSeller();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <ShopIcon className="w-4 h-4" />
                        Register as Seller
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogoutIcon className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="bg-white border-b sticky top-16 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => { setActiveTab('dashboard'); setSelectedPost(null); }}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <GridIcon className="w-4 h-4" />
                City Dashboard
              </div>
            </button>
            <button
              onClick={() => { setActiveTab('my-posts'); setSelectedPost(null); }}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'my-posts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <TagIcon className="w-4 h-4" />
                My Posts
              </div>
            </button>
            {user?.is_seller && (
              <button
                onClick={() => { setActiveTab('my-offers'); setSelectedPost(null); }}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'my-offers'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <OfferIcon className="w-4 h-4" />
                  My Offers
                </div>
              </button>
            )}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'notifications'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <BellIcon className="w-4 h-4" />
                Notifications
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Dashboard view */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                  {viewCity?.name} Dashboard
                </h2>
                <p className="text-gray-500 text-sm">
                  {filteredPosts.length} {selectedCategory !== 'all' ? 'filtered ' : ''}requirement{filteredPosts.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Category Filter Dropdown */}
                <div className="relative category-dropdown-container">
                  <button
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <TagIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700 max-w-32 truncate">
                      {selectedCategory === 'all' ? 'All Categories' : getCategoryLabel(selectedCategory)}
                    </span>
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  </button>

                  {showCategoryDropdown && (
                    <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 max-h-80 overflow-y-auto z-30">
                      <button
                        onClick={() => {
                          setSelectedCategory('all');
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                          selectedCategory === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        All Categories
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      {PRODUCT_CATEGORIES.map(cat => (
                        <button
                          key={cat.value}
                          onClick={() => {
                            setSelectedCategory(cat.value);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                            selectedCategory === cat.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {user?.is_seller && (
                  <button
                    onClick={onSwitchToBuyerMode}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
                  >
                    <CartIcon className="w-5 h-5" />
                    <span>Post as Buyer</span>
                  </button>
                )}
                {!user?.is_seller && (
                  <button
                    onClick={onRegisterSeller}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors"
                  >
                    <ShopIcon className="w-5 h-5" />
                    <span>Register as Seller</span>
                  </button>
                )}
                <button
                  onClick={onNewPost}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">New Requirement</span>
                </button>
              </div>
            </div>

            {/* Active category filter indicator */}
            {selectedCategory !== 'all' && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-gray-500">Filtering by:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full flex items-center gap-2">
                  {getCategoryLabel(selectedCategory)}
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
            )}

            {filteredPosts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GridIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {selectedCategory !== 'all' ? 'No requirements in this category' : 'No requirements yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {selectedCategory !== 'all' 
                    ? `No posts found in ${getCategoryLabel(selectedCategory)} category`
                    : `Be the first to post a requirement in ${viewCity?.name}`
                  }
                </p>
                {selectedCategory !== 'all' ? (
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    Show All Categories
                  </button>
                ) : (
                  <button
                    onClick={onNewPost}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Post Your Requirement
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map(post => (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                          {post.brand || 'Any Brand'}
                        </span>
                        {post.category && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
                            {getCategoryLabel(post.category)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(post.created_at)}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {post.product_name}
                    </h3>

                    <div className="space-y-1 mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Qty:</span> {post.quantity} {post.unit}
                      </p>
                      {post.fragrance && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Fragrance:</span> {post.fragrance}
                        </p>
                      )}
                      {post.details && (
                        <p className="text-sm text-gray-500 line-clamp-2">{post.details}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="text-sm text-gray-600">
                          {post.offer_count || 0} offer{post.offer_count !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {user?.is_seller && post.user_id !== user.id && (
                        <div className="flex gap-2">
                          {/* Contact Buyer button */}
                          <button
                            onClick={() => handleViewPostDetail(post)}
                            className="px-3 py-2 bg-blue-100 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors"
                            title="Contact Buyer"
                          >
                            <ChatIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPost(post);
                              setShowOfferModal(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Submit Offer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Posts view */}
        {activeTab === 'my-posts' && !selectedPost && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">My Posts</h2>
              <button
                onClick={onNewPost}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="hidden sm:inline">New Post</span>
              </button>
            </div>

            {myPosts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TagIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No posts yet</h3>
                <p className="text-gray-500 mb-6">Create your first requirement post</p>
                <button
                  onClick={onNewPost}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Create Post
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myPosts.map(post => (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => handleViewOffers(post)}>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {post.product_name}
                          </h3>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {post.city?.name}
                          </span>
                          {post.category && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                              {getCategoryLabel(post.category)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {post.brand || 'Any Brand'} • {post.quantity} {post.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {/* Edit button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditPost(post);
                          }}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Post"
                        >
                          <EditIcon className="w-5 h-5" />
                        </button>
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            (post.offer_count || 0) > 0
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {post.offer_count || 0} offer{post.offer_count !== 1 ? 's' : ''}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(post.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Offers view for selected post */}
        {activeTab === 'my-posts' && selectedPost && (
          <div>
            <button
              onClick={() => setSelectedPost(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to My Posts
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{selectedPost.product_name}</h2>
                  <p className="text-gray-600">
                    {selectedPost.brand || 'Any Brand'} • {selectedPost.quantity} {selectedPost.unit}
                  </p>
                  {selectedPost.category && (
                    <span className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-600 text-sm rounded-full">
                      {getCategoryLabel(selectedPost.category)}
                    </span>
                  )}
                  {selectedPost.details && (
                    <p className="text-gray-500 mt-2">{selectedPost.details}</p>
                  )}
                </div>
                <button
                  onClick={() => handleOpenEditPost(selectedPost)}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <EditIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Edit</span>
                </button>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Offers Received ({offers.length})
            </h3>

            {offers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl">
                <p className="text-gray-500">No offers received yet. Please wait for sellers to respond.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer, index) => (

                  <div
                    key={offer.id}
                    className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow ${
                      index === 0 ? 'border-green-200 bg-green-50' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          index === 0 ? 'bg-green-200' : 'bg-gray-200'
                        }`}>
                          <ShopIcon className={`w-6 h-6 ${index === 0 ? 'text-green-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800">
                            {offer.seller?.firm_name || 'Seller'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {offer.seller?.manager_name}
                          </p>
                          {/* Seller location */}
                          {offer.seller?.city && (
                            <div className="flex items-center gap-1 mt-1">
                              <LocationIcon className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {offer.seller.city.name}, {offer.seller.city.state}
                              </span>
                            </div>
                          )}
                          {/* Seller mobile */}
                          {offer.seller?.mobile && (
                            <div className="flex items-center gap-1 mt-1">
                              <PhoneIcon className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {offer.seller.mobile}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p className={`text-xl font-bold ${index === 0 ? 'text-green-600' : 'text-gray-800'}`}>
                          ₹{offer.price}
                        </p>
                        {index === 0 && (
                          <span className="text-xs text-green-600 font-medium">Lowest Price</span>
                        )}
                        {offer.updated_at && offer.updated_at !== offer.created_at && (
                          <span className="text-xs text-orange-500 font-medium block">Updated</span>
                        )}
                      </div>
                    </div>
                    
                    {offer.notes && (
                      <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                        {offer.notes}
                      </p>
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleOpenChatWithSeller(offer, selectedPost)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                      >
                        <ChatIcon className="w-4 h-4" />
                        Chat
                      </button>
                      <a
                        href={`tel:${offer.seller?.mobile}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <PhoneIcon className="w-4 h-4" />
                        Call
                      </a>
                      <button
                        onClick={() => setSelectedOffer(offer)}
                        className="px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* My Offers view (for sellers) */}
        {activeTab === 'my-offers' && (
          <div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">My Offers</h2>
              <p className="text-gray-500 text-sm">{myOffers.length} offer{myOffers.length !== 1 ? 's' : ''} submitted</p>
            </div>

            {myOffers.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <OfferIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No offers yet</h3>
                <p className="text-gray-500 mb-6">Browse the dashboard to find requirements and submit offers</p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Browse Requirements
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myOffers.map(offer => (
                  <div
                    key={offer.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {offer.post?.product_name}
                          </h3>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {offer.post?.city?.name}
                          </span>
                          {offer.post?.category && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                              {getCategoryLabel(offer.post.category)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {offer.post?.brand || 'Any Brand'} • {offer.post?.quantity} {offer.post?.unit}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="bg-green-50 px-3 py-1.5 rounded-lg">
                            <span className="text-sm text-gray-500">Your Offer: </span>
                            <span className="text-lg font-bold text-green-600">₹{offer.price}</span>
                          </div>
                          {offer.notes && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              Note: {offer.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {/* Edit Offer button */}
                        <button
                          onClick={() => handleOpenEditOffer(offer)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Offer"
                        >
                          <EditIcon className="w-5 h-5" />
                        </button>
                        {/* Chat with Buyer button */}
                        <button
                          onClick={() => {
                            if (offer.post) {
                              handleOpenChatWithBuyer(offer.post);
                            }
                          }}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Chat with Buyer"
                        >
                          <ChatIcon className="w-5 h-5" />
                        </button>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">
                            {formatDate(offer.created_at)}
                          </p>
                          {offer.updated_at && offer.updated_at !== offer.created_at && (
                            <span className="text-xs text-orange-500 font-medium">Updated</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications view */}
        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Notifications</h2>

            {notifications.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BellIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No notifications</h3>
                <p className="text-gray-500">You'll see notifications here when sellers respond to your posts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={async () => {
                      if (!notification.is_read) {
                        await supabase
                          .from('notifications')
                          .update({ is_read: true })
                          .eq('id', notification.id);
                        refreshNotifications();
                      }
                      if (notification.post_id) {
                        const post = myPosts.find(p => p.id === notification.post_id);
                        if (post) {
                          handleViewOffers(post);
                        }
                      }
                    }}
                    className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${
                      !notification.is_read ? 'border-blue-200 bg-blue-50' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        !notification.is_read ? 'bg-blue-200' : 'bg-gray-200'
                      }`}>
                        {notification.type === 'new_message' ? (
                          <ChatIcon className={`w-5 h-5 ${!notification.is_read ? 'text-blue-600' : 'text-gray-500'}`} />
                        ) : notification.type === 'post_updated' ? (
                          <EditIcon className={`w-5 h-5 ${!notification.is_read ? 'text-blue-600' : 'text-gray-500'}`} />
                        ) : notification.type === 'offer_updated' ? (
                          <OfferIcon className={`w-5 h-5 ${!notification.is_read ? 'text-blue-600' : 'text-gray-500'}`} />
                        ) : (
                          <BellIcon className={`w-5 h-5 ${!notification.is_read ? 'text-blue-600' : 'text-gray-500'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">{formatDate(notification.created_at)}</p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Offer modal */}
      {showOfferModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Submit Your Offer</h3>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="font-medium text-gray-800">{selectedPost.product_name}</p>
              <p className="text-sm text-gray-600">
                {selectedPost.brand || 'Any Brand'} • {selectedPost.quantity} {selectedPost.unit}
              </p>
              {selectedPost.category && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                  {getCategoryLabel(selectedPost.category)}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="Enter your offer price"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={offerNotes}
                  onChange={(e) => setOfferNotes(e.target.value)}
                  placeholder="Add any additional details..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowOfferModal(false);
                  setOfferPrice('');
                  setOfferNotes('');
                }}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOffer}
                disabled={!offerPrice || isLoading}
                className="flex-1 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Submitting...' : 'Submit Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditPostModal && editingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Edit Post</h3>
              <button
                onClick={() => {
                  setShowEditPostModal(false);
                  setEditingPost(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product/Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editPostForm.product_name}
                  onChange={(e) => setEditPostForm({ ...editPostForm, product_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={editPostForm.category}
                  onChange={(e) => setEditPostForm({ ...editPostForm, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                >
                  <option value="">Select a category</option>
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                <input
                  type="text"
                  value={editPostForm.brand}
                  onChange={(e) => setEditPostForm({ ...editPostForm, brand: e.target.value })}
                  placeholder="Any brand"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={editPostForm.quantity}
                    onChange={(e) => setEditPostForm({ ...editPostForm, quantity: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <select
                    value={editPostForm.unit}
                    onChange={(e) => setEditPostForm({ ...editPostForm, unit: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  >
                    <option value="pieces">Pieces</option>
                    <option value="kg">Kg</option>
                    <option value="liters">Liters</option>
                    <option value="boxes">Boxes</option>
                    <option value="cartons">Cartons</option>
                    <option value="units">Units</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fragrance/Variant</label>
                <input
                  type="text"
                  value={editPostForm.fragrance}
                  onChange={(e) => setEditPostForm({ ...editPostForm, fragrance: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Details</label>
                <textarea
                  value={editPostForm.details}
                  onChange={(e) => setEditPostForm({ ...editPostForm, details: e.target.value })}
                  placeholder="Any specific requirements..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                />
              </div>
            </div>

            <div className="bg-orange-50 rounded-xl p-3 mt-4">
              <p className="text-sm text-orange-700">
                <span className="font-medium">Note:</span> All sellers who have submitted offers will be notified about this update.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditPostModal(false);
                  setEditingPost(null);
                }}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePost}
                disabled={!editPostForm.product_name || !editPostForm.category || isLoading}
                className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Offer Modal */}
      {showEditOfferModal && editingOffer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Edit Offer</h3>
              <button
                onClick={() => {
                  setShowEditOfferModal(false);
                  setEditingOffer(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="font-medium text-gray-800">{editingOffer.post?.product_name}</p>
              <p className="text-sm text-gray-600">
                {editingOffer.post?.brand || 'Any Brand'} • {editingOffer.post?.quantity} {editingOffer.post?.unit}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={editOfferForm.price}
                  onChange={(e) => setEditOfferForm({ ...editOfferForm, price: e.target.value })}
                  placeholder="Enter your offer price"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={editOfferForm.notes}
                  onChange={(e) => setEditOfferForm({ ...editOfferForm, notes: e.target.value })}
                  placeholder="Add any additional details..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                />
              </div>
            </div>

            <div className="bg-orange-50 rounded-xl p-3 mt-4">
              <p className="text-sm text-orange-700">
                <span className="font-medium">Note:</span> The buyer will be notified about this update.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditOfferModal(false);
                  setEditingOffer(null);
                }}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOffer}
                disabled={!editOfferForm.price || isLoading}
                className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seller detail modal with Chat and Call buttons */}
      {selectedOffer && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Seller Details</h3>
              <button
                onClick={() => setSelectedOffer(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <ShopIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-800">
                    {selectedOffer.seller?.firm_name || 'Seller'}
                  </p>
                  <p className="text-gray-600">{selectedOffer.seller?.manager_name}</p>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-sm text-green-600 font-medium">Offer Price</p>
                <p className="text-3xl font-bold text-green-600">₹{selectedOffer.price}</p>
                {selectedOffer.updated_at && selectedOffer.updated_at !== selectedOffer.created_at && (
                  <span className="text-xs text-orange-500 font-medium">Updated</span>
                )}
              </div>

              {/* Chat with Seller button */}
              <button
                onClick={() => handleOpenChatWithSeller(selectedOffer, selectedPost)}
                className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <ChatIcon className="w-5 h-5" />
                Chat with Seller
              </button>

              {/* Call Seller button */}
              <a
                href={`tel:${selectedOffer.seller?.mobile}`}
                className="flex items-center justify-center gap-2 w-full py-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
              >
                <PhoneIcon className="w-5 h-5" />
                Call {selectedOffer.seller?.mobile}
              </a>

              {selectedOffer.notes && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Seller's Note:</p>
                  <p className="text-gray-700">{selectedOffer.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post detail modal for sellers to contact buyer */}
      {showPostDetailModal && selectedPostForContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Buyer Details</h3>
              <button
                onClick={() => {
                  setShowPostDetailModal(false);
                  setSelectedPostForContact(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Buyer info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-800">
                    {selectedPostForContact.user?.firm_name || 'Buyer'}
                  </p>
                  <p className="text-gray-600">{selectedPostForContact.user?.manager_name}</p>
                </div>
              </div>

              {/* Requirement details */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-600 font-medium mb-1">Requirement</p>
                <p className="text-lg font-bold text-gray-800">{selectedPostForContact.product_name}</p>
                <p className="text-sm text-gray-600">
                  {selectedPostForContact.brand || 'Any Brand'} • {selectedPostForContact.quantity} {selectedPostForContact.unit}
                </p>
                {selectedPostForContact.category && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                    {getCategoryLabel(selectedPostForContact.category)}
                  </span>
                )}
                {selectedPostForContact.details && (
                  <p className="text-sm text-gray-500 mt-2">{selectedPostForContact.details}</p>
                )}
              </div>

              {/* Chat with Buyer button */}
              <button
                onClick={() => handleOpenChatWithBuyer(selectedPostForContact)}
                className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <ChatIcon className="w-5 h-5" />
                Chat with Buyer
              </button>

              {/* Call Buyer button */}
              <a
                href={`tel:${selectedPostForContact.user?.mobile}`}
                className="flex items-center justify-center gap-2 w-full py-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
              >
                <PhoneIcon className="w-5 h-5" />
                Call {selectedPostForContact.user?.mobile}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && chatOtherUser && chatPost && user && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setChatOtherUser(null);
            setChatPost(null);
            setChatOffer(null);
          }}
          currentUser={user}
          otherUser={chatOtherUser}
          post={chatPost}
          offer={chatOffer || undefined}
        />
      )}

      {/* Success popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Success!</h3>
            <p className="text-gray-600 mb-6">{successMessage}</p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="w-full py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Bottom navigation for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-20">
        <div className="flex justify-around py-2">
          <button
            onClick={() => { setActiveTab('dashboard'); setSelectedPost(null); }}
            className={`flex flex-col items-center p-2 ${
              activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <HomeIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Dashboard</span>
          </button>
          <button
            onClick={() => { setActiveTab('my-posts'); setSelectedPost(null); }}
            className={`flex flex-col items-center p-2 ${
              activeTab === 'my-posts' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <TagIcon className="w-6 h-6" />
            <span className="text-xs mt-1">My Posts</span>
          </button>
          <button
            onClick={onNewPost}
            className="flex flex-col items-center p-2 -mt-4"
          >
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <PlusIcon className="w-6 h-6 text-white" />
            </div>
          </button>
          {user?.is_seller && (
            <button
              onClick={() => { setActiveTab('my-offers'); setSelectedPost(null); }}
              className={`flex flex-col items-center p-2 ${
                activeTab === 'my-offers' ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <OfferIcon className="w-6 h-6" />
              <span className="text-xs mt-1">My Offers</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex flex-col items-center p-2 relative ${
              activeTab === 'notifications' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <BellIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Alerts</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {!user?.is_seller && (
            <button
              onClick={onLogout}
              className="flex flex-col items-center p-2 text-gray-500"
            >
              <LogoutIcon className="w-6 h-6" />
              <span className="text-xs mt-1">Logout</span>
            </button>
          )}
        </div>
      </nav>

      {/* Add padding for bottom nav on mobile */}
      <div className="h-20 md:hidden"></div>
    </div>
  );
};

export default Dashboard;
