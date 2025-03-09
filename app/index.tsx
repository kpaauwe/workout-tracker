import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput, Alert, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// TypeScript interfaces
interface Exercise { //exercise object
  id: string;
  name: string;
}

interface Performance { //details on each exercise
  date: string;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
}

interface Program { //list of all exercises
  [day: string]: Exercise[];
}

interface DayHistory {
  [exerciseId: string]: Performance[]; //exercises done that day
}

interface WeekHistory {
  [day: string]: DayHistory; //day history for the week
}

interface History {
  [weekKey: string]: WeekHistory; //total lift history
}

const WorkoutApp: React.FC = () => {
  const [program, setProgram] = useState<Program>({});
  const [history, setHistory] = useState<History>({});
  const [currentWeek, setCurrentWeek] = useState<number>(getCurrentWeekNumber());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState<boolean>(false);
  const [exerciseName, setExerciseName] = useState<string>('');
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [performanceModalVisible, setPerformanceModalVisible] = useState<boolean>(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [weight, setWeight] = useState<string>('');
  const [sets, setSets] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const weekdays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  useEffect(() => {
    loadData();
  }, []);

  function getCurrentWeekNumber(): number {
    const now = new Date(); //Grabs current date
    const startOfYear = new Date(now.getFullYear(), 0, 1); //Gets the date: January 1, current year
    const pastDaysOfYear = (now - startOfYear) / 86400000; //ms passed since jan 1. 86,400,000 is the num of ms in a day
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7); // divides days since start to get the week number
  }

  const loadData = async (): Promise<void> => { //loads data ansynchronously using a promise
    try {
      const savedProgram = await AsyncStorage.getItem('workoutProgram'); //loads program details
      const savedHistory = await AsyncStorage.getItem('workoutHistory'); //loads workout history
      
      if (savedProgram) {
        setProgram(JSON.parse(savedProgram)); //if a program can be retrieved then set it.
      } else {
        // Initialize with empty program structure
        const initialProgram: Program = {};
        weekdays.forEach(day => {
          initialProgram[day] = []; //empty prog for each day
        });
        setProgram(initialProgram); //set the empty prog
        await AsyncStorage.setItem('workoutProgram', JSON.stringify(initialProgram)); //save new prog into asyncstorage
      }
      
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory)); //set history if it exists
      } else {
        await AsyncStorage.setItem('workoutHistory', JSON.stringify({})); //load empty history
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load workout data'); //error loading history
    }
  };

  const saveProgram = async (updatedProgram: Program): Promise<void> => { //promise used to save history to asyncStorage
    try {
      await AsyncStorage.setItem('workoutProgram', JSON.stringify(updatedProgram)); //save current program
      setProgram(updatedProgram);
    } catch (error) {
      Alert.alert('Error', 'Failed to save program'); //could'nt save to history
    }
  };

  const saveHistory = async (updatedHistory: History): Promise<void> => { //uses a promise to asynchronously save history
    try {
      await AsyncStorage.setItem('workoutHistory', JSON.stringify(updatedHistory)); //save history
      setHistory(updatedHistory);
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout history'); //error if cant save history
    }
  };

  const addExercise = (): void => {
    if (!exerciseName.trim() || !selectedDay) {
      Alert.alert('Error', 'Please enter an exercise name'); //No exercise name entered but tried to save.
      return;
    }

    const updatedProgram = {...program}; //saves all current program details to updated program object
    
    if (editingExerciseId) { //in edit exercise screen
      const exerciseIndex = updatedProgram[selectedDay].findIndex(ex => ex.id === editingExerciseId); //current exercise already exists?
      if (exerciseIndex !== -1) { //does not exist
        updatedProgram[selectedDay][exerciseIndex].name = exerciseName; //add exercise to current day
      }
    } else {
      // Add new exercise
      const newExercise: Exercise = { //exercise does not exist yet, init new exercise object
        id: Date.now().toString(), 
        name: exerciseName,
      };
      updatedProgram[selectedDay].push(newExercise); //push new exercise to program
    }
    
    saveProgram(updatedProgram);
    setExerciseName('');
    setEditingExerciseId(null);
    setExerciseModalVisible(false);
  };

  const removeExercise = (exerciseId: string): void => {
    if (!selectedDay) return;
    
    const updatedProgram = {...program};
    updatedProgram[selectedDay] = updatedProgram[selectedDay].filter(ex => ex.id !== exerciseId); //saves program day as a copy of old program where id does not match the id to remove
    saveProgram(updatedProgram);
  };

  const editExercise = (exercise: Exercise): void => {
    setExerciseName(exercise.name);
    setEditingExerciseId(exercise.id); //Modify exercise details
    setExerciseModalVisible(true);
  };

  const recordPerformance = (): void => {
    if (!sets.trim() || !reps.trim() || !selectedDay || !currentExercise) { //notes on exercise details.
      Alert.alert('Error', 'Please enter sets and reps');
      return;
    }

    const weekKey = `week${currentWeek}`; //current week
    const dayKey = selectedDay; //current day
    const exerciseId = currentExercise.id; //current exercise
    
    const updatedHistory = {...history}; //create an updated history object with old history object
    
    if (!updatedHistory[weekKey]) {
      updatedHistory[weekKey] = {}; //init weekKey if empty
    }
    
    if (!updatedHistory[weekKey][dayKey]) { //init day if empty
      updatedHistory[weekKey][dayKey] = {};
    }
    
    if (!updatedHistory[weekKey][dayKey][exerciseId]) { //init id if empty
      updatedHistory[weekKey][dayKey][exerciseId] = [];
    }
    
    const performance: Performance = { //Object for current exercise
      date: new Date().toISOString(),
      sets: parseInt(sets),
      reps: parseInt(reps),
      weight: weight ? parseFloat(weight) : 0,
      notes: notes
    };
    
    updatedHistory[weekKey][dayKey][exerciseId].push(performance); //push exercise to history
    
    saveHistory(updatedHistory);
    resetPerformanceForm();
    setPerformanceModalVisible(false);
  };

  const resetPerformanceForm = (): void => { //clear info on exercise
    setWeight('');
    setSets('');
    setReps('');
    setNotes('');
  };

  const openPerformanceModal = (exercise: Exercise): void => {
    setCurrentExercise(exercise);
    setPerformanceModalVisible(true); //open exercise view
  };

  const getLastPerformance = (exerciseId: string): Performance | null => {
    // Look through history to find the most recent performance for this exercise
    const weekKeys = Object.keys(history).sort().reverse(); //look through previous weeks starting from current by sorting history and reversing list
    
    for (const weekKey of weekKeys) { //Go through weeks prior to current week
      const week = history[weekKey];
      const dayKeys = Object.keys(week); //get days from that week
      
      for (const dayKey of dayKeys) { //loop through the days of that week
        const day = week[dayKey];
        if (day[exerciseId] && day[exerciseId].length > 0) {  //check days in that week for a matching exercise ID
          const performances = day[exerciseId]; //returns most recent occurence of that exercise ID
          return performances[performances.length - 1];
        }
      }
    }
    
    return null; //no occurence found
  };

  const changeWeek = (delta: number): void => { //modify current weak +/- 1
    const newWeek = currentWeek + delta; 
    if (newWeek > 0) { //makes sure weeks cannot go into negatives
      setCurrentWeek(newWeek); //loads new week
    }
  };

  const renderWeekHistory = (): JSX.Element => { //displays info on current week's workouts
    const weekKey = `week${currentWeek}`;
    if (!history[weekKey]) { //if no values at selected week
      return (  //state of history page is empty
        <View style={styles.emptyState}> 
          <Text style={styles.emptyStateText}>No workouts recorded for this week</Text>
        </View>
      );
    }
    //otherwise week history exists
    return ( //Loads format for history
      <View style={styles.historyContainer}> 
        {weekdays.map(day => {
          const dayData = history[weekKey] && history[weekKey][day]; //data exists for the day of the selected week?
          if (!dayData) return null; //no day data
          
          const exerciseIds = Object.keys(dayData); //grabs exercise ids for the day with data
          if (exerciseIds.length === 0) return null; //no exercises in the day
          
          return (
            <View key={day} style={styles.historyDay}>
              <Text style={styles.historyDayTitle}>{day}</Text>
              {exerciseIds.map(id => { //grab the details for each exercise found
                const performances = dayData[id];
                const lastPerformance = performances[performances.length - 1];
                const exerciseName = program[day]?.find(ex => ex.id === id)?.name || 'Unknown Exercise'; //if data for an exercise with no name exists, use example string
                
                return ( //Now that data for each exercise has been retrieved, display it
                  <View key={id} style={styles.historyExercise}>
                    <Text style={styles.historyExerciseName}>{exerciseName}</Text>
                    <Text>
                      {lastPerformance.sets} sets × {lastPerformance.reps} reps
                      {lastPerformance.weight > 0 ? ` @ ${lastPerformance.weight}lbs` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Workout Tracker</Text> 
      {selectedDay ? (
        // Day view - show exercises for selected day
        <View style={styles.dayContainer}>
          <View style={styles.dayHeader}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setSelectedDay(null)}>
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.dayTitle}>{selectedDay}</Text>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => {
                setExerciseName('');
                setEditingExerciseId(null);
                setExerciseModalVisible(true);
              }}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {program[selectedDay]?.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No exercises added yet</Text>
              <Text>Tap the + button to add exercises</Text>
            </View>
          ) : (
            <FlatList
              data={program[selectedDay]}
              keyExtractor={item => item.id}
              renderItem={({item}) => {
                const lastPerformance = getLastPerformance(item.id);
                
                return (
                  <View style={styles.exerciseItem}>
                    <View style={styles.exerciseHeader}>
                      <Text style={styles.exerciseName}>{item.name}</Text>
                      <Ionicons name="logo-nodejs" size={20} color="salmon" />
                      <View style={styles.exerciseActions}>
                        <TouchableOpacity 
                          style={styles.iconButton} 
                          onPress={() => editExercise(item)}>
                          <Ionicons name="pencil" size={20} color="#2196F3" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.iconButton} 
                          onPress={() => removeExercise(item.id)}>
                          <Ionicons name="trash" size={20} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {lastPerformance && (
                      <View style={styles.lastPerformance}>
                        <Text style={styles.lastPerformanceTitle}>Last Effort:</Text>
                        <Text>
                          {lastPerformance.sets} sets × {lastPerformance.reps} reps
                          {lastPerformance.weight > 0 ? ` @ ${lastPerformance.weight}lbs` : ''}
                          {lastPerformance.reps >= 10 ? <Ionicons name="water" size={20} color="blue"/> : 
                          lastPerformance.reps >= 6 ? <Ionicons name="star-half" size={20} color="gold" /> : 
                          lastPerformance.reps >= 3 ? <Ionicons name="star" size={20} color="gold"/> : 
                          <Ionicons name="skull" size={20} color="red"/>}
                        </Text>
                        {lastPerformance.notes ? (
                          <Text style={styles.notes}>Notes: {lastPerformance.notes}</Text>
                        ) : null}
                      </View>
                    )}
                    
                    <TouchableOpacity 
                      style={styles.recordButton} 
                      onPress={() => openPerformanceModal(item)}>
                      <Text style={styles.recordButtonText}>Add Effort</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      ) : (
        // Main view - show week selector and days
        <View style={styles.mainContainer}>
          <View style={styles.weekSelector}>
            <TouchableOpacity onPress={() => changeWeek(-1)}>
              <Ionicons name="chevron-back" size={24} color="#2196F3" />
            </TouchableOpacity>
            <Text style={styles.weekTitle}>Week {currentWeek}</Text>
            <TouchableOpacity onPress={() => changeWeek(1)}>
              <Ionicons name="chevron-forward" size={24} color="#2196F3" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, !modalVisible && styles.activeTab]} 
              onPress={() => setModalVisible(false)}>
              <Text style={styles.tabText}>Program</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, modalVisible && styles.activeTab]} 
              onPress={() => setModalVisible(true)}>
              <Text style={styles.tabText}>Past Efforts</Text>
            </TouchableOpacity>
          </View>

          {modalVisible ? (
            // History view
            <ScrollView style={styles.historyScroll}>
              {renderWeekHistory()}
            </ScrollView>
          ) : (
            // Program view
            <ScrollView style={styles.daysContainer}>
              {weekdays.map(day => (
                <TouchableOpacity 
                  key={day} 
                  style={styles.dayCard}
                  onPress={() => setSelectedDay(day)}>
                  <Text style={styles.dayCardTitle}>{day}</Text>
                  <Text style={styles.exerciseCount}>
                    {program[day]?.length || 0} exercises
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Exercise Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={exerciseModalVisible}
        onRequestClose={() => {
          setExerciseModalVisible(false);
          setExerciseName('');
          setEditingExerciseId(null);
        }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingExerciseId ? 'Edit Exercise' : 'Add Exercise'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Exercise Name"
              value={exerciseName}
              onChangeText={setExerciseName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => {
                  setExerciseModalVisible(false);
                  setExerciseName('');
                  setEditingExerciseId(null);
                }}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]} 
                onPress={addExercise}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Performance Recording Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={performanceModalVisible}
        onRequestClose={() => {
          setPerformanceModalVisible(false);
          resetPerformanceForm();
        }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Record Performance
            </Text>
            
            {currentExercise && (
              <Text style={styles.exerciseTitle}>{currentExercise.name}</Text>
            )}
            
            <View style={styles.performanceInputs}>
              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Sets</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Sets"
                    value={sets}
                    onChangeText={setSets}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Reps</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Reps"
                    value={reps}
                    onChangeText={setReps}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Weight (lbs)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Weight"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              
              <View style={styles.notesContainer}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Add notes (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => {
                  setPerformanceModalVisible(false);
                  resetPerformanceForm();
                }}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]} 
                onPress={recordPerformance}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({ //Typescript 'CSS' method
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  mainContainer: {
    flex: 1,
    padding: 15,
  },
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontWeight: 'bold',
    color: '#333',
  },
  daysContainer: {
    flex: 1,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  dayCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  exerciseCount: {
    color: '#666',
  },
  dayContainer: {
    flex: 1,
    padding: 15,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 5,
  },
  addButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  exerciseActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 5,
    marginLeft: 10,
  },
  lastPerformance: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  lastPerformanceTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notes: {
    fontStyle: 'italic',
    marginTop: 5,
  },
  recordButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  recordButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  exerciseTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  performanceInputs: {
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  inputLabel: {
    marginBottom: 5,
    fontWeight: 'bold',
  },
  notesContainer: {
    marginTop: 10,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  historyScroll: {
    flex: 1,
  },
  historyContainer: {
    padding: 10,
  },
  historyDay: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  historyDayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  historyExercise: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  historyExerciseName: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
});

export default WorkoutApp;