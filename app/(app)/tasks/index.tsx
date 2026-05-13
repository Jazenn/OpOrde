import { View, Text, StyleSheet } from 'react-native';

export default function AllTasksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alle Taken</Text>
      <Text style={styles.subtitle}>Hier komt het overzicht van alle huishoudtaken.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 10 },
});
