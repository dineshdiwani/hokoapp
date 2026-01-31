import React, { useState, useEffect, useRef } from 'react';
import { useApp, AppProvider } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import WelcomePage from './WelcomePage';
import ProductDetailsPage from './ProductDetailsPage';
import OTPLoginPage from './OTPLoginPage';
import Dashboard from './Dashboard';
import PostSuccessPopup from './PostSuccessPopup';

type AppScreen = 'welcome' | 'product-details' | 'login' | 'seller-login' | 'buyer-login' | 'dashboard';

const AppContent: React.FC = () => {
  const { 
    user, 
    setUser, 
    currentCity, 
    setCurrentCity,
    productRequirement, 
    setProductRequirement,
    isLoading
  } = useApp();
  
  const [screen, setScreen] = useState<AppScreen>('welcome');
  const [productName, setProductName] = useState('');
  const [showPostSuccess, setShowPostSuccess] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [pendingPost, setPendingPost] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const postCreatedRef = useRef(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    if (user && currentCity && screen === 'welcome') {
      setScreen('dashboard');
    }
  }, [user, currentCity]);

  // Create post when user logs in and there's a pending post
  useEffect(() => {
    const createPendingPost = async () => {
      if (pendingPost && user && user.city_id && productName && !postCreatedRef.current) {
        postCreatedRef.current = true;
        setIsSubmittingPost(true);
        
        try {
          // TODO: Upload attachments to storage if needed
          // For now, we'll just create the post without attachments
          // In a production app, you'd upload files to Supabase Storage first
          
          const { error } = await supabase
            .from('posts')
            .insert({
              user_id: user.id,
              city_id: user.city_id,
              product_name: productName,
              category: productRequirement.category || null,
              brand: productRequirement.brand || null,
              quantity: productRequirement.quantity || 1,
              unit: productRequirement.unit || 'pieces',
              fragrance: productRequirement.fragrance || null,
              details: productRequirement.details || null,
              status: 'active',
              offer_count: 0
            });

          if (!error) {
            setShowPostSuccess(true);
          } else {
            console.error('Error creating post:', error);
          }
        } catch (err) {
          console.error('Error creating post:', err);
        } finally {
          setIsSubmittingPost(false);
          setPendingPost(false);
          setAttachments([]);
        }
      }
    };

    createPendingPost();
  }, [pendingPost, user, productName, productRequirement]);

  const handleProductSubmit = (name: string) => {
    setProductName(name);
    setProductRequirement({
      ...productRequirement,
      productName: name
    });
    setScreen('product-details');
  };

  const handleProductDetailsSubmit = async (files?: File[]) => {
    if (files) {
      setAttachments(files);
    }
    
    // Check if user is already logged in
    if (user && user.city_id) {
      // User is logged in - create post directly
      postCreatedRef.current = false;
      setPendingPost(true);
      setScreen('dashboard');
    } else {
      // User not logged in - go to login
      setScreen('login');
    }
  };

  const handleLoginSuccess = () => {
    // Mark that we have a pending post to create
    if (productName) {
      postCreatedRef.current = false;
      setPendingPost(true);
    }
    setScreen('dashboard');
  };

  const handleSellerLoginSuccess = () => {
    setScreen('dashboard');
  };

  const handleBuyerLoginSuccess = () => {
    // Direct buyer login - go to dashboard without creating a post
    setScreen('dashboard');
  };

  const handleNewPost = () => {
    // Reset product requirement but keep user logged in
    setProductRequirement({
      productName: '',
      category: '',
      brand: '',
      quantity: 1,
      unit: 'pieces',
      fragrance: '',
      details: ''
    });
    setProductName('');
    setAttachments([]);
    postCreatedRef.current = false;
    setScreen('welcome');
  };


  const handleLogout = () => {
    sessionStorage.removeItem('hoko_user');
    setUser(null);
    setCurrentCity(null);
    setProductRequirement({
      productName: '',
      category: '',
      brand: '',
      quantity: 1,
      unit: 'pieces',
      fragrance: '',
      details: ''
    });
    setProductName('');
    setAttachments([]);
    setPendingPost(false);
    postCreatedRef.current = false;
    setScreen('welcome');
  };


  const handleRegisterSeller = () => {
    // Check if user is already logged in
    if (user) {
      // User is logged in - update to seller directly
      // This would need a separate flow to update user to seller
      // For now, go to seller login to complete seller profile
      setScreen('seller-login');
    } else {
      setScreen('seller-login');
    }
  };

  const handleLoginAsBuyer = () => {
    // Check if user is already logged in
    if (user && currentCity) {
      // Already logged in as buyer, go to dashboard
      setScreen('dashboard');
    } else {
      setScreen('buyer-login');
    }
  };

  const handleClosePostSuccess = () => {
    setShowPostSuccess(false);
    // Reset product data
    setProductName('');
    setAttachments([]);
    setProductRequirement({
      productName: '',
      category: '',
      brand: '',
      quantity: 1,
      unit: 'pieces',
      fragrance: '',
      details: ''
    });
  };


  // Handle switch to buyer mode from dashboard (for sellers)
  const handleSwitchToBuyerMode = () => {
    // Reset product requirement and go to welcome page to create a new post
    // User stays logged in
    setProductRequirement({
      productName: '',
      category: '',
      brand: '',
      quantity: 1,
      unit: 'pieces',
      fragrance: '',
      details: ''
    });
    setProductName('');
    setAttachments([]);
    postCreatedRef.current = false;
    setScreen('welcome');
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading hoko...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {screen === 'welcome' && (
        <WelcomePage 
          onSubmit={handleProductSubmit}
          onRegisterSeller={handleRegisterSeller}
          onLoginAsBuyer={handleLoginAsBuyer}
        />
      )}

      {screen === 'product-details' && (
        <ProductDetailsPage
          productName={productName}
          onBack={() => setScreen('welcome')}
          onSubmit={handleProductDetailsSubmit}
        />
      )}

      {screen === 'login' && (
        <OTPLoginPage
          onBack={() => setScreen('product-details')}
          onSuccess={handleLoginSuccess}
          isSeller={false}
        />
      )}

      {screen === 'seller-login' && (
        <OTPLoginPage
          onBack={() => setScreen('welcome')}
          onSuccess={handleSellerLoginSuccess}
          isSeller={true}
        />
      )}

      {screen === 'buyer-login' && (
        <OTPLoginPage
          onBack={() => setScreen('welcome')}
          onSuccess={handleBuyerLoginSuccess}
          isSeller={false}
        />
      )}

      {screen === 'dashboard' && user && (
        <Dashboard
          key={user.id}
          onNewPost={handleNewPost}
          onLogout={handleLogout}
          onRegisterSeller={handleRegisterSeller}
          onSwitchToBuyerMode={handleSwitchToBuyerMode}
        />
      )}

      {/* Post success popup */}
      {showPostSuccess && currentCity && (
        <PostSuccessPopup
          cityName={currentCity.name}
          onClose={handleClosePostSuccess}
        />
      )}

      {/* Loading overlay for post submission */}
      {isSubmittingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700">Posting your requirement...</p>
          </div>
        </div>
      )}
    </>
  );
};

const AppLayout: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default AppLayout;
