import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/db/client';
import { taskTemplates, userTasks } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

import { getIconName } from '../../src/lib/icons';

// Fetch templates from Neon using Drizzle
const fetchTemplates = async () => {
  return await db.select().from(taskTemplates);
};

export default function OnboardingScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Query templates
  const { data: templates, isLoading: isLoadingTemplates, isError, error } = useQuery({
    queryKey: ['taskTemplates'],
    queryFn: fetchTemplates,
  });

  // Mutation to insert selected tasks
  const insertTasksMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      if (!userId) throw new Error("No user found");
      
      const tasksToInsert = templates?.filter(t => taskIds.includes(t.id)) || [];
      if (tasksToInsert.length === 0) return;

      const userTasksData = tasksToInsert.map((template, index) => {
        const nextDueDate = new Date();
        
        // Verdeel de starttaken over de eerste 4 dagen zodat de gebruiker niet
        // direct overweldigd wordt op dag 1.
        const staggerDays = index % 4; 
        nextDueDate.setDate(nextDueDate.getDate() + staggerDays);
        
        return {
          userId,
          templateId: template.id,
          frequencyType: template.defaultFrequencyType,
          intervalDays: template.defaultIntervalDays,
          nextDueDate: nextDueDate.toISOString().split('T')[0], // YYYY-MM-DD
          isActive: true,
          isCustom: false,
        };
      });

      const { profiles } = require('../../src/db/schema');
      await db.insert(profiles).values({ id: userId }).onConflictDoNothing();

      await db.insert(userTasks).values(userTasksData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      router.replace('/(app)');
    },
    onError: (error) => {
      Alert.alert('Fout', 'Kon taken niet opslaan. Probeer het opnieuw.');
      console.error(error);
    }
  });

  const toggleSelection = (id: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    if (!userId) {
      // Als userId na een tijdje nog steeds null is door een netwerk hik:
      Alert.alert('Fout', 'We kunnen je account nog niet vinden. Controleer je internetverbinding of start de app opnieuw op.');
      return;
    }
    insertTasksMutation.mutate(selectedTaskIds);
  };

  // We wachten actief totdat userId bekend is, want het onboarding scherm is bedoeld voor INGEGELOGDE gebruikers
  if (isLoadingTemplates || !userId) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
        <ActivityIndicator size="large" color="#ff550a" />
        <Text style={{ marginTop: 16, color: '#64748b', textAlign: 'center', fontFamily: 'Nunito_400Regular' }}>
          Gegevens ophalen...{'\n'}
          {!userId ? '(Wachten op account)' : '(Taken laden uit database)'}
        </Text>
        {!userId && (
          <TouchableOpacity 
            onPress={() => router.replace('/(auth)/login')} 
            style={{ marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#e2e8f0', borderRadius: 12 }}
          >
            <Text style={{ fontWeight: 'bold', color: '#475569', fontFamily: 'Nunito_700Bold' }}>Terug naar inloggen</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={{ marginTop: 16, color: '#ef4444', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Nunito_700Bold' }}>Kan templates niet laden.</Text>
        <Text style={{ marginTop: 8, color: '#64748b', textAlign: 'center', fontFamily: 'Nunito_400Regular' }}>{String(error)}</Text>
      </View>
    );
  }

  const freeTemplates = templates?.filter(t => !t.isPremium) || [];
  const premiumTemplates = templates?.filter(t => t.isPremium) || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
        
        <View className="mb-6">
          <Text className="text-3xl font-bold text-slate-800 font-sans mb-2">Welke taken wil je bijhouden?</Text>
          <Text className="text-base text-slate-500 font-sans">
            Selecteer de taken waarmee je wilt beginnen. Je kunt later altijd meer taken toevoegen.
          </Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          
          <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 mt-2">Basis Taken</Text>
          <View className="flex-row flex-wrap justify-between">
            {freeTemplates.map(template => {
              const isSelected = selectedTaskIds.includes(template.id);
              return (
                <TouchableOpacity 
                  key={template.id}
                  activeOpacity={0.7}
                  onPress={() => toggleSelection(template.id)}
                  className={`w-[48%] mb-4 p-4 rounded-2xl border-2 flex-col items-center justify-center h-32 ${
                    isSelected ? 'border-nlOrange-500 bg-nlOrange-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${
                    isSelected ? 'bg-nlOrange-100' : 'bg-slate-100'
                  }`}>
                    <MaterialCommunityIcons name={getIconName(template.icon)} size={24} color={isSelected ? '#ff550a' : '#64748b'} />
                  </View>
                  <Text className={`text-center font-bold font-sans ${isSelected ? 'text-nlOrange-700' : 'text-slate-600'}`}>
                    {template.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 mt-6">Premium Taken (Voorbeeld)</Text>
          <View className="flex-row flex-wrap justify-between mb-8">
            {premiumTemplates.map(template => {
              return (
                <View 
                  key={template.id}
                  className="w-[48%] mb-4 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 flex-col items-center justify-center h-32 opacity-70"
                >
                  <View className="absolute top-2 right-2">
                    <MaterialCommunityIcons name="lock" size={14} color="#94a3b8" />
                  </View>
                  <View className="w-12 h-12 rounded-full items-center justify-center mb-2 bg-slate-200">
                    <MaterialCommunityIcons name={getIconName(template.icon)} size={24} color="#94a3b8" />
                  </View>
                  <Text className="text-center font-bold font-sans text-slate-400">
                    {template.name}
                  </Text>
                </View>
              );
            })}
          </View>

        </ScrollView>

        {/* Sticky Bottom Footer */}
        <View className="py-4 bg-background border-t border-slate-100">
          <TouchableOpacity 
            className={`h-14 rounded-2xl items-center justify-center shadow-md ${
              insertTasksMutation.isPending ? 'bg-nlOrange-400' : 'bg-nlOrange-500 shadow-nlOrange-200'
            }`}
            onPress={handleFinish}
            disabled={insertTasksMutation.isPending}
            activeOpacity={0.8}
          >
            {insertTasksMutation.isPending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-bold text-lg font-sans">
                {selectedTaskIds.length > 0 
                  ? `Starten met ${selectedTaskIds.length} taken` 
                  : 'Starten zonder taken'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

