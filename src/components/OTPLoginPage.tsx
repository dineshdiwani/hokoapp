import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeftIcon, PhoneIcon, CheckIcon, LocationIcon } from './icons/Icons';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { PRODUCT_CATEGORIES } from '@/constants/categories';

interface OTPLoginPageProps {
  onBack: () => void;
  onSuccess: () => void;
  isSeller?: boolean;
}

const OTPLoginPage: React.FC<OTPLoginPageProps> = ({ onBack, onSuccess, isSeller = false }) => {
  const { cities, setUser, setCurrentCity } = useApp();
  const [step, setStep] = useState<'phone' | 'otp' | 'city' | 'seller-profile'>('phone');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [selectedCity, setSelectedCity] = useState('');
  const [firmName, setFirmName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOTP = async () => {
    if (mobile.length !== 10) { 
      setError('Please enter a valid 10-digit mobile number'); 
      return; 
    }
    setIsLoading(true);
    setError('');
    setStatusMessage('Sending OTP...');
    setGeneratedOtp('');
    setOtpExpiresAt(null);
    
    console.log('[OTP] Starting OTP send for:', mobile);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-otp', {
        body: { mobile }
      });
      console.log('[OTP] Response:', data, invokeError);
      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to send OTP');
      }
      if (data?.success) {
        if (data.demo_otp) {
          const otpValue = String(data.demo_otp).trim();
          setGeneratedOtp(otpValue);
          console.log('[OTP] OTP stored:', otpValue, 'Length:', otpValue.length);
          if (data.expires_at) {
            setOtpExpiresAt(new Date(data.expires_at));
          } else {
            setOtpExpiresAt(new Date(Date.now() + 5 * 60 * 1000));
          }
        }
        setStatusMessage('');
        setOtp(['', '', '', '', '', '']);
        setStep('otp');
        setCountdown(60);
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 100);
      } else {
        throw new Error(data?.error || 'Failed to send OTP');
      }
    } catch (err: any) { 
      console.error('[OTP] Error:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your internet connection and try again.');
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.message || 'Failed to send OTP. Please try again.');
      }
      setStatusMessage('');
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^*$/.test(value)) return;
    const digit = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (error) setError('');
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(//g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      const nextEmptyIndex = newOtp.findIndex(d => !d);
      if (nextEmptyIndex !== -1) {
        otpRefs.current[nextEmptyIndex]?.focus();
      } else {
        otpRefs.current[5]?.focus();
      }
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) { 
      setError('Please enter complete 6-digit OTP'); 
      return; 
    }
    setIsLoading(true); 
    setError('');
    setStatusMessage('Verifying OTP...');
    
    console.log('[OTP Verify] Entered OTP:', otpString);
    console.log('[OTP Verify] Stored OTP:', generatedOtp);
    console.log('[OTP Verify] Expiry:', otpExpiresAt);
    try {
      if (generatedOtp) {
        const storedOtp = String(generatedOtp).trim();
        const enteredOtp = String(otpString).trim();
        if (enteredOtp === storedOtp) {
          const now = new Date();
          const isNotExpired = !otpExpiresAt || otpExpiresAt > now;
          if (isNotExpired) {
            setStatusMessage('');
            setIsLoading(false);
            setStep(isSeller ? 'seller-profile' : 'city');
            return;
          } else {
            setError('OTP has expired. Please request a new one.');
            setStatusMessage('');
            setIsLoading(false);
            return;
          }
        }
      }
      const { data: otpData, error: otpError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('mobile', mobile)
        .eq('otp', otpString)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (otpError || !otpData) {
        throw new Error('Invalid or expired OTP. Please check and try again.');
      }
      supabase.from('otp_verifications').update({ verified: true }).eq('id', otpData.id).then(() => {
        console.log('[OTP Verify] Marked as verified in database');
      });
      setStatusMessage('');
      setStep(isSeller ? 'seller-profile' : 'city');
    } catch (err: any) { 
      console.error('[OTP Verify] Error:', err);
      setError(err.message || 'Invalid OTP. Please try again.'); 
      setStatusMessage('');
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleCitySelect = async () => {
    if (!selectedCity) { 
      setError('Please select your city'); 
      return; 
    }
    setIsLoading(true); 
    setError('');
    setStatusMessage('Setting up your account...');
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('mobile', mobile)
        .single();
        
      let user;
      if (existingUser) {
        const { data: updatedUser } = await supabase
          .from('users')
          .update({ city_id: selectedCity, is_buyer: true })
          .eq('id', existingUser.id)
          .select('*')
          .single();
        user = updatedUser;
      } else {
        const { data: newUser } = await supabase
          .from('users')
          .insert({ mobile, city_id: selectedCity, is_buyer: true, is_seller: false })
          .select('*')
          .single();
        user = newUser;
      }
      setUser(user);
      const city = cities.find(c => c.id === selectedCity);
      if (city) setCurrentCity(city);
      setStatusMessage('');
      onSuccess();
    } catch (err: any) { 
      setError(err.message || 'Failed to complete registration'); 
      setStatusMessage('');
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleSellerProfile = async () => {
    if (!firmName.trim() || !managerName.trim() || !selectedCity || !selectedCategory) { 
      setError('Please fill all fields'); 
      return; 
    }
    setIsLoading(true); 
    setError('');
    setStatusMessage('Creating your seller profile...');
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('mobile', mobile)
        .single();
        
      let user;
      if (existingUser) {
        const { data: updatedUser } = await supabase
          .from('users')
          .update({ 
            city_id: selectedCity, 
            is_seller: true, 
            firm_name: firmName, 
            manager_name: managerName,
            business_category: selectedCategory
          })
          .eq('id', existingUser.id)
          .select('*')
          .single();
        user = updatedUser;
      } else {
        const { data: newUser } = await supabase
          .from('users')
          .insert({ 
            mobile, 
            city_id: selectedCity, 
            is_buyer: false, 
            is_seller: true, 
            firm_name: firmName, 
            manager_name: managerName,
            business_category: selectedCategory
          })
          .select('*')
          .single();
        user = newUser;
      }
      setUser(user);
      const city = cities.find(c => c.id === selectedCity);
      if (city) setCurrentCity(city);
      setStatusMessage('');
      onSuccess();
    } catch (err: any) { 
      setError(err.message || 'Failed to complete registration'); 
      setStatusMessage('');
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button onClick={onBack} className="mb-6 p-2 text-white/80 hover:text-white flex items-center gap-2">
          <ArrowLeftIcon className="w-5 h-5" /><span>Back</span>
        </button>
        
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8">
          {step === 'phone' && (
            <>
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden bg-white shadow-lg">
                  <img 
                    src="https://d64gsuwffb70l.cloudfront.net/697830e2d2a66a605e53d724_1769759333132_e7d1e864.jpg" 
                    alt="hoko logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {isSeller ? 'Register as Seller' : 'Login / Register'}
                </h2>
                <p className="text-gray-500 mt-2">Enter your mobile number to continue</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex">
                  <span className="inline-flex items-center px-4 bg-gray-100 border-2 border-r-0 border-gray-200 rounded-l-xl text-gray-600 font-medium">
                    +91
                  </span>
                  <input 
                    type="tel" 
                    value={mobile} 
                    onChange={(e) => { 
                      setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); 
                      setError(''); 
                    }} 
                    placeholder="Enter 10-digit number" 
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-r-xl focus:outline-none focus:border-blue-500 text-lg"
                    autoFocus
                  />
                </div>
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
                
                {statusMessage && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-blue-600 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2-647z"></path>
                      </svg>
                      {statusMessage}
                    </p>
                  </div>
                )}
                
                <button 
                  onClick={handleSendOTP} 
                  disabled={isLoading || mobile.length !== 10} 
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2-647z"></path>
                      </svg>
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckIcon className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Verify OTP</h2>
                <p className="text-gray-500 mt-2">Enter the 6-digit code sent to +91 {mobile}</p>
                {generatedOtp && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-600">
                      Demo OTP: <span className="font-bold text-lg">{generatedOtp}</span>
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input 
                      key={index} 
                      ref={(el) => (otpRefs.current[index] = el)} 
                      type="text" 
                      inputMode="numeric" 
                      value={digit} 
                      onChange={(e) => handleOtpChange(index, e.target.value)} 
                      onKeyDown={(e) => handleOtpKeyDown(index, e)} 
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500" 
                      maxLength={1} 
                    />
                  ))}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 text-sm text-center">{error}</p>
                  </div>
                )}

                {statusMessage && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-blue-600 text-sm text-center flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2-647z"></path>
                      </svg>
                      {statusMessage}
                    </p>
                  </div>
                )}

                <button 
                  onClick={handleVerifyOTP} 
                  disabled={isLoading || otp.join('').length !== 6} 
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2-647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify OTP'
                  )}
                </button>
                
                <button 
                  onClick={handleSendOTP} 
                  disabled={countdown > 0 || isLoading} 
                  className="w-full py-3 text-blue-600 font-medium hover:bg-blue-50 rounded-xl disabled:opacity-50 transition-colors"
                >
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                </button>
              </div>
            </>
          )}

          {step === 'city' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LocationIcon className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Select Your City</h2>
                <p className="text-gray-500 mt-2">Choose your city to see relevant products</p>
              </div>
              
              <div className="space-y-4">
                <select 
                  value={selectedCity} 
                  onChange={(e) => { setSelectedCity(e.target.value); setError(''); }} 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white text-lg"
                >
                  <option value="">Select your city</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}, {city.state}</option>
                  ))}
                </select>
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
                
                {statusMessage && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-blue-600 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2-647z"></path>
                      </svg>
                      {statusMessage}
                    </p>
                  </div>
                )}
                
                <button 
                  onClick={handleCitySelect} 
                  disabled={isLoading || !selectedCity} 
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2-647z"></path>
                      </svg>
                      Setting up...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'seller-profile' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 [...]" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Seller Profile</h2>
                <p className="text-gray-500 mt-2">Complete your business details</p>
              </div>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={firmName} 
                  onChange={(e) => setFirmName(e.target.value)} 
                  placeholder="Firm Name" 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-lg" 
                />
                
                <input 
                  type="text" 
                  value={managerName} 
                  onChange={(e) => setManagerName(e.target.value)} 
                  placeholder="Manager Name" 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-lg" 
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setError(''); }}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all bg-white ${
                      error && !selectedCategory
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  >
                    <option value="">Select a category</option>
                    {PRODUCT_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  {error && !selectedCategory && <p className="mt-1 text-sm text-red-500">Please select a category</p>}
                </div>

                <select 
                  value={selectedCity} 
                  onChange={(e) => setSelectedCity(e.target.value)} 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white text-lg"
                >
                  <option value="">Select your city</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}, {city.state}</option>
                  ))}
                </select>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {statusMessage && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-blue-600 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2-647z"></path>
                      </svg>
                      {statusMessage}
                    </p>
                  </div>
                )}

                <button 
                  onClick={handleSellerProfile} 
                  disabled={isLoading || !firmName || !managerName || !selectedCity || !selectedCategory} 
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2-647z"></path>
                      </svg>
                      Creating Profile...
                    </>
                  ) : (
                    'Complete Registration'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTPLoginPage;
