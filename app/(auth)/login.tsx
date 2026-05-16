import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSignIn, useSignUp, useOAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Warm up the android browser to improve UX
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({ strategy: 'oauth_apple' });

  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleOAuth = async (strategy: 'google' | 'apple') => {
    setLoading(true);
    setError('');
    try {
      const flow = strategy === 'google' ? startGoogleOAuthFlow : startAppleOAuthFlow;
      const { createdSessionId, setActive } = await flow({
        redirectUrl: Linking.createURL('/(auth)/login', { scheme: 'taskapp' }),
      });
      
      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        
        // Klein beetje vertraging om de redirect animatie soepeler te laten verlopen
        setTimeout(() => {
          router.replace('/(auth)/onboarding');
        }, 300);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.errors?.[0]?.message || 'Er is een fout opgetreden bij SSO login.');
    } finally {
      setLoading(false);
    }
  };

  const onSignInPress = async () => {
    if (!isSignInLoaded) return;
    setLoading(true);
    setError('');
    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });
      if (completeSignIn.status === 'complete') {
        await setSignInActive({ session: completeSignIn.createdSessionId });
        router.replace('/(app)');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Er is een fout opgetreden bij het inloggen.');
    } finally {
      setLoading(false);
    }
  };

  const onSignUpPress = async () => {
    if (!isSignUpLoaded) return;
    setLoading(true);
    setError('');
    try {
      await signUp.create({
        emailAddress,
        password,
      });
      
      // Stuur de verificatie email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      
      // Verander UI naar verificatie scherm
      setPendingVerification(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Er is een fout opgetreden bij registreren.');
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isSignUpLoaded) return;
    setLoading(true);
    setError('');
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setSignUpActive({ session: completeSignUp.createdSessionId });
        router.replace('/(auth)/onboarding');
      } else if (completeSignUp.status === 'missing_requirements') {
        setError('E-mail is geverifieerd, maar Clerk blokkeert het account. Zet "Name" of "Username" uit als verplicht veld in je Clerk Dashboard!');
      } else {
        setError('Verificatie niet voltooid. Status: ' + completeSignUp.status);
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || 'De code is onjuist of verlopen.';
      
      if (errorMessage.toLowerCase().includes('already verified')) {
        if (signUp.status === 'complete' && signUp.createdSessionId) {
          await setSignUpActive({ session: signUp.createdSessionId });
          router.replace('/(auth)/onboarding');
        } else {
          setError('E-mail is al geverifieerd, maar Clerk vereist extra velden (zoals Voornaam of Achternaam). Zet deze velden uit in je Clerk Dashboard!');
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // UI voor het OTP (One Time Password) verificatie scherm
  if (pendingVerification) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-background">
        <View className="flex-1 justify-center px-8">
          <View className="items-center mb-10">
            <View className="w-20 h-20 bg-nlOrange-100 rounded-3xl items-center justify-center mb-6 shadow-sm">
              <MaterialCommunityIcons name="email-fast-outline" size={40} color="#ff550a" />
            </View>
            <Text className="text-3xl font-bold text-slate-800 mb-2 font-sans text-center">
              Check je e-mail
            </Text>
            <Text className="text-base text-slate-500 text-center font-sans">
              We hebben een verificatiecode gestuurd naar {emailAddress}. Vul deze hieronder in.
            </Text>
          </View>

          {error ? (
            <View className="bg-red-50 p-4 rounded-xl mb-6 border border-red-100 flex-row items-center">
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#ef4444" />
              <Text className="text-red-600 ml-2 flex-1 font-sans">{error}</Text>
            </View>
          ) : null}

          <View className="mb-6">
            <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-4 h-14 shadow-sm">
              <MaterialCommunityIcons name="form-textbox-password" size={24} color="#94a3b8" />
              <TextInput
                className="flex-1 ml-3 text-base text-slate-800 font-sans tracking-widest"
                value={code}
                placeholder="000000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                onChangeText={setCode}
                maxLength={6}
              />
            </View>
          </View>

          <TouchableOpacity 
            className={`h-14 rounded-2xl items-center justify-center shadow-md shadow-nlOrange-200 mb-6 ${loading ? 'bg-nlOrange-400' : 'bg-nlOrange-500'}`}
            onPress={onPressVerify}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-bold text-lg font-sans">
                Verifiëren
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setPendingVerification(false)} className="items-center mt-2">
            <Text className="text-slate-500 font-sans text-base">
              Terug naar inloggen
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Standaard Inlog / Registratie UI
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1, backgroundColor: '#FAFAFA' }}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
        
        {/* Header Section */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-nlOrange-100 rounded-3xl items-center justify-center mb-6 shadow-sm">
            <MaterialCommunityIcons name="check-decagram" size={40} color="#ff550a" />
          </View>
          <Text className="text-3xl font-bold text-slate-800 mb-2 font-sans">
            {isLogin ? 'Welkom terug' : 'Maak een account'}
          </Text>
          <Text className="text-base text-slate-500 text-center font-sans">
            {isLogin 
              ? 'Log in om je huishouden op orde te houden.' 
              : 'Begin vandaag nog met een opgeruimd leven.'}
          </Text>
        </View>

        {/* Error Message */}
        {error ? (
          <View className="bg-red-50 p-4 rounded-xl mb-6 border border-red-100 flex-row items-center">
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#ef4444" />
            <Text className="text-red-600 ml-2 flex-1 font-sans">{error}</Text>
          </View>
        ) : null}

        {/* SSO Buttons */}
        <View className="space-y-3 mb-6">
          <TouchableOpacity 
            className="flex-row items-center justify-center h-14 bg-white border border-slate-200 rounded-2xl shadow-sm"
            onPress={() => handleOAuth('google')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="google" size={22} color="#db4437" />
            <Text className="ml-3 text-slate-700 font-bold font-sans text-base">
              Doorgaan met Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center justify-center h-14 bg-white border border-slate-200 rounded-2xl shadow-sm"
            onPress={() => handleOAuth('apple')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="apple" size={24} color="#000000" />
            <Text className="ml-3 text-slate-700 font-bold font-sans text-base">
              Doorgaan met Apple
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-[1px] bg-slate-200" />
          <Text className="mx-4 text-slate-400 font-sans text-sm">OF</Text>
          <View className="flex-1 h-[1px] bg-slate-200" />
        </View>

        {/* Input Section */}
        <View className="space-y-4 mb-6">
          <View>
            <Text className="text-sm font-semibold text-slate-700 mb-2 font-sans ml-1">E-mailadres</Text>
            <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-4 h-14 shadow-sm">
              <MaterialCommunityIcons name="email-outline" size={22} color="#94a3b8" />
              <TextInput
                className="flex-1 ml-3 text-base text-slate-800 font-sans"
                autoCapitalize="none"
                value={emailAddress}
                placeholder="naam@voorbeeld.nl"
                placeholderTextColor="#94a3b8"
                onChangeText={setEmailAddress}
                keyboardType="email-address"
              />
            </View>
          </View>

          <View>
            <Text className="text-sm font-semibold text-slate-700 mb-2 font-sans ml-1">Wachtwoord</Text>
            <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-4 h-14 shadow-sm">
              <MaterialCommunityIcons name="lock-outline" size={24} color="#94a3b8" />
              <TextInput
                className="flex-1 ml-3 text-base text-slate-800 font-sans"
                value={password}
                placeholder="Minimaal 8 tekens"
                placeholderTextColor="#94a3b8"
                secureTextEntry={true}
                onChangeText={setPassword}
              />
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          className={`h-14 rounded-2xl items-center justify-center shadow-md shadow-nlOrange-200 mb-6 ${loading ? 'bg-nlOrange-400' : 'bg-nlOrange-500'}`}
          onPress={isLogin ? onSignInPress : onSignUpPress}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold text-lg font-sans">
              {isLogin ? 'Inloggen' : 'Registreren'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle Mode */}
        <View className="flex-row justify-center mt-2">
          <Text className="text-slate-500 font-sans text-base">
            {isLogin ? 'Nog geen account? ' : 'Al een account? '}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} activeOpacity={0.6}>
            <Text className="text-nlOrange-600 font-bold font-sans text-base">
              {isLogin ? 'Registreer hier' : 'Log hier in'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}
