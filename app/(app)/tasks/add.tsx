import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../../src/db/client';
import { userTasks } from '../../../src/db/schema';
import { useRouter } from 'expo-router';

export default function AddTaskScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Local state for the new task
  const [taskName, setTaskName] = useState('');
  const [intervalDays, setIntervalDays] = useState('7'); // Default to weekly
  const [notes, setNotes] = useState('');

  // Select an icon purely for visual appeal (using existing ones)
  const availableIcons = ['home', 'washing-machine', 'broom', 'mop', 'heart', 'star', 'dog', 'cat', 'sprout', 'flower-2', 'baby', 'medical', 'car', 'bike', 'hammer', 'wrench', 'book', 'laptop'];
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0]);

  const addTaskMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Je bent niet ingelogd.");
      if (!taskName.trim()) throw new Error("Vul een naam in voor de taak.");

      const parsedInterval = parseInt(intervalDays, 10);
      if (isNaN(parsedInterval) || parsedInterval < 1) {
        throw new Error("Vul een geldig aantal dagen in (bijv. 7).");
      }

      // De eerste keer plannen we de taak voor VANDAAG
      const nextDueDate = new Date().toISOString().split('T')[0];

      await db.insert(userTasks).values({
        userId,
        isCustom: true,
        customName: taskName.trim(),
        customIcon: selectedIcon,
        frequencyType: 'interval', // We handle everything as interval for custom tasks
        intervalDays: parsedInterval,
        notes: notes.trim() || null,
        nextDueDate: nextDueDate,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Fout bij toevoegen', err.message || 'Er is een fout opgetreden bij het toevoegen van je taak.');
    }
  });

  const handleSave = () => {
    addTaskMutation.mutate();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top', 'bottom']}>
      {/* Navbar */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2">
          <MaterialCommunityIcons name="arrow-left" size={28} color="#475569" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800 font-sans">Nieuwe Taak</Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          
          <View className="mb-6 mt-2">
            <Text className="text-2xl font-bold text-slate-800 font-sans mb-2">
              Zelf een taak toevoegen
            </Text>
            <Text className="text-base text-slate-500 font-sans">
              Maak een persoonlijke taak aan voor jouw huishouden. Deze wordt direct gepland voor vandaag.
            </Text>
          </View>

          {/* Form */}
          <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
            
            {/* Task Name */}
            <View className="mb-6">
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Naam van de taak</Text>
              <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 h-14">
                <MaterialCommunityIcons name="format-title" size={20} color="#94a3b8" />
                <TextInput
                  className="flex-1 ml-3 text-base text-slate-800 font-sans"
                  value={taskName}
                  onChangeText={setTaskName}
                  placeholder="Bijv: Planten water geven"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Frequency */}
            <View className="mb-6">
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Frequentie (Dagen)</Text>
              <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 h-14">
                <MaterialCommunityIcons name="calendar-sync" size={20} color="#94a3b8" />
                <TextInput
                  className="flex-1 ml-3 text-base text-slate-800 font-sans"
                  value={intervalDays}
                  onChangeText={setIntervalDays}
                  keyboardType="numeric"
                  placeholder="Bijv: 7"
                />
              </View>
              <Text className="text-xs text-slate-400 font-sans mt-2 ml-1">
                Hoeveel dagen nadat je deze taak hebt afgevinkt moet hij weer terugkomen?
              </Text>
            </View>

            {/* Icon Picker */}
            <View className="mb-6">
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Kies een icoontje</Text>
              <View className="flex-row flex-wrap gap-3">
                {availableIcons.map((iconName) => {
                  const isSelected = selectedIcon === iconName;
                  return (
                    <TouchableOpacity
                      key={iconName}
                      activeOpacity={0.7}
                      onPress={() => setSelectedIcon(iconName)}
                      className={`w-12 h-12 rounded-full items-center justify-center border-2 ${
                        isSelected 
                          ? 'border-nlOrange-500 bg-nlOrange-50' 
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <MaterialCommunityIcons 
                        name={require('../../../src/lib/icons').getIconName(iconName)} 
                        size={24} 
                        color={isSelected ? '#ff550a' : '#94a3b8'} 
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notes */}
            <View className="mb-2">
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Notities (Optioneel)</Text>
              <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-h-[100px]">
                <TextInput
                  className="flex-1 text-base text-slate-800 font-sans"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="Bijv: Voeding bijgeven 1x per maand..."
                  placeholderTextColor="#94a3b8"
                  textAlignVertical="top"
                />
              </View>
            </View>

          </View>

          {/* Action Button */}
          <TouchableOpacity 
            className={`h-14 rounded-2xl items-center justify-center shadow-md mb-10 ${addTaskMutation.isPending ? 'bg-nlOrange-400' : 'bg-nlOrange-500 shadow-nlOrange-200'}`}
            onPress={handleSave}
            disabled={addTaskMutation.isPending}
          >
            {addTaskMutation.isPending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-bold text-lg font-sans">Taak Toevoegen</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
