import React, { useState, useEffect, useRef } from 'react';
import { useApp, AppProvider } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import WelcomePage from './WelcomePage';
import ProductDetailsPage from './ProductDetailsPage';
import OTPLoginPage from './OTPLoginPage';
import Dashboard from './Dashboard';
import PostSuccessPopup from './PostSuccessPopup';

type AppScreen =
  | 'welcome'
  | 'product-details'
  | 'login'
  | 'seller-login'
  | 'buyer-login'
  | 'dashboard';

const AppContent: React.FC = () => {
  const {
    user,
    setUser,
    currentCity,
    setCurrentCity,
    productRequirement,
    setProductRequirement,
    isLoading,
  } = useApp();

  const [screen, setScreen] = useState<AppScreen>('welcome');
  const [productName, setProductName] = useState('');
  const [showPostSuccess, setShowPostSuccess] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [pendingPost, setPendingPost] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const postCreatedRef = useRef(false);

  /* ----------------------------------
     Redirect logged-in users
  -----------------------------------*/
  useEffect(() => {
    if (user && currentCity && screen === 'welcome') {
      setScreen('dashboard');
    }
  }, [user, currentCity, screen]);

  /* ----------------------------------
     CREATE POST (WITH ATTACHMENTS)
  -----------------------------------*/
  useEffect(() => {
    const createPendingPost = async () => {
      if (
        !pendingPost ||
        !user ||
        !currentCity?.id ||
        !productName ||
        postCreatedRef.current
      ) {
        return;
      }

      postCreatedRef.current = true;
      setIsSubmittingPost(true);

      try {
        /* 1️⃣ Upload attachments */
        let attachmentUrls: string[] = [];

        if (attachments.length > 0) {
          for (const file of attachments) {
            const ext = file.name.split('.').pop();
            const filePath = `posts/${user.id}/${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}.${ext}`;

            const { error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
              .from('attachments')
              .getPublicUrl(filePath);

            attachmentUrls.push(data.publicUrl);
          }
        }

        /* 2️⃣ Insert post with attachment URLs */
        const { error } = await supabase.from('posts').insert({
          user_id: user.id,
          city_id: currentCity.id,
          product_name: productName,
          category: productRequirement.category || null,
          brand: productRequirement.brand || null,
          quantity: productRequirement.quantity || 1,
          unit: productRequirement.unit || 'pieces',
          fragrance: productRequirement.fragrance || null,
          details: productRequirement.details || null,
          status: 'active',
          offer_count: 0,
          attachment_urls: attachmentUrls, // ✅ KEY FIX
        });

        if (error) {
          console.error('Error creating post:', error);
        } else {
          setShowPostSuccess(true);
        }
      } catch (err) {
        console.error('Post creation failed:', err);
      } finally {
        setIsSubmittingPost(false);
        setPendingPost(false);
        setAttachments([]);
      }
    };

    createPendingPost();
  }, [pendingPost, user, currentCity, productName, productRequirement, attachments]);

  /* ----------------------------------
     Handlers
  -----------------------------------*/
  const handleProductSubmit = (name: string) => {
    setProductName(name);
    setProductRequirement({ ...productRequirement, productName: name });
    setScreen('product-details');
  };

  const handleProductDetailsSubmit = async (files?: File[]) => {
    if (files) setAttachments(files);

    if (user && currentCity?.id) {
      postCreatedRef.current = false;
      setPendingPost(true);
      setScreen('dashboard');
    } else {
      setScreen('login');
    }
  };

  const handleLoginSuccess = () => {
    if (productName) {
      postCreatedRef.current = false;
      setPendingPost(true);
    }
    setScreen('dashboard');
  };

  const handleSellerLoginSuccess = () => setScreen('dashboard');
  const handleBuyerLoginSuccess = () => setScreen('dashboard');

  const handleNewPost = () => {
    setProductRequirement({
      productName: '',
      category: '',
      brand: '',
      quantity: 1,
      unit: 'pieces',
      fragrance: '',
      details: '',
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
      details: '',
    });
    setProductName('');
    setAttachments([]);
    setPendingPost(false);
    postCreatedRef.current = false;
    setScreen('welcome');
  };

  const handleRegisterSeller = () => setScreen('seller-login');

  const handleLoginAsBuyer = () => {
    if (user && currentCity) setScreen('dashboard');
    else setScreen('buyer-login');
  };

  const handleClosePostSuccess = () => {
    setShowPostSuccess(false);
    setProductName('');
    setAttachments([]);
    setProductRequirement({
      productName: '',
      category: '',
      brand: '',
      quantity: 1,
      unit: 'pieces',
      fragrance: '',
      details: '',
    });
  };

  const handleSwitchToBuyerMode = () => {
    setProductRequirement({
      productName: '',
      category: '',
      brand: '',
      quantity: 1,
      unit: 'pieces',
      fragrance: '',
      details: '',
    });
    setProductName('');
    setAttachments([]);
    postCreatedRef.current = false;
    setScreen('welcome');
  };

  /* ----------------------------------
     UI
  -----------------------------------*/
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading hoko…</div>;
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

      {showPostSuccess && currentCity && (
        <PostSuccessPopup
          cityName={currentCity.name}
          onClose={handleClosePostSuccess}
        />
      )}

      {isSubmittingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl">
            Posting your requirement…
          </div>
        </div>
      )}
    </>
  );
};

const AppLayout: React.FC = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default AppLayout;
